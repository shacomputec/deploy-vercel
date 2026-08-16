import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "crypto";

/**
 * Pure license-key cryptography — no database, no framework imports.
 *
 * Canonical key format (issued / v2):
 *   GES-SMIS-{SCHOOL}-{DAYS}-{NONCE}-{SIG}
 * where SIG = first 12 hex chars of HMAC-SHA256(secret, "GES-SMIS2:{SCHOOL}:{DAYS}:{NONCE}").
 *
 * Legacy / trial format (v1):
 *   GES-SMIS-{SCHOOL}-{SIG}  (signed over "GES-SMIS:{SCHOOL}:365", or :30 for the trial)
 *
 * `scripts/mint-key.mjs` implements this exact format so offline-minted keys
 * validate against the server — the algorithm below is the source of truth.
 */

const V2_SIGN_CONTEXT = "GES-SMIS2:";
const V1_SIGN_CONTEXT = "GES-SMIS:";
const DEV_FALLBACK = "dev-license-secret";

/**
 * Candidate signing secrets, most-recent first. Safe rotation works by keeping
 * the rotated-out secret in LICENSE_SECRET_OLD (comma-separated for several):
 *   LICENSE_SECRET=<new>
 *   LICENSE_SECRET_OLD=<previous>
 * Old keys keep validating because every candidate is tried.
 */
export function getSigningSecrets(): string[] {
  const primary = process.env.LICENSE_SECRET || process.env.JWT_SECRET || "";
  const old = (process.env.LICENSE_SECRET_OLD || "").split(",").map((s) => s.trim()).filter(Boolean);
  const secrets = [primary, ...old].filter(Boolean);
  if (process.env.NODE_ENV === "production" && secrets.length === 0) {
    throw new Error("LICENSE_SECRET (or JWT_SECRET) must be configured in production to sign license keys");
  }
  return secrets.length ? secrets : [DEV_FALLBACK];
}

/** The current signing secret — the one used to mint NEW keys. */
export function getSigningSecret(): string {
  return getSigningSecrets()[0]!;
}

function normalizeSchool(schoolId: string): string {
  return (schoolId || "main").toUpperCase().replace(/[^A-Z0-9]/g, "") || "MAIN";
}

export function signKey(secret: string, context: string): string {
  return createHmac("sha256", secret).update(context).digest("hex").slice(0, 12).toUpperCase();
}

export function signV2(secret: string, schoolId: string, days: number, nonce: string): string {
  return signKey(secret, `${V2_SIGN_CONTEXT}${schoolId}:${days}:${nonce}`);
}

export function signV1(secret: string, schoolId: string, days: number): string {
  return signKey(secret, `${V1_SIGN_CONTEXT}${schoolId}:${days}`);
}

export type IssuedLicenseKey = { key: string; schoolId: string; days: number; nonce: string };

/** Mint a key with an explicit secret (used by the rotation proof + CLI). */
export function generateActivationKeyWithSecret(secret: string, schoolId = "main", days = 365): IssuedLicenseKey {
  const id = normalizeSchool(schoolId);
  const safeDays = Math.min(3650, Math.max(1, Math.floor(days || 365)));
  const nonce = randomBytes(4).toString("hex").toUpperCase();
  const sig = signV2(secret, id, safeDays, nonce);
  return { key: `GES-SMIS-${id}-${safeDays}-${nonce}-${sig}`, schoolId: id, days: safeDays, nonce };
}

/** Mint with the CURRENT signing secret. */
export function generateActivationKey(schoolId = "main", days = 365): IssuedLicenseKey {
  return generateActivationKeyWithSecret(getSigningSecret(), schoolId, days);
}

/** Generate a legacy (v1) key — kept for the trial flow and backwards compatibility. */
export function generateLicenseKey(schoolId = "main", days = 365): string {
  const id = normalizeSchool(schoolId);
  return `GES-SMIS-${id}-${signV1(getSigningSecret(), id, days)}`;
}

/**
 * Validate a key against the current secret AND any rotated-out secrets
 * (LICENSE_SECRET_OLD), so old keys keep working after a rotation.
 */
export function validateLicenseKey(key: string): { valid: boolean; schoolId?: string; days?: number } {
  return validateLicenseKeyWithSecrets(key, getSigningSecrets());
}

export function validateLicenseKeyWithSecrets(key: string, secrets: string[]): { valid: boolean; schoolId?: string; days?: number } {
  const normalized = key.trim().toUpperCase();
  const parts = normalized.split("-");
  if (parts.length < 3 || parts[0] !== "GES" || parts[1] !== "SMIS") return { valid: false };
  const last = parts[parts.length - 1]!;
  const second = parts[parts.length - 2]!;
  const third = parts[parts.length - 3]!;

  // v2 (issued): GES-SMIS-{SCHOOL}-{DAYS}-{NONCE}-{SIG}
  if (/^\d+$/.test(third) && /^[0-9A-F]{8}$/.test(second) && /^[0-9A-F]{12}$/.test(last)) {
    const schoolId = parts.slice(2, -3).join("-") || "MAIN";
    const days = parseInt(third, 10);
    for (const secret of secrets) {
      if (signV2(secret, schoolId, days, second) === last) return { valid: true, schoolId, days };
    }
    return { valid: false };
  }

  // v1 (legacy/trial): GES-SMIS-{SCHOOL}-{SIG}
  const schoolId = parts.slice(2, -1).join("-") || "MAIN";
  for (const secret of secrets) {
    if (signV1(secret, schoolId, 365) === last) return { valid: true, schoolId, days: 365 };
    if (signV1(secret, schoolId, 30) === last) return { valid: true, schoolId, days: 30 };
  }
  return { valid: false };
}

export function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Issued keys are stored ENCRYPTED at rest (AES-256-GCM) using a key derived
 * from the signing secret — so the raw key can be recovered later for re-sending
 * to the school, but only by a process that knows the secret. Decryption tries
 * the current secret first, then any rotated-out secrets.
 */
function deriveStorageKey(secret: string): Buffer {
  return createHash("sha256").update(`ges-smis-license-storage:${secret}`).digest();
}

export function encryptLicenseKey(key: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveStorageKey(getSigningSecret()), iv);
  const enc = Buffer.concat([cipher.update(Buffer.from(key, "utf8")), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decryptLicenseKey(payload: string): string {
  const [ivB64, tagB64, encB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !encB64) throw new Error("Invalid encrypted license key payload");
  const iv = Buffer.from(ivB64, "base64");
  for (const secret of getSigningSecrets()) {
    try {
      const decipher = createDecipheriv("aes-256-gcm", deriveStorageKey(secret), iv);
      decipher.setAuthTag(Buffer.from(tagB64, "base64"));
      return Buffer.concat([decipher.update(Buffer.from(encB64, "base64")), decipher.final()]).toString("utf8");
    } catch {
      // try the next (older) secret
    }
  }
  throw new Error("Could not decrypt this license key — the signing secret was rotated and the old secret is no longer available.");
}

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

/**
 * AES-256-GCM encryption at rest for confidential documents (teacher profiles etc.).
 * The key is derived from DOCUMENT_ENCRYPTION_KEY (or JWT_SECRET) via SHA-256,
 * so no plaintext key is ever stored. Fails closed in production if unset.
 */
function getKey(): Buffer {
  const secret = process.env.DOCUMENT_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production" && !secret) {
    throw new Error("DOCUMENT_ENCRYPTION_KEY (or JWT_SECRET) must be configured in production to store confidential documents");
  }
  return createHash("sha256").update(secret || "dev-doc-key-change-me").digest();
}

export function encryptBuffer(plaintext: Buffer): { iv: string; data: string } {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  // iv:tag:ciphertext — tag is 16 bytes and required for decryption
  return { iv: iv.toString("base64"), data: `${tag.toString("base64")}:${enc.toString("base64")}` };
}

export function decryptBuffer(ivB64: string, dataB64: string): Buffer {
  const iv = Buffer.from(ivB64, "base64");
  const [tagB64, encB64] = dataB64.split(":");
  if (!tagB64 || !encB64) throw new Error("Invalid encrypted payload");
  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encB64, "base64")), decipher.final()]);
}

/** Encrypt a string (e.g. small JSON blobs) — returns base64 iv:tag:data. */
export function encryptText(plaintext: string): string {
  const { iv, data } = encryptBuffer(Buffer.from(plaintext, "utf8"));
  return `${iv}:${data}`;
}

export function decryptText(payload: string): string {
  const [ivB64, dataB64] = payload.split(":");
  if (!ivB64 || !dataB64) throw new Error("Invalid encrypted payload");
  return decryptBuffer(ivB64, dataB64).toString("utf8");
}

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok, readJson, rateLimit } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { generateActivationKey, encryptLicenseKey, hashValue } from "@/lib/license";

/**
 * Issue a new activation license key.
 *
 * SECURITY LAYERS (all enforced server-side):
 *  1. Role gate — only the `developer` role may issue keys. This is a strict
 *     role check (not just a permission), so super-admins/admins/ICT can never
 *     mint keys even though they can activate them.
 *  2. Second factor — the developer must confirm with their own password,
 *     so a stolen session alone cannot issue keys.
 *  3. Rate limit — max 3 issuances per minute per developer.
 *  4. Key signing — keys carry an HMAC signature from the server secret; a
 *     forged/tampered key is rejected at activation time.
 *  5. Audit trail — every issuance (key, school, days, nonce, who/when) is
 *     written to the audit log.
 */
export const POST = handle(async (req) => {
  const user = await requirePerm("licensing", "update");
  if (user.role.name !== "developer") {
    throw new ApiError("Only the system developer can issue activation license keys.", 403);
  }
  rateLimit(`license:generate:${user.id}`, 3, 60_000);

  const body = await readJson<{ schoolId?: string; days?: number; password?: string }>(req);
  if (!body.password) {
    throw new ApiError("Password confirmation is required to issue a license key.", 400);
  }
  const verified = await bcrypt.compare(body.password, user.passwordHash);
  if (!verified) {
    throw new ApiError("Incorrect password — key issuance denied.", 403);
  }

  const issued = generateActivationKey(body.schoolId, body.days);
  // Persist the issuance: the raw key is stored ENCRYPTED (AES-256-GCM keyed
  // off the signing secret) so it can be re-sent to the school later, and the
  // SHA-256 hash proves which key was issued without revealing it. The audit
  // trail carries the nonce + hash only — never the raw key.
  const issuance = await prisma.licenseIssuance.create({
    data: {
      schoolId: issued.schoolId,
      days: issued.days,
      nonce: issued.nonce,
      keyHash: hashValue(issued.key),
      keyEncrypted: encryptLicenseKey(issued.key),
      issuedById: user.id,
    },
  });
  await auditLog(user.id, "ISSUE_KEY", "license", `license:${issued.nonce}`, {
    schoolId: issued.schoolId,
    days: issued.days,
    nonce: issued.nonce,
    keyHash: hashValue(issued.key),
    issuanceId: issuance.id,
  });
  return ok(
    {
      ...issued,
      issuanceId: issuance.id,
      note: "This key is shown once. Share it securely with the school — it can also be emailed from the issuance history.",
    },
    { status: 201 }
  );
});

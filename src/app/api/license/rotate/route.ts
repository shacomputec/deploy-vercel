import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { handle, ApiError, ok, readJson, rateLimit } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { getSigningSecrets, generateActivationKeyWithSecret, validateLicenseKeyWithSecrets } from "@/lib/license";

/**
 * POST /api/license/rotate — rotate the license signing secret SAFELY.
 *
 * The server never changes its own environment (that requires an admin to edit
 * `.env` and restart). Instead it:
 *   1. generates a cryptographically-strong replacement secret,
 *   2. PROVES the mechanism: a key minted under the current secret still
 *      validates when the candidate list is [new, current, ...old], and a key
 *      minted under the new secret validates too,
 *   3. returns the exact .env block to apply (LICENSE_SECRET=<new> with the
 *      current secret moved to LICENSE_SECRET_OLD) plus a key minted under the
 *      OLD secret — paste that key into Activate after restarting to confirm
 *      existing keys still work.
 *
 * Keys minted before rotation keep validating because validation tries every
 * candidate secret (current first, then LICENSE_SECRET_OLD). Encrypted stored
 * keys likewise stay decryptable via the old secret.
 */
export const POST = handle(async (req) => {
  const user = await requirePerm("licensing", "update");
  if (user.role.name !== "developer") {
    throw new ApiError("Only the system developer can rotate the signing secret.", 403);
  }
  rateLimit(`license:rotate:${user.id}`, 2, 60_000);

  const body = await readJson<{ password?: string }>(req);
  if (!body.password) {
    throw new ApiError("Password confirmation is required to rotate the signing secret.", 400);
  }
  const verified = await bcrypt.compare(body.password, user.passwordHash);
  if (!verified) {
    throw new ApiError("Incorrect password — rotation denied.", 403);
  }

  const currentSecrets = getSigningSecrets();
  const currentSecret = currentSecrets[0]!;
  const newSecret = randomBytes(32).toString("base64url");
  // The new chain is [new, current, ...existing-old]. LICENSE_SECRET_OLD must
  // carry the ENTIRE previous chain (comma-separated) so a second rotation
  // never invalidates keys minted before the first one.
  const oldChain = currentSecrets.join(",");

  // Proof A: a key minted under the CURRENT secret validates with [new, current, ...old]
  const oldKey = generateActivationKeyWithSecret(currentSecret, "MAIN", 365);
  const candidates = [newSecret, ...currentSecrets];
  const oldStillValid = validateLicenseKeyWithSecrets(oldKey.key, candidates).valid;

  // Proof B: a key minted under the NEW secret validates with the same list
  const newKey = generateActivationKeyWithSecret(newSecret, "MAIN", 365);
  const newValid = validateLicenseKeyWithSecrets(newKey.key, candidates).valid;

  if (!oldStillValid || !newValid) {
    throw new ApiError("Rotation sanity check failed — nothing was changed. Please contact support.", 500);
  }

  await auditLog(user.id, "ROTATE_SECRET", "license", "license:secrets", {
    rotationVerified: true,
    oldSecretPrefix: currentSecret.slice(0, 4),
    secretsInRotation: candidates.length,
  });

  return ok({
    verified: true,
    newSecret,
    envBlock: [
      `LICENSE_SECRET=${newSecret}`,
      `LICENSE_SECRET_OLD=${oldChain}`,
    ].join("\n"),
    instructions: [
      "1. Open .env and replace the license lines with the envBlock below.",
      "2. Restart the server.",
      "3. Paste the verification key into Licensing → Activate to confirm existing keys still work.",
      "4. All previously issued keys remain valid — validation falls back to the whole LICENSE_SECRET_OLD chain (each rotation extends it).",
    ].join("\n"),
    verificationKey: oldKey.key, // minted under the CURRENT secret; must validate after restart
    rotationCount: candidates.length,
  });
});

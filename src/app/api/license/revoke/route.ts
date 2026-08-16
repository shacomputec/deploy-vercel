import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok, readJson, rateLimit } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { getLicenseStatus } from "@/lib/license";

/**
 * POST /api/license/revoke — revoke an issued license key.
 *
 * Developer-only (strict role + bcrypt password confirmation + rate limit).
 * The revocation is recorded on the issuance; from then on the key is:
 *   - rejected at activation ("This license key has been revoked…"), and
 *   - if the school already activated it, its installation is suspended the
 *     next time the license status is checked (dashboard / Licensing page).
 *
 * Body: { issuanceId, password }
 */
export const POST = handle(async (req) => {
  const user = await requirePerm("licensing", "update");
  if (user.role.name !== "developer") {
    throw new ApiError("Only the system developer can revoke license keys.", 403);
  }
  rateLimit(`license:revoke:${user.id}`, 5, 60_000);

  const body = await readJson<{ issuanceId?: string; password?: string }>(req);
  if (!body.issuanceId) throw new ApiError("issuanceId is required.", 422);
  if (!body.password) throw new ApiError("Password confirmation is required to revoke a license key.", 400);

  const verified = await bcrypt.compare(body.password, user.passwordHash);
  if (!verified) throw new ApiError("Incorrect password — revocation denied.", 403);

  const issuance = await prisma.licenseIssuance.findUnique({ where: { id: body.issuanceId } });
  if (!issuance) throw new ApiError("Issuance not found.", 404);
  if (issuance.revokedAt) throw new ApiError("This key is already revoked.", 409);

  const updated = await prisma.licenseIssuance.update({
    where: { id: issuance.id },
    data: { revokedAt: new Date(), revokedById: user.id },
  });

  await auditLog(user.id, "REVOKE_KEY", "license", updated.id, {
    schoolId: updated.schoolId,
    nonce: updated.nonce,
  });

  // If this exact key is what the local installation is running on, suspend it now.
  const status = await getLicenseStatus();
  return ok({ revoked: true, issuanceId: updated.id, nonce: updated.nonce, localStatus: status.status });
});

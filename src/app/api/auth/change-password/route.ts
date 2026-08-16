import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { auditLog } from "@/lib/audit";

/**
 * Self-service password change. Every signed-in user (web, desktop, mobile —
 * they all share the same account on the same server) can rotate their own
 * password by supplying the current one. No role-level guard needed: you can
 * only ever change YOUR OWN password here.
 */
export const POST = handle(async (req) => {
  const user = await getCurrentUser();
  if (!user) throw new ApiError("Authentication required", 401);

  const body = await readJson<{ currentPassword?: string; newPassword?: string }>(req);
  if (!body.currentPassword || !body.newPassword) {
    throw new ApiError("Current and new password are required.", 422);
  }
  if (body.newPassword.length < 8) {
    throw new ApiError("New password must be at least 8 characters.", 422);
  }
  if (body.newPassword === body.currentPassword) {
    throw new ApiError("New password must be different from the current password.", 422);
  }

  const valid = await bcrypt.compare(body.currentPassword, user.passwordHash);
  if (!valid) throw new ApiError("Current password is incorrect.", 401);

  const rounds = Number(process.env.BCRYPT_ROUNDS || 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(body.newPassword, rounds) },
  });
  await auditLog(user.id, "UPDATE", "users.password", user.id, { changedBySelf: true });
  return ok({ changed: true });
});

import crypto from "node:crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson, ok } from "@/lib/api";
import { requirePerm, clearPermsCache } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

export const PUT = handle(async (req, { params }) => {
  const actor = await requirePerm("users", "update");
  const target = await prisma.user.findUnique({ where: { id: params.id }, include: { role: true } });
  if (!target) throw new ApiError("User not found", 404);

  // Developer account is untouchable by anyone except itself acting as developer
  if (target.role.name === "developer" && actor.role.name !== "developer") {
    throw new ApiError("The Developer account cannot be modified by other roles.", 403);
  }
  if (actor.role.name !== "developer" && target.role.level >= actor.role.level) {
    throw new ApiError("You cannot modify an account at or above your own role level.", 403);
  }

  const body = (await req.json()) as {
    fullName?: string; email?: string; username?: string | null; roleId?: string; phone?: string; status?: string; password?: string; generate?: boolean;
  };

  let generatedPassword: string | undefined;
  const data: Record<string, unknown> = {};
  if (body.fullName) data.fullName = body.fullName;
  if (body.email) data.email = body.email.toLowerCase();
  // Username is optional and editable — an empty string clears it (email-only login).
  if (body.username !== undefined) {
    const uname = body.username ? body.username.trim().toLowerCase() : null;
    if (uname) {
      const taken = await prisma.user.findFirst({ where: { username: uname, id: { not: params.id } } });
      if (taken) throw new ApiError("A user with this username already exists.", 409);
    }
    data.username = uname;
  }
  if (body.phone !== undefined) data.phone = body.phone;
  if (body.status) data.status = body.status;
  const rounds = Number(process.env.BCRYPT_ROUNDS || 10);
  if (body.generate) {
    // Server-side crypto-generated temporary password, returned once so the
    // admin can hand it over — never leave password minting to the client.
    generatedPassword = `Tmp@${crypto.randomBytes(6).toString("hex")}${crypto.randomInt(1000, 9999)}`;
    data.passwordHash = await bcrypt.hash(generatedPassword, rounds);
  } else if (body.password) {
    if (body.password.length < 8) throw new ApiError("Password must be at least 8 characters.");
    data.passwordHash = await bcrypt.hash(body.password, rounds);
  }
  if (body.roleId && body.roleId !== target.roleId) {
    const newRole = await prisma.role.findUnique({ where: { id: body.roleId } });
    if (!newRole) throw new ApiError("Role not found", 404);
    if ((newRole.name === "developer" || newRole.name === "super_admin") && actor.role.name !== "developer") {
      throw new ApiError("Only the Developer can assign this role.", 403);
    }
    if (actor.role.name !== "developer" && newRole.level >= actor.role.level) throw new ApiError("You cannot assign a role at or above your own.", 403);
    data.roleId = body.roleId;
  }

  let updated;
  try {
    updated = await prisma.user.update({
      where: { id: params.id },
      data,
      include: { role: true },
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique constraint")) {
      throw new ApiError("A user with this email or username already exists.", 409);
    }
    throw err;
  }
  clearPermsCache();
  await auditLog(actor.id, "UPDATE", "users", updated.id, { email: updated.email, username: updated.username, passwordReset: !!generatedPassword });
  return ok({ id: updated.id, email: updated.email, username: updated.username, fullName: updated.fullName, role: updated.role.name, status: updated.status, ...(generatedPassword ? { generatedPassword } : {}) });
});

export const DELETE = handle(async (req, { params }) => {
  const actor = await requirePerm("users", "delete");
  const target = await prisma.user.findUnique({ where: { id: params.id }, include: { role: true } });
  if (!target) throw new ApiError("User not found", 404);
  if (target.role.name === "developer") {
    throw new ApiError("The Developer account cannot be deleted.", 403);
  }
  if (actor.role.name !== "developer" && target.role.level >= actor.role.level) {
    throw new ApiError("You cannot delete an account at or above your own role level.", 403);
  }
  await prisma.user.delete({ where: { id: params.id } });
  await auditLog(actor.id, "DELETE", "users", params.id, { email: target.email });
  return ok({ deleted: true });
});

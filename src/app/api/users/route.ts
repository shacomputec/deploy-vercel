import crypto from "node:crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson, ok } from "@/lib/api";
import { userSchema } from "@/lib/validators";
import { requirePerm, getRolePerms } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

export const GET = handle(async () => {
  const user = await requirePerm("users", "read");
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { role: true },
  });
  // Only a developer may see other developers
  const visible = user.role.name === "developer" ? users : users.filter((u) => u.role.name !== "developer");
  return ok(visible);
});

export const POST = handle(async (req) => {
  const actor = await requirePerm("users", "create");
  const parsed = userSchema.safeParse(await readJson(req));
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]!.message, 422);
  const d = parsed.data;

  const role = await prisma.role.findUnique({ where: { id: d.roleId } });
  if (!role) throw new ApiError("Role not found", 404);
  // Only the developer can create developer/super_admin accounts
  if ((role.name === "developer" || role.name === "super_admin") && actor.role.name !== "developer") {
    throw new ApiError("Only the Developer can create this role.", 403);
  }
  // Nobody may create a user at or above their own level (only the Developer
  // may create developer/super_admin accounts — enforced above).
  if (actor.role.name !== "developer" && role.level >= actor.role.level) {
    throw new ApiError("You cannot create an account with a role at or above your own.", 403);
  }

  const existing = await prisma.user.findUnique({ where: { email: d.email.toLowerCase() } });
  if (existing) throw new ApiError("A user with this email already exists.", 409);
  if (d.username) {
    const taken = await prisma.user.findUnique({ where: { username: d.username } });
    if (taken) throw new ApiError("A user with this username already exists.", 409);
  }

  const password = d.password ?? randomPassword();
  const rounds = Number(process.env.BCRYPT_ROUNDS || 10);
  const created = await prisma.user.create({
    data: {
      email: d.email.toLowerCase(),
      username: d.username ?? null,
      passwordHash: await bcrypt.hash(password, rounds),
      fullName: d.fullName,
      roleId: role.id,
      phone: d.phone || null,
      status: d.status || "ACTIVE",
    },
  });
  await auditLog(actor.id, "CREATE", "users", created.id, { email: created.email, role: role.name });
  return NextResponse.json({
    ok: true,
    data: { id: created.id, email: created.email, username: created.username, fullName: created.fullName, role: role.name, temporaryPassword: d.password ? undefined : password },
  }, { status: 201 });
});

function randomPassword() {
  return `Tmp@${crypto.randomBytes(3).toString("hex")}${crypto.randomInt(100, 1000)}`;
}

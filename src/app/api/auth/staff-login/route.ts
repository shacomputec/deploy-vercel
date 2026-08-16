import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { handle, ApiError } from "@/lib/api";
import { signSession, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";

/**
 * Staff portal sign-in — username is the Staff ID the admin assigned, and the
 * password is what the admin gave them (by default the same Staff ID, changed
 * on first login). If the staff record has no linked portal account yet, one
 * is created on the fly with the default password (the staff ID) — so the
 * admin simply tells staff "log in with your Staff ID".
 */
export const POST = handle(async (req) => {
  const body = await req.json().catch(() => ({}));
  const staffId = String(body.staffId ?? "").trim();
  const password = String(body.password ?? "");
  if (!staffId || !password) throw new ApiError("Enter your Staff ID and password.", 422);

  const staff = await prisma.staff.findUnique({ where: { staffId } });
  if (!staff) throw new ApiError("No staff record matches that Staff ID.", 401);
  if (staff.status !== "ACTIVE") throw new ApiError("This account is not active. Contact your administrator.", 403);

  // Ensure a linked portal account exists.
  let user = staff.userId ? await prisma.user.findUnique({ where: { id: staff.userId }, include: { role: true } }) : null;
  if (!user) {
    const role = await prisma.role.findUnique({ where: { name: "teacher" } });
    if (!role) throw new ApiError("The teacher role is missing — run the database seed.", 500);
    const created = await prisma.user.create({
      data: {
        email: `${staff.staffId.toLowerCase().replace(/[^a-z0-9._-]/g, "")}@staff.local`,
        passwordHash: await bcrypt.hash(staff.staffId, 10),
        fullName: staff.fullName,
        roleId: role.id,
      },
    });
    await prisma.staff.update({ where: { id: staff.id }, data: { userId: created.id } });
    user = await prisma.user.findUnique({ where: { id: created.id }, include: { role: true } });
    if (!user) throw new ApiError("Could not create the portal account.", 500);
  }
  if (user.status !== "ACTIVE") throw new ApiError("This account is not active. Contact your administrator.", 403);

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new ApiError("Incorrect password. The default is your Staff ID.", 401);

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const token = await signSession({
    sub: user.id,
    email: user.email,
    name: user.fullName,
    role: user.role.name,
    roleLevel: user.role.level,
  });
  await setSessionCookie(token);
  await auditLog(user.id, "LOGIN", "auth", user.id, { via: "staff-id", staffId });

  return NextResponse.json({
    ok: true,
    data: { email: user.email, name: user.fullName, role: user.role.name },
  });
});

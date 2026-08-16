import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson, ok } from "@/lib/api";
import { staffSchema } from "@/lib/validators";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

export const GET = handle(async () => {
  await requirePerm("staff", "read");
  const staff = await prisma.staff.findMany({ orderBy: { fullName: "asc" } });
  return ok(staff);
});

export const POST = handle(async (req) => {
  const user = await requirePerm("staff", "create");
  const parsed = staffSchema.safeParse(await readJson(req));
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]!.message, 422);
  const d = parsed.data;
  const exists = await prisma.staff.findUnique({ where: { staffId: d.staffId } });
  if (exists) throw new ApiError("A staff member with this Staff ID already exists.", 409);

  const staff = await prisma.staff.create({
    data: {
      staffId: d.staffId,
      fullName: d.fullName,
      gender: d.gender ?? null,
      phone: d.phone ?? null,
      email: d.email ?? null,
      department: d.department ?? null,
      designation: d.designation ?? null,
      status: d.status || "ACTIVE",
    },
  });

  // Every staff member automatically gets a portal account so they can sign
  // in on the website with their Staff ID (default password = their Staff ID)
  // and update their own profile and photo. The admin can reset the password
  // later from the Users screen.
  try {
    const role = await prisma.role.findUnique({ where: { name: "teacher" } });
    if (role) {
      const email = (d.email ?? `${d.staffId.toLowerCase().replace(/[^a-z0-9._-]/g, "")}@staff.local`).toLowerCase();
      const portalUser = await prisma.user.upsert({
        where: { email },
        create: {
          email,
          passwordHash: await bcrypt.hash(d.staffId, 10),
          fullName: d.fullName,
          roleId: role.id,
        },
        update: { fullName: d.fullName },
      });
      await prisma.staff.update({ where: { id: staff.id }, data: { userId: portalUser.id } });
    }
  } catch {
    /* portal account creation is best-effort — staff can still be managed */
  }

  await auditLog(user.id, "CREATE", "staff", staff.id, { name: staff.fullName });
  // Return the record with the linked portal account (userId) populated.
  const withAccount = await prisma.staff.findUnique({
    where: { id: staff.id },
    include: { user: { select: { id: true, email: true } } },
  });
  return NextResponse.json({ ok: true, data: withAccount ?? staff }, { status: 201 });
});

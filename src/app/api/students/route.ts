import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson, ok } from "@/lib/api";
import { studentSchema } from "@/lib/validators";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { nextAdmissionNo } from "@/lib/sequences";

export const GET = handle(async (req) => {
  const user = await requirePerm("students", "read");
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const classId = url.searchParams.get("classId");
  const status = url.searchParams.get("status");
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  // `take` is used by pickers that need a whole class list (e.g. Record
  // Payment: pick a class → all names appear). Capped to keep queries sane.
  const take = Math.min(2000, Math.max(1, Number(url.searchParams.get("take") || 50)));

  const where = {
    ...(q ? { fullName: { contains: q } } : {}),
    ...(classId ? { classId } : {}),
    ...(status ? { status } : {}),
  };
  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * take,
      take,
      include: { class: { include: { level: true } }, parents: { include: { parent: true } } },
    }),
    prisma.student.count({ where }),
  ]);
  return ok({ students, total, page, pages: Math.ceil(total / take) });
});

export const POST = handle(async (req) => {
  const user = await requirePerm("students", "create");
  const body = await readJson(req);
  const parsed = studentSchema.safeParse(body);
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]!.message, 422);
  const d = parsed.data;

  const year = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
  const admissionNo = await nextAdmissionNo();

  const student = await prisma.student.create({
    data: {
      admissionNo,
      fullName: d.fullName,
      gender: d.gender,
      dateOfBirth: d.dateOfBirth ? new Date(d.dateOfBirth) : null,
      classId: d.classId || null,
      phone: d.phone || null,
      email: d.email || null,
      ghanaCard: d.ghanaCard || null,
      nhisNumber: d.nhisNumber || null,
      address: d.address || null,
      hometown: d.hometown || null,
      district: d.district || null,
      region: d.region || null,
      religion: d.religion || null,
      status: d.status || "ACTIVE",
    },
  });
  if (d.classId && year) {
    await prisma.enrollment.create({
      data: { studentId: student.id, classId: d.classId, academicYearId: year.id },
    });
  }
  await auditLog(user.id, "CREATE", "students", student.id, { name: student.fullName });
  return NextResponse.json({ ok: true, data: student }, { status: 201 });
});

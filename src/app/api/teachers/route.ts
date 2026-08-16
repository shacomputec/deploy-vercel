import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson, ok } from "@/lib/api";
import { teacherSchema } from "@/lib/validators";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

const date = (v: string | null | undefined) => (v ? new Date(v) : null);
const num = (v: number | null | undefined) => (typeof v === "number" ? v : null);

export const GET = handle(async (req) => {
  const user = await requirePerm("teachers", "read");
  const teachers = await prisma.teacher.findMany({
    orderBy: { fullName: "asc" },
    include: { classTeacherOf: true },
  });
  return ok(teachers);
});

export const POST = handle(async (req) => {
  const user = await requirePerm("teachers", "create");
  const parsed = teacherSchema.safeParse(await readJson(req));
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]!.message, 422);
  const d = parsed.data;
  const exists = await prisma.teacher.findUnique({ where: { staffId: d.staffId } });
  if (exists) throw new ApiError("A teacher with this Staff ID already exists.", 409);

  const teacher = await prisma.teacher.create({
    data: {
      staffId: d.staffId,
      fullName: d.fullName,
      gender: d.gender ?? null,
      phone: d.phone ?? null,
      email: d.email ?? null,
      dateOfBirth: date(d.dateOfBirth),
      rank: d.rank ?? null,
      gradeType: d.gradeType ?? null,
      gradeLevel: d.gradeLevel ?? null,
      salaryGrade: d.salaryGrade ?? null,
      mainSubject: d.mainSubject ?? null,
      otherSubjects: d.otherSubjects ?? null,
      highestProfQual: d.highestProfQual ?? null,
      highestAcadQual: d.highestAcadQual ?? null,
      ssfNumber: d.ssfNumber ?? null,
      ntcReg: d.ntcReg ?? null,
      specialization: d.specialization ?? null,
      institution: d.institution ?? null,
      yearCompleted: num(d.yearCompleted),
      dateOfFirstAppointment: date(d.dateOfFirstAppointment),
      dateOfLastPromotion: date(d.dateOfLastPromotion),
      datePosted: date(d.datePosted),
      hometown: d.hometown ?? null,
      district: d.district ?? null,
      region: d.region ?? null,
      ghanaCard: d.ghanaCard ?? null,
      emergencyContact: d.emergencyContact ?? null,
      association: d.association ?? null,
      religion: d.religion ?? null,
      maritalStatus: d.maritalStatus ?? null,
      teachingPeriodsPerWeek: num(d.teachingPeriodsPerWeek),
      status: d.status || "ACTIVE",
    },
  });
  await auditLog(user.id, "CREATE", "teachers", teacher.id, { name: teacher.fullName });
  return NextResponse.json({ ok: true, data: teacher }, { status: 201 });
});

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson, ok } from "@/lib/api";
import { assessmentSchema } from "@/lib/validators";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

export const GET = handle(async (req, { params }) => {
  const user = await requirePerm("assessments", "read");
  const assessment = await prisma.assessment.findUnique({
    where: { id: params.id },
    include: {
      subject: true,
      class: { include: { level: true } },
      term: true,
      records: { include: { student: true } },
    },
  });
  if (!assessment) throw new ApiError("Assessment not found", 404);
  // Include students without records so the entry grid can be filled
  const students = await prisma.student.findMany({
    where: { classId: assessment.classId, status: "ACTIVE" },
    orderBy: { fullName: "asc" },
  });
  return ok({ ...assessment, classStudents: students });
});

export const PUT = handle(async (req, { params }) => {
  const user = await requirePerm("assessments", "update");
  const parsed = assessmentSchema.partial().safeParse(await readJson(req));
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]!.message, 422);
  const d = parsed.data;
  const assessment = await prisma.assessment.update({
    where: { id: params.id },
    data: {
      ...d,
      date: d.date ? new Date(d.date) : undefined,
      weight: d.weight ?? undefined,
    },
  });
  await auditLog(user.id, "UPDATE", "assessments", assessment.id);
  return ok(assessment);
});

export const DELETE = handle(async (req, { params }) => {
  const user = await requirePerm("assessments", "delete");
  await prisma.assessment.delete({ where: { id: params.id } });
  await auditLog(user.id, "DELETE", "assessments", params.id);
  return ok({ deleted: true });
});

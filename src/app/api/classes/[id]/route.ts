import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson, ok } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

export const GET = handle(async (req, { params }) => {
  await requirePerm("classes", "read");
  const klass = await prisma.class.findUnique({
    where: { id: params.id },
    include: {
      level: true,
      classTeacher: true,
      students: { where: { status: "ACTIVE" }, orderBy: { fullName: "asc" } },
      subjects: { include: { subject: true, teacher: true } },
    },
  });
  if (!klass) throw new ApiError("Class not found", 404);
  return ok(klass);
});

export const PUT = handle(async (req, { params }) => {
  const user = await requirePerm("classes", "update");
  const body = (await req.json()) as { name?: string; stream?: string; classTeacherId?: string };
  const klass = await prisma.class.update({
    where: { id: params.id },
    data: { name: body.name, stream: body.stream, classTeacherId: body.classTeacherId },
  });
  await auditLog(user.id, "UPDATE", "classes", klass.id);
  return ok(klass);
});

export const DELETE = handle(async (req, { params }) => {
  const user = await requirePerm("classes", "delete");
  await prisma.class.delete({ where: { id: params.id } });
  await auditLog(user.id, "DELETE", "classes", params.id);
  return ok({ deleted: true });
});

/** Assign subjects to a class: body = { subjects: [{ subjectId, teacherId? }] } */
export const POST = handle(async (req, { params }) => {
  const user = await requirePerm("classes", "update");
  const body = (await req.json()) as { subjects?: { subjectId: string; teacherId?: string }[] };
  if (!body.subjects) throw new ApiError("subjects array is required");

  await prisma.$transaction([
    prisma.classSubject.deleteMany({ where: { classId: params.id } }),
    ...body.subjects.map((s) =>
      prisma.classSubject.create({
        data: { classId: params.id, subjectId: s.subjectId, teacherId: s.teacherId || null },
      })
    ),
  ]);
  await auditLog(user.id, "UPDATE", "classes", params.id, { subjects: body.subjects.length });
  return ok({ assigned: body.subjects.length });
});

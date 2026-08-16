import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson, ok } from "@/lib/api";
import { assessmentSchema } from "@/lib/validators";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

export const GET = handle(async (req) => {
  const user = await requirePerm("assessments", "read");
  const url = new URL(req.url);
  const classId = url.searchParams.get("classId");
  const termId = url.searchParams.get("termId");
  const assessments = await prisma.assessment.findMany({
    where: { ...(classId ? { classId } : {}), ...(termId ? { termId } : {}) },
    orderBy: { createdAt: "desc" },
    include: { subject: true, class: true, term: true, _count: { select: { records: true } } },
    take: 300,
  });
  return ok(assessments);
});

export const POST = handle(async (req) => {
  const user = await requirePerm("assessments", "create");
  const parsed = assessmentSchema.safeParse(await readJson(req));
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]!.message, 422);
  const d = parsed.data;

  const term = await prisma.term.findUnique({ where: { id: d.termId } });
  const assessment = await prisma.assessment.create({
    data: {
      title: d.title,
      type: d.type,
      classId: d.classId,
      subjectId: d.subjectId,
      termId: d.termId,
      academicYearId: term?.academicYearId ?? "",
      maxScore: d.maxScore,
      weight: d.weight ?? null,
      date: d.date ? new Date(d.date) : null,
    },
  });
  await auditLog(user.id, "CREATE", "assessments", assessment.id, { title: assessment.title });
  return NextResponse.json({ ok: true, data: assessment }, { status: 201 });
});

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson, ok } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { computeReportCard, persistReportCard } from "@/lib/report";

export const GET = handle(async (req) => {
  const user = await requirePerm("reports", "read");
  const url = new URL(req.url);
  const classId = url.searchParams.get("classId");
  const termId = url.searchParams.get("termId");
  if (!classId || !termId) throw new ApiError("classId and termId are required");

  const reportCards = await prisma.reportCard.findMany({
    where: { classId, termId },
    include: { student: true },
    orderBy: { position: "asc" },
  });
  const students = await prisma.student.findMany({
    where: { classId, status: "ACTIVE" },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, admissionNo: true },
  });
  return ok({ reportCards, students });
});

/** Generate (and persist) report cards for every student in a class/term. */
export const POST = handle(async (req) => {
  const user = await requirePerm("reports", "create");
  const body = (await req.json()) as { classId?: string; termId?: string; academicYearId?: string; studentIds?: string[] };
  if (!body.classId || !body.termId) throw new ApiError("classId and termId are required");

  const term = await prisma.term.findUnique({ where: { id: body.termId } });
  const yearId = body.academicYearId ?? term?.academicYearId;
  if (!yearId) throw new ApiError("Academic year not found");

  const students = await prisma.student.findMany({
    where: { classId: body.classId, status: "ACTIVE", ...(body.studentIds?.length ? { id: { in: body.studentIds } } : {}) },
    select: { id: true },
  });

  const generated = [];
  for (const s of students) {
    const report = await computeReportCard(s.id, body.termId, yearId);
    await persistReportCard(report, s.id, body.classId, body.termId, yearId);
    generated.push(report);
  }
  await auditLog(user.id, "GENERATE", "reports", body.classId, { count: generated.length, termId: body.termId });
  return NextResponse.json({ ok: true, data: { generated: generated.length } });
});

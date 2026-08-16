import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson, ok } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { ensureMocks } from "@/lib/mocks";

/**
 * GET /api/mocks?classId=&termId=&academicYearId=
 * Returns the class subjects (core first), the existing mock numbers, the
 * students, and every recorded score (keyed mock:subject:student).
 *
 * POST /api/mocks  { classId, termId, academicYearId, count }
 * Ensures mocks 1..count exist for every subject of the class (GES practice:
 * at least 5 mocks for BECE/WASSCE candidates).
 */
export const GET = handle(async (req) => {
  await requirePerm("assessments", "read");
  const url = new URL(req.url);
  const classId = url.searchParams.get("classId");
  const termId = url.searchParams.get("termId");
  if (!classId || !termId) throw new ApiError("classId and termId are required");

  const term = await prisma.term.findUnique({ where: { id: termId } });
  const yearId = url.searchParams.get("academicYearId") ?? term?.academicYearId;
  if (!yearId) throw new ApiError("Academic year not found");

  const [cls, classSubjects, students, mocks] = await Promise.all([
    prisma.class.findUnique({ where: { id: classId }, include: { level: true } }),
    prisma.classSubject.findMany({ where: { classId }, include: { subject: true } }),
    prisma.student.findMany({ where: { classId, status: "ACTIVE" }, orderBy: { fullName: "asc" }, select: { id: true, admissionNo: true, fullName: true } }),
    prisma.mockExam.findMany({
      where: { classId, termId, academicYearId: yearId },
      include: { scores: true },
      orderBy: { mockNumber: "asc" },
    }),
  ]);
  if (!cls) throw new ApiError("Class not found");

  const { orderSubjects } = await import("@/lib/mocks");
  const subjects = orderSubjects(classSubjects.map((cs) => ({ id: cs.subjectId, name: cs.subject.name })));

  const scores: Record<string, number> = {};
  for (const m of mocks) {
    for (const s of m.scores) scores[`${m.mockNumber}:${m.subjectId}:${s.studentId}`] = s.score;
  }

  return ok({
    className: cls.name,
    levelCode: cls.level.code,
    levelName: cls.level.name,
    termName: term?.name ?? "",
    yearName: (await prisma.academicYear.findUnique({ where: { id: yearId } }))?.name ?? "",
    subjects,
    mockNumbers: [...new Set(mocks.map((m) => m.mockNumber))].sort((a, b) => a - b),
    students,
    scores,
  });
});

export const POST = handle(async (req) => {
  const user = await requirePerm("assessments", "update");
  const body = await readJson<{ classId?: string; termId?: string; academicYearId?: string; count?: number }>(req);
  if (!body.classId || !body.termId) throw new ApiError("classId and termId are required");
  const term = await prisma.term.findUnique({ where: { id: body.termId } });
  const yearId = body.academicYearId ?? term?.academicYearId;
  if (!yearId) throw new ApiError("Academic year not found");

  const count = Math.max(1, Math.min(12, Number(body.count ?? 5)));
  const mocks = await ensureMocks(body.classId, body.termId, yearId, count);
  await auditLog(user.id, "CREATE", "mockExam", body.classId, { count, termId: body.termId });
  return ok({ created: mocks.length, mocks }, { status: 201 });
});

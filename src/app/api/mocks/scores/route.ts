import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson, ok } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

/**
 * PUT /api/mocks/scores
 * Body: { classId, termId, academicYearId?, mockNumber, scores: [{ studentId, subjectId, score }] }
 * Upserts every score for one mock exam. Blank scores (null) delete the entry.
 */
export const PUT = handle(async (req) => {
  const user = await requirePerm("assessments", "update");
  const body = await readJson<{
    classId?: string;
    termId?: string;
    academicYearId?: string;
    mockNumber?: number;
    scores?: { studentId: string; subjectId: string; score: number | null }[];
  }>(req);
  if (!body.classId || !body.termId || !body.mockNumber) {
    throw new ApiError("classId, termId and mockNumber are required");
  }
  if (!Array.isArray(body.scores)) throw new ApiError("scores array is required", 422);

  const term = await prisma.term.findUnique({ where: { id: body.termId } });
  const yearId = body.academicYearId ?? term?.academicYearId;
  if (!yearId) throw new ApiError("Academic year not found");

  const classSubjects = await prisma.classSubject.findMany({
    where: { classId: body.classId },
    select: { subjectId: true },
  });
  const validSubjects = new Set(classSubjects.map((c) => c.subjectId));

  let saved = 0;
  let removed = 0;
  for (const entry of body.scores) {
    if (!validSubjects.has(entry.subjectId)) continue;
    // Find (or create) the mock exam row for this class/subject/mock.
    let exam = await prisma.mockExam.findUnique({
      where: {
        classId_subjectId_termId_mockNumber: {
          classId: body.classId!,
          subjectId: entry.subjectId,
          termId: body.termId!,
          mockNumber: body.mockNumber!,
        },
      },
    });
    if (!exam) {
      exam = await prisma.mockExam.create({
        data: {
          title: `Mock ${body.mockNumber}`,
          mockNumber: body.mockNumber!,
          classId: body.classId!,
          subjectId: entry.subjectId,
          termId: body.termId!,
          academicYearId: yearId,
        },
      });
    }
    const score =
      entry.score === null || entry.score === undefined || Number.isNaN(Number(entry.score))
        ? null
        : Math.max(0, Math.min(100, Number(entry.score)));

    if (score === null) {
      const del = await prisma.mockScore.deleteMany({ where: { mockExamId: exam.id, studentId: entry.studentId } });
      removed += del.count;
    } else {
      await prisma.mockScore.upsert({
        where: { mockExamId_studentId: { mockExamId: exam.id, studentId: entry.studentId } },
        update: { score },
        create: { mockExamId: exam.id, studentId: entry.studentId, score },
      });
      saved++;
    }
  }

  await auditLog(user.id, "UPDATE", "mockExam", body.classId, {
    mockNumber: body.mockNumber,
    saved,
    removed,
    termId: body.termId,
  });
  return ok({ saved, removed });
});

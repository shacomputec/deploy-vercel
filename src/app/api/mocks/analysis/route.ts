import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { computeMockAnalysis } from "@/lib/mocks";

/**
 * GET /api/mocks/analysis?classId=&termId=&academicYearId=
 *
 * The detailed BECE/WASSCE mock analysis:
 *  - per student × subject: every mock score, average, best/worst, trend
 *    (last mock − first mock) and the PREDICTED grade for the real exam,
 *  - per student: overall predicted average, predicted grade/points and rank,
 *  - per subject: the class's average per mock (improvement across the
 *    series), class average, highest, lowest, pass rate and grade
 *    distribution of predicted grades.
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

  const data = await computeMockAnalysis(classId, termId, yearId);
  return ok(data);
});

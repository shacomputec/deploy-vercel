import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { computeMasterSheet } from "@/lib/master-sheet";

/**
 * GET /api/master-sheet?classId=&termId=&academicYearId=
 *
 * The class MASTER SHEET (every student × every subject with Class (SBA),
 * Exam, Total and Grade, ranked) and the BROAD SHEET (per-subject statistics:
 * class average, highest, lowest, pass rate, grade distribution, plus overall
 * class summary). Computed live from the SBA component sheet and assessments.
 */
export const GET = handle(async (req) => {
  await requirePerm("reports", "read");
  const url = new URL(req.url);
  const classId = url.searchParams.get("classId");
  const termId = url.searchParams.get("termId");
  if (!classId || !termId) throw new ApiError("classId and termId are required");

  const term = await prisma.term.findUnique({ where: { id: termId } });
  const yearId = url.searchParams.get("academicYearId") ?? term?.academicYearId;
  if (!yearId) throw new ApiError("Academic year not found");

  const data = await computeMasterSheet(classId, termId, yearId);
  return ok(data);
});

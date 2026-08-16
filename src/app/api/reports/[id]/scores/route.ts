import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok, readJson } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { computeReportCard, persistReportCard } from "@/lib/report";

type SubjectEdit = { subjectId: string; class: number | null; exam: number | null };

/**
 * POST /api/reports/:id/scores — admin edits the per-subject Class (50%) and
 * Exam (50%) scores directly on a report card.
 *
 * The edit is written through to the underlying assessment records (same
 * WYSIWYG rule as the class mark sheet: the class score is stored on every
 * SBA assessment for the subject, the exam score on the EXAM assessment), so
 * the assessment stays the single source of truth. The student's report card
 * is then recomputed and re-persisted so grades, totals, remarks and position
 * refresh immediately. A null value clears that component.
 */
export const POST = handle(async (req, { params }) => {
  // The endpoint writes assessment records, so it needs BOTH capabilities.
  const user = await requirePerm("reports", "update");
  await requirePerm("assessments", "update");
  const report = await prisma.reportCard.findUnique({ where: { id: params.id } });
  if (!report) throw new ApiError("Report not found", 404);

  const body = await readJson<{ subjects?: SubjectEdit[]; expectedUpdatedAt?: string }>(req);
  if (!Array.isArray(body.subjects)) throw new ApiError("subjects array is required");

  // Optimistic lock: reject a stale save so two admins can't silently
  // overwrite each other's score edits on the same report card.
  const expected = body.expectedUpdatedAt ? new Date(body.expectedUpdatedAt) : null;
  if (expected && !Number.isNaN(expected.getTime()) && report.updatedAt.getTime() !== expected.getTime()) {
    throw new ApiError("This report was changed by someone else. Refresh and try again.", 409);
  }

  // Only accept subjects actually taught in the report's class — an authorized
  // client can't inject arbitrary subjects (which would create assessments).
  const classSubjects = await prisma.classSubject.findMany({
    where: { classId: report.classId },
    select: { subjectId: true },
  });
  const allowed = new Set(classSubjects.map((cs) => cs.subjectId));
  if (body.subjects.some((s) => !allowed.has(s.subjectId))) {
    throw new ApiError("One or more subjects do not belong to this class", 422);
  }

  const term = await prisma.term.findUnique({ where: { id: report.termId } });
  if (!term) throw new ApiError("Term not found", 404);

  // Validate + normalize (0–100). Keep every subject so a full clear (both null)
  // still deletes previously stored records — the mark sheet can't clear either
  // component of a subject if both are blank.
  const valid: SubjectEdit[] = [];
  for (const s of body.subjects) {
    const cls = s.class === null || s.class === undefined ? null : Math.round(s.class * 100) / 100;
    const exam = s.exam === null || s.exam === undefined ? null : Math.round(s.exam * 100) / 100;
    if (cls !== null && (cls < 0 || cls > 100)) throw new ApiError("Class scores must be between 0 and 100");
    if (exam !== null && (exam < 0 || exam > 100)) throw new ApiError("Exam scores must be between 0 and 100");
    valid.push({ subjectId: s.subjectId, class: cls, exam });
  }

  // Map subjectId -> assessment targets (reuse existing, else create). Only
  // create assessments when there is actually a score to write — a pure clear
  // on a subject that never had assessments is a no-op.
  const subjectIds = [...new Set(valid.map((c) => c.subjectId))];
  const targets = new Map<string, { sbaIds: string[]; examId: string }>();
  for (const subjectId of subjectIds) {
    const hasWrite = valid.some((c) => c.subjectId === subjectId && (c.class !== null || c.exam !== null));
    const sbas = await prisma.assessment.findMany({
      where: { classId: report.classId, subjectId, termId: report.termId, type: "SBA" },
    });
    const exam = await prisma.assessment.findFirst({
      where: { classId: report.classId, subjectId, termId: report.termId, type: "EXAM" },
    });
    let sbaIds = sbas.map((a) => a.id);
    let examId = exam?.id ?? "";
    if (hasWrite) {
      if (!sbaIds.length) {
        const createdSba = await prisma.assessment.create({
          data: {
            title: "Class Score", type: "SBA", classId: report.classId, subjectId,
            termId: report.termId, academicYearId: report.academicYearId, maxScore: 100, published: true,
          },
        });
        sbaIds = [createdSba.id];
      }
      if (!examId) {
        const createdExam = await prisma.assessment.create({
          data: {
            title: "End-of-Term Examination", type: "EXAM", classId: report.classId, subjectId,
            termId: report.termId, academicYearId: report.academicYearId, maxScore: 100, published: true,
          },
        });
        examId = createdExam.id;
      }
    }
    targets.set(subjectId, { sbaIds, examId });
  }

  // Upsert records in one transaction (null = clear that component)
  const ops: Prisma.PrismaPromise<unknown>[] = [];
  let saved = 0;
  for (const c of valid) {
    const t = targets.get(c.subjectId)!;
    if (c.class !== null) {
      for (const sbaId of t.sbaIds) {
        ops.push(
          prisma.assessmentRecord.upsert({
            where: { assessmentId_studentId: { assessmentId: sbaId, studentId: report.studentId } },
            update: { score: c.class },
            create: { assessmentId: sbaId, studentId: report.studentId, score: c.class },
          })
        );
      }
      saved++;
    } else {
      for (const sbaId of t.sbaIds) {
        ops.push(prisma.assessmentRecord.deleteMany({ where: { assessmentId: sbaId, studentId: report.studentId } }));
      }
    }
    if (c.exam !== null) {
      ops.push(
        prisma.assessmentRecord.upsert({
          where: { assessmentId_studentId: { assessmentId: t.examId, studentId: report.studentId } },
          update: { score: c.exam },
          create: { assessmentId: t.examId, studentId: report.studentId, score: c.exam },
        })
      );
      saved++;
    } else {
      ops.push(prisma.assessmentRecord.deleteMany({ where: { assessmentId: t.examId, studentId: report.studentId } }));
    }
  }
  await prisma.$transaction(ops);

  // Recompute + re-persist this student's report (comments/conduct are preserved)
  const fresh = await computeReportCard(report.studentId, report.termId, report.academicYearId);
  await persistReportCard(fresh, report.studentId, report.classId, report.termId, report.academicYearId);

  await auditLog(user.id, "UPDATE", "reports", report.id, { action: "edit-scores", subjects: valid.length, saved });
  return ok({ saved, recomputed: fresh });
});

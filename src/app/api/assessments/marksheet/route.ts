import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok, readJson } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

type Cell = { studentId: string; subjectId: string; class: number | null; exam: number | null };

/**
 * Mark sheet — one row per student, one pair of columns (Class 50% / Exam 50%)
 * per subject, matching the GES JHS/SHS weighting (50/50).
 *
 * GET  ?classId=&termId=  → the full matrix with existing values.
 * POST body: { classId, termId, cells: [...] } → upserts scores.
 *
 * To keep reports consistent, the class score is stored in the first existing
 * SBA assessment for the subject/term (or a new "Class Score" one), and the
 * exam score in the first existing EXAM assessment (or a new one). A blank
 * cell clears any previously stored score.
 */
export const GET = handle(async (req) => {
  await requirePerm("assessments", "read");
  const url = new URL(req.url);
  const classId = url.searchParams.get("classId") ?? "";
  const termId = url.searchParams.get("termId") ?? "";
  if (!classId || !termId) throw new ApiError("classId and termId are required");

  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls) throw new ApiError("Class not found", 404);

  const [classSubjects, students, assessments] = await Promise.all([
    prisma.classSubject.findMany({
      where: { classId },
      include: { subject: true },
      orderBy: { subject: { name: "asc" } },
    }),
    prisma.student.findMany({ where: { classId, status: "ACTIVE" }, orderBy: { fullName: "asc" } }),
    prisma.assessment.findMany({
      where: { classId, termId },
      include: { records: true },
    }),
  ]);

  const cells: Cell[] = [];
  for (const s of students) {
    for (const cs of classSubjects) {
      const subj = assessments.filter((a) => a.subjectId === cs.subjectId);
      const sbaScores = subj
        .filter((a) => a.type === "SBA")
        .map((a) => a.records.find((r) => r.studentId === s.id)?.score)
        .filter((x): x is number => x !== undefined);
      const exam = subj.find((a) => a.type === "EXAM")?.records.find((r) => r.studentId === s.id)?.score ?? null;
      cells.push({
        studentId: s.id,
        subjectId: cs.subjectId,
        class: sbaScores.length ? Math.round((sbaScores.reduce((a, b) => a + b, 0) / sbaScores.length) * 100) / 100 : null,
        exam: exam ?? null,
      });
    }
  }

  return ok({
    classId,
    termId,
    className: cls.name,
    subjects: classSubjects.map((cs) => ({ id: cs.subjectId, name: cs.subject.name })),
    students: students.map((s) => ({ id: s.id, fullName: s.fullName, admissionNo: s.admissionNo })),
    cells,
  });
});

export const POST = handle(async (req) => {
  const user = await requirePerm("assessments", "update");
  const body = await readJson<{ classId?: string; termId?: string; cells?: Cell[] }>(req);
  if (!body.classId || !body.termId || !Array.isArray(body.cells)) {
    throw new ApiError("classId, termId and cells are required");
  }

  const term = await prisma.term.findUnique({ where: { id: body.termId } });
  if (!term) throw new ApiError("Term not found", 404);

  // Normalize + validate scores (0–100)
  const valid: Cell[] = [];
  for (const c of body.cells) {
    const cls = c.class === null || c.class === undefined ? null : Math.round(c.class * 100) / 100;
    const exam = c.exam === null || c.exam === undefined ? null : Math.round(c.exam * 100) / 100;
    if (cls !== null && (cls < 0 || cls > 100)) throw new ApiError("Class scores must be between 0 and 100");
    if (exam !== null && (exam < 0 || exam > 100)) throw new ApiError("Exam scores must be between 0 and 100");
    // Keep every cell so clearing BOTH components still deletes stored records
    valid.push({ studentId: c.studentId, subjectId: c.subjectId, class: cls, exam });
  }

  // Map subjectId -> { sbaIds, examId } assessments (reuse existing, else create)
  // The class score is written to EVERY SBA assessment for the subject so the
  // mark sheet is WYSIWYG: what you type is exactly the class score the report
  // card shows (report cards average all SBAs).
  const subjectIds = [...new Set(valid.map((c) => c.subjectId))];
  const targets = new Map<string, { sbaIds: string[]; examId: string }>();
  let created = 0;

  for (const subjectId of subjectIds) {
    const hasWrite = valid.some((c) => c.subjectId === subjectId && (c.class !== null || c.exam !== null));
    const sbas = await prisma.assessment.findMany({ where: { classId: body.classId, subjectId, termId: body.termId, type: "SBA" } });
    const exam = await prisma.assessment.findFirst({ where: { classId: body.classId, subjectId, termId: body.termId, type: "EXAM" } });
    let sbaIds = sbas.map((a) => a.id);
    let examId = exam?.id ?? "";
    if (hasWrite && !sbaIds.length) {
      const createdSba = await prisma.assessment.create({
        data: {
          title: "Class Score", type: "SBA", classId: body.classId, subjectId,
          termId: body.termId, academicYearId: term.academicYearId, maxScore: 100, published: true,
        },
      });
      sbaIds = [createdSba.id];
      created++;
    }
    if (hasWrite && !examId) {
      const createdExam = await prisma.assessment.create({
        data: {
          title: "End-of-Term Examination", type: "EXAM", classId: body.classId, subjectId,
          termId: body.termId, academicYearId: term.academicYearId, maxScore: 100, published: true,
        },
      });
      examId = createdExam.id;
      created++;
    }
    targets.set(subjectId, { sbaIds, examId });
  }

  // Upsert scores in a single transaction (blank cell = clear previous score)
  const ops: Prisma.PrismaPromise<unknown>[] = [];
  let saved = 0;
  for (const c of valid) {
    const t = targets.get(c.subjectId)!;
    if (c.class !== null) {
      for (const sbaId of t.sbaIds) {
        ops.push(
          prisma.assessmentRecord.upsert({
            where: { assessmentId_studentId: { assessmentId: sbaId, studentId: c.studentId } },
            update: { score: c.class },
            create: { assessmentId: sbaId, studentId: c.studentId, score: c.class },
          })
        );
      }
      saved++;
    } else {
      for (const sbaId of t.sbaIds) {
        ops.push(prisma.assessmentRecord.deleteMany({ where: { assessmentId: sbaId, studentId: c.studentId } }));
      }
    }
    if (c.exam !== null) {
      ops.push(
        prisma.assessmentRecord.upsert({
          where: { assessmentId_studentId: { assessmentId: t.examId, studentId: c.studentId } },
          update: { score: c.exam },
          create: { assessmentId: t.examId, studentId: c.studentId, score: c.exam },
        })
      );
      saved++;
    } else {
      ops.push(prisma.assessmentRecord.deleteMany({ where: { assessmentId: t.examId, studentId: c.studentId } }));
    }
  }
  await prisma.$transaction(ops);

  await auditLog(user.id, "UPDATE", "assessments", body.classId, {
    action: "marksheet", term: term.name, cells: valid.length, assessmentsCreated: created,
  });
  return ok({ saved, cleared: valid.length * 2 - saved, assessmentsCreated: created });
});

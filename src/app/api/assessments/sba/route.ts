import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok, readJson } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import {
  SBA_COMPONENTS, SbaWeights, SbaComponentValues,
  getSbaWeights, saveSbaWeights, computeSbaTotal, aggregateTotals,
} from "@/lib/sba";

type SbaRow = {
  studentId: string;
  subjectId: string;
  classWork?: number | null;
  projectWork?: number | null;
  classTest?: number | null;
  practicals?: number | null;
  homework?: number | null;
};

/**
 * SBA component sheet — one row per student, one block of five component
 * columns (Class Work / Project Work / Class Test / Practicals / Homework)
 * per subject, a computed Total (0–100) per subject, and an Aggregate column
 * (Σ of the student's subject totals) at the end.
 *
 * GET  ?classId=&termId=  → the full matrix.
 * POST body: { classId, termId, rows: SbaRow[], weights?: SbaWeights }.
 */
export const GET = handle(async (req) => {
  await requirePerm("assessments", "read");
  const url = new URL(req.url);
  const classId = url.searchParams.get("classId") ?? "";
  const termId = url.searchParams.get("termId") ?? "";
  if (!classId || !termId) throw new ApiError("classId and termId are required");

  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls) throw new ApiError("Class not found", 404);

  const [classSubjects, students, records, term] = await Promise.all([
    prisma.classSubject.findMany({
      where: { classId },
      include: { subject: true },
      orderBy: { subject: { name: "asc" } },
    }),
    prisma.student.findMany({ where: { classId, status: "ACTIVE" }, orderBy: { fullName: "asc" } }),
    prisma.sbaRecord.findMany({ where: { classId, termId } }),
    prisma.term.findUnique({ where: { id: termId } }),
  ]);
  if (!term) throw new ApiError("Term not found", 404);

  const weights = await getSbaWeights();
  const byKey = new Map(records.map((r) => [`${r.studentId}:${r.subjectId}`, r]));

  const cells: (SbaRow & { total: number | null })[] = [];
  for (const s of students) {
    for (const cs of classSubjects) {
      const rec = byKey.get(`${s.id}:${cs.subjectId}`);
      cells.push({
        studentId: s.id,
        subjectId: cs.subjectId,
        classWork: rec?.classWork ?? null,
        projectWork: rec?.projectWork ?? null,
        classTest: rec?.classTest ?? null,
        practicals: rec?.practicals ?? null,
        homework: rec?.homework ?? null,
        total: rec?.total ?? null,
      });
    }
  }

  // Aggregate per student = Σ of subject totals (the last column of the sheet)
  const aggregates: Record<string, number | null> = {};
  for (const s of students) {
    const totals = cells.filter((c) => c.studentId === s.id).map((c) => c.total);
    aggregates[s.id] = aggregateTotals(totals);
  }

  return ok({
    classId,
    termId,
    className: cls.name,
    termName: term.name,
    weights,
    subjects: classSubjects.map((cs) => ({ id: cs.subjectId, name: cs.subject.name })),
    students: students.map((s) => ({ id: s.id, fullName: s.fullName, admissionNo: s.admissionNo })),
    cells,
    aggregates,
  });
});

export const POST = handle(async (req) => {
  const user = await requirePerm("assessments", "update");
  const body = await readJson<{ classId?: string; termId?: string; rows?: SbaRow[]; weights?: SbaWeights }>(req);
  if (!body.classId || !body.termId || !Array.isArray(body.rows)) {
    throw new ApiError("classId, termId and rows are required");
  }

  const classId = body.classId;
  const termId = body.termId;
  const rows = body.rows;
  const term = await prisma.term.findUnique({ where: { id: termId } });
  if (!term) throw new ApiError("Term not found", 404);

  // Persist weights only for senior roles (a global setting, not per-class).
  if (body.weights && ["developer", "super_admin", "headteacher", "assistant_headteacher"].includes(user.role.name)) {
    await saveSbaWeights(body.weights);
  }
  const weights = await getSbaWeights();

  // Validate: scores must be 0–100 or blank
  for (const row of rows) {
    for (const k of SBA_COMPONENTS) {
      const v = (row as SbaComponentValues)[k];
      if (v === null || v === undefined) continue;
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > 100) throw new ApiError(`${k} must be between 0 and 100`);
    }
  }

  let saved = 0;
  let cleared = 0;
  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      const values: SbaComponentValues = {};
      let any = false;
      for (const k of SBA_COMPONENTS) {
        const v = (row as SbaComponentValues)[k];
        if (v === null || v === undefined) { values[k] = null; continue; }
        values[k] = Math.round(Number(v) * 100) / 100;
        any = true;
      }
      if (!any) {
        const deleted = await tx.sbaRecord.deleteMany({
          where: { studentId: row.studentId, subjectId: row.subjectId, classId, termId },
        });
        cleared += deleted.count;
        continue;
      }
      const total = computeSbaTotal(values, weights);
      await tx.sbaRecord.upsert({
        where: {
          studentId_subjectId_classId_termId: {
            studentId: row.studentId,
            subjectId: row.subjectId,
            classId,
            termId,
          },
        },
        update: { ...values, total },
        create: {
          ...values, total,
          studentId: row.studentId,
          subjectId: row.subjectId,
          classId,
          termId,
          academicYearId: term.academicYearId,
        },
      });
      saved++;
    }
  });

  await auditLog(user.id, "UPDATE", "assessments", classId, {
    action: "sba-sheet", term: term.name, rows: rows.length, saved, cleared, weights,
  });
  return ok({ saved, cleared });
});

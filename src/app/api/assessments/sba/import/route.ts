import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { readSpreadsheet } from "@/lib/io";
import { SBA_COMPONENTS, SBA_LABELS, getSbaWeights, computeSbaTotal, type SbaComponent } from "@/lib/sba";

/**
 * SBA component sheet import.
 *
 * POST /api/assessments/sba/import   (multipart: file + classId + termId)
 *
 * Accepts the exact CSV/XLSX produced by the export route (or template):
 * columns AdmissionNo, Student, Subject, Class Work, Project Work, Class Test,
 * Practicals, Homework, Total, Aggregate. Student/Subject/Total/Aggregate
 * columns may be absent — the import keys off AdmissionNo + Subject name.
 * Blank components clear stored values; a fully-blank row deletes the record.
 */
export const POST = handle(async (req) => {
  const user = await requirePerm("assessments", "update");
  const form = await req.formData();
  const file = form.get("file");
  const classId = String(form.get("classId") || "");
  const termId = String(form.get("termId") || "");
  if (!(file instanceof File)) throw new ApiError("CSV/XLSX file is required");
  if (!classId || !termId) throw new ApiError("classId and termId are required");

  const [cls, term] = await Promise.all([
    prisma.class.findUnique({ where: { id: classId } }),
    prisma.term.findUnique({ where: { id: termId } }),
  ]);
  if (!cls) throw new ApiError("Class not found", 404);
  if (!term) throw new ApiError("Term not found", 404);

  const [students, classSubjects] = await Promise.all([
    prisma.student.findMany({ where: { classId, status: "ACTIVE" }, orderBy: { fullName: "asc" } }),
    prisma.classSubject.findMany({ where: { classId }, include: { subject: true }, orderBy: { subject: { name: "asc" } } }),
  ]);
  const byAdmission = new Map(students.map((s) => [s.admissionNo.toUpperCase(), s]));
  const bySubjectName = new Map(classSubjects.map((cs) => [cs.subject.name.toLowerCase().trim(), cs.subjectId]));

  const { rows, format } = await readSpreadsheet(file);
  if (rows.length < 2) throw new ApiError("File must contain a header row and at least one data row");

  const header = rows[0]!.map((h) => h.trim().toLowerCase().replace(/\s+/g, ""));
  const idxNo = header.indexOf("admissionno") >= 0 ? header.indexOf("admissionno") : header.indexOf("admissionnumber");
  const idxSubj = header.findIndex((h) => h === "subject");
  if (idxNo < 0 || idxSubj < 0) {
    throw new ApiError('File must have "AdmissionNo" and "Subject" columns (use the SBA export template).');
  }
  const idxComp = new Map<SbaComponent, number>();
  for (const k of SBA_COMPONENTS) {
    const label = SBA_LABELS[k].toLowerCase().replace(/\s+/g, "");
    const i = header.indexOf(label);
    if (i >= 0) idxComp.set(k, i);
  }

  const ops: { student: typeof students[number]; subjectId: string; values: Partial<Record<SbaComponent, number | null>>; any: boolean }[] = [];
  const skipped: string[] = [];
  let subjectMisses = 0;

  for (const row of rows.slice(1)) {
    const admissionNo = (row[idxNo] ?? "").trim().toUpperCase();
    const subject = (row[idxSubj] ?? "").trim();
    if (!admissionNo || !subject) continue;
    const student = byAdmission.get(admissionNo);
    const subjectId = bySubjectName.get(subject.toLowerCase());
    if (!student || !subjectId) {
      skipped.push(admissionNo || subject);
      if (student && !subjectId) subjectMisses++;
      continue;
    }
    const values: Partial<Record<SbaComponent, number | null>> = {};
    let any = false;
    for (const k of SBA_COMPONENTS) {
      const i = idxComp.get(k);
      const raw = i === undefined ? "" : (row[i] ?? "").toString().trim();
      if (raw === "") {
        values[k] = null;
        continue;
      }
      const n = Number(raw);
      if (!Number.isFinite(n)) {
        throw new ApiError(`Row for ${admissionNo} · ${subject}: "${k}" must be a number (got "${raw}")`);
      }
      if (n < 0 || n > 100) throw new ApiError(`Row for ${admissionNo} · ${subject}: ${SBA_LABELS[k]} must be between 0 and 100`);
      values[k] = Math.round(n * 100) / 100;
      any = true;
    }
    ops.push({ student, subjectId, values, any });
  }

  if (!ops.length) throw new ApiError("No valid rows found. Check that admission numbers and subject names match this class.");

  const weights = await getSbaWeights();
  let saved = 0;
  let cleared = 0;
  await prisma.$transaction(async (tx) => {
    for (const op of ops) {
      if (!op.any) {
        const del = await tx.sbaRecord.deleteMany({
          where: { studentId: op.student.id, subjectId: op.subjectId, classId, termId },
        });
        cleared += del.count;
        continue;
      }
      const total = computeSbaTotal(op.values as never, weights);
      await tx.sbaRecord.upsert({
        where: {
          studentId_subjectId_classId_termId: {
            studentId: op.student.id,
            subjectId: op.subjectId,
            classId,
            termId,
          },
        },
        update: { ...op.values, total },
        create: {
          ...op.values,
          total,
          studentId: op.student.id,
          subjectId: op.subjectId,
          classId,
          termId,
          academicYearId: term.academicYearId,
        },
      });
      saved++;
    }
  });

  await auditLog(user.id, "UPLOAD", "assessments", classId, {
    action: "sba-import", term: term.name, format, rows: ops.length, saved, cleared,
    skipped: skipped.length, subjectMisses,
  });
  return NextResponse.json({
    ok: true,
    data: { imported: saved, cleared, skipped: skipped.slice(0, 20), subjectMisses },
  });
});

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { buildSpreadsheet } from "@/lib/io";
import { SBA_COMPONENTS, SBA_LABELS, getSbaWeights } from "@/lib/sba";

/**
 * SBA component sheet export.
 *
 * GET /api/assessments/sba/export?classId=&termId=&format=csv|xlsx[&template=1]
 *
 * One row per student × subject: AdmissionNo, Student, Subject, then the five
 * components (Class Work / Project Work / Class Test / Practicals / Homework),
 * the weighted Total and the Aggregate. With `template=1` the components are
 * blank but the student/subject grid is pre-filled, ready for data entry.
 */
export const GET = handle(async (req) => {
  const user = await requirePerm("assessments", "read");
  const url = new URL(req.url);
  const classId = url.searchParams.get("classId") ?? "";
  const termId = url.searchParams.get("termId") ?? "";
  const format = url.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  const template = url.searchParams.get("template") === "1";
  if (!classId || !termId) throw new ApiError("classId and termId are required");

  const [cls, classSubjects, students, records, term] = await Promise.all([
    prisma.class.findUnique({ where: { id: classId } }),
    prisma.classSubject.findMany({ where: { classId }, include: { subject: true }, orderBy: { subject: { name: "asc" } } }),
    prisma.student.findMany({ where: { classId, status: "ACTIVE" }, orderBy: { fullName: "asc" } }),
    prisma.sbaRecord.findMany({ where: { classId, termId } }),
    prisma.term.findUnique({ where: { id: termId } }),
  ]);
  if (!cls) throw new ApiError("Class not found", 404);
  if (!term) throw new ApiError("Term not found", 404);

  const byKey = new Map(records.map((r) => [`${r.studentId}:${r.subjectId}`, r]));
  const weights = await getSbaWeights();

  // Aggregate per student = Σ of their subject totals
  const aggByStudent = new Map<string, number | null>();
  for (const s of students) {
    const totals = classSubjects.map((cs) => byKey.get(`${s.id}:${cs.subjectId}`)?.total ?? null);
    const vals = totals.filter((t): t is number => t !== null);
    aggByStudent.set(s.id, vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) * 100) / 100 : null);
  }

  const header = ["AdmissionNo", "Student", "Subject", ...SBA_COMPONENTS.map((k) => SBA_LABELS[k]), "Total", "Aggregate"];
  const rows: (string | number | null | undefined)[][] = [header];
  for (const s of students) {
    for (const cs of classSubjects) {
      const rec = byKey.get(`${s.id}:${cs.subjectId}`);
      rows.push([
        s.admissionNo,
        s.fullName,
        cs.subject.name,
        ...SBA_COMPONENTS.map((k) => (template ? null : rec?.[k] ?? null)),
        template ? null : rec?.total ?? null,
        template ? null : aggByStudent.get(s.id) ?? null,
      ]);
    }
  }

  await auditLog(user.id, template ? "EXPORT" : "EXPORT", "assessments", classId, {
    action: "sba-export", term: term.name, format, template, rows: rows.length - 1,
  });

  const { data, filename, contentType } = await buildSpreadsheet({
    rows,
    format,
    filename: `sba-${cls.name.replace(/\W+/g, "-").toLowerCase()}-${term.name.replace(/\W+/g, "-").toLowerCase()}${template ? "-template" : ""}`,
  });
  return new NextResponse(data, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});

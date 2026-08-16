import { prisma } from "@/lib/prisma";
import { handle, ApiError } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { computeMasterSheet } from "@/lib/master-sheet";
import { buildSpreadsheet } from "@/lib/io";

/**
 * GET /api/master-sheet/export?classId=&termId=&academicYearId=&format=csv|xlsx
 * Exports the master sheet (one row per student, per-subject Class/Exam/Total/
 * Grade columns) and a second sheet with the broad (subject statistics) view.
 */
export const GET = handle(async (req) => {
  await requirePerm("reports", "read");
  const url = new URL(req.url);
  const classId = url.searchParams.get("classId");
  const termId = url.searchParams.get("termId");
  const format = url.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  if (!classId || !termId) throw new ApiError("classId and termId are required");

  const term = await prisma.term.findUnique({ where: { id: termId } });
  const yearId = url.searchParams.get("academicYearId") ?? term?.academicYearId;
  if (!yearId) throw new ApiError("Academic year not found");

  const data = await computeMasterSheet(classId, termId, yearId);

  // Master sheet rows
  const header = ["Position", "Admission No", "Student", "Gender", "Average %", "Aggregate", "Promotion"];
  for (const s of data.subjects) {
    header.push(`${s.name} (Class)`, `${s.name} (Exam)`, `${s.name} (Total)`, `${s.name} (Grade)`);
  }
  const masterRows: (string | number | null)[][] = [header];
  for (const m of data.master) {
    const row: (string | number | null)[] = [
      m.position,
      m.admissionNo,
      m.fullName,
      m.gender,
      m.average,
      m.aggregate !== null ? `${m.aggregate}/${m.aggregateMax}` : "",
      m.promotionStatus,
    ];
    for (const s of m.subjects) {
      row.push(s.classScore, s.examScore, s.total, s.grade);
    }
    masterRows.push(row);
  }

  // Broad sheet rows
  const broadRows: (string | number | null)[][] = [
    ["Subject", "Students", "Class Average", "Highest", "Lowest", "Pass Count", "Pass Rate %", "Grade Distribution"],
  ];
  for (const b of data.broad) {
    broadRows.push([
      b.subject,
      b.count,
      b.average,
      b.highest,
      b.lowest,
      b.passCount,
      b.passRate,
      b.gradeDist.map((g) => `${g.grade}:${g.count}`).join(", "),
    ]);
  }

  // Per-student class summary (position, average %, aggregate)
  const summaryRows: (string | number | null)[][] = [
    ["Position", "Admission No", "Student", "Average %", "Aggregate", "Promotion"],
    ...data.summary.map((s) => [
      s.position,
      s.admissionNo,
      s.fullName,
      s.average,
      s.aggregate !== null ? `${s.aggregate}/${s.aggregateMax}` : "",
      s.promotionStatus,
    ]),
  ];

  // One workbook: the master sheet, the class summary, then the broad sheet.
  const rows = [
    ...masterRows,
    [],
    ["CLASS SUMMARY — POSITION, AVERAGE & AGGREGATE"],
    ...summaryRows,
    [],
    ["BROAD SHEET — SUBJECT ANALYSIS"],
    ...broadRows,
  ];

  const { data: body, filename, contentType } = await buildSpreadsheet({
    rows,
    filename: `Master-Sheet_${data.meta.className}_${data.meta.termName}`.replace(/[^\w\-]+/g, "_"),
    format,
  });

  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});

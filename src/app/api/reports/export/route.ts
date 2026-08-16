import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { buildSpreadsheet } from "@/lib/io";
import { gradeForPercent } from "@/lib/grading";
import type { ComputedReport } from "@/lib/report";

/**
 * Full mark-sheet / report-card export for a class + term.
 *
 * GET /api/reports/export?classId=&termId=&format=csv|xlsx
 *
 * One row per student with every subject's Class (%), Exam (%), Total and
 * Grade columns, plus overall Total, Position and Promotion status — a
 * spreadsheet mirror of the printed report card. Requires report cards to
 * have been generated (Admin → Report Cards → Generate All).
 */
export const GET = handle(async (req) => {
  const user = await requirePerm("reports", "read");
  const url = new URL(req.url);
  const classId = url.searchParams.get("classId") ?? "";
  const termId = url.searchParams.get("termId") ?? "";
  const format = url.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  if (!classId || !termId) throw new ApiError("classId and termId are required");

  const [cls, term] = await Promise.all([
    prisma.class.findUnique({ where: { id: classId }, include: { level: true } }),
    prisma.term.findUnique({ where: { id: termId } }),
  ]);
  if (!cls) throw new ApiError("Class not found", 404);
  if (!term) throw new ApiError("Term not found", 404);

  const cards = await prisma.reportCard.findMany({
    where: { classId, termId },
    include: { student: true },
    orderBy: { position: "asc" },
  });
  if (!cards.length) {
    throw new ApiError("No report cards for this class/term yet — generate them first (Admin → Report Cards).");
  }

  // Build the union of subjects in report order (first card defines the order)
  const subjectNames = new Set<string>();
  for (const c of cards) {
    const data = c.data ? (JSON.parse(c.data) as ComputedReport) : null;
    for (const r of data?.results ?? []) subjectNames.add(r.subject);
  }
  const subjects = [...subjectNames];

  const header = ["Position", "AdmissionNo", "Student", ...subjects.flatMap((s) => [`${s} (Class %)`, `${s} (Exam %)`, `${s} (Total)`, `${s} (Grade)`]), "Total %", "Overall Grade", "Promotion", "Remark"];
  const rows: (string | number | null | undefined)[][] = [header];

  for (const c of cards) {
    const data = c.data ? (JSON.parse(c.data) as ComputedReport) : null;
    const bySubject = new Map((data?.results ?? []).map((r) => [r.subject, r]));
    const cells: (string | number | null)[] = [];
    for (const s of subjects) {
      const r = bySubject.get(s);
      cells.push(r?.classWeighted != null ? r.classWeighted : "", r?.examWeighted != null ? r.examWeighted : "", r?.total != null ? r.total : "", r?.grade ?? "");
    }
    const grade = c.totalPercentage != null ? await gradeForPercent(cls.levelId, c.totalPercentage) : null;
    rows.push([
      c.position ?? "",
      c.student.admissionNo,
      c.student.fullName,
      ...cells,
      c.totalPercentage != null ? c.totalPercentage : "",
      grade?.grade ?? "",
      (c.promotionStatus ?? "").replaceAll("_", " "),
      grade?.remark ?? "",
    ]);
  }

  await auditLog(user.id, "EXPORT", "reports", classId, {
    action: "marksheet-export", term: term.name, format, rows: rows.length - 1,
  });

  const { data, filename, contentType } = await buildSpreadsheet({
    rows,
    format,
    filename: `report-card-mark-sheet-${cls.name.replace(/\W+/g, "-").toLowerCase()}-${term.name.replace(/\W+/g, "-").toLowerCase()}`,
  });
  return new NextResponse(data, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});

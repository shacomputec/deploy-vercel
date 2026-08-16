import { prisma } from "@/lib/prisma";
import { handle, ApiError } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { computeMockAnalysis } from "@/lib/mocks";
import { buildSpreadsheet } from "@/lib/io";

/**
 * GET /api/mocks/export?classId=&termId=&academicYearId=&format=csv|xlsx
 * One row per student × subject with every mock's score, the average, best,
 * worst, trend and predicted grade — plus a subject-analysis section.
 */
export const GET = handle(async (req) => {
  await requirePerm("assessments", "read");
  const url = new URL(req.url);
  const classId = url.searchParams.get("classId");
  const termId = url.searchParams.get("termId");
  const format = url.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  if (!classId || !termId) throw new ApiError("classId and termId are required");

  const term = await prisma.term.findUnique({ where: { id: termId } });
  const yearId = url.searchParams.get("academicYearId") ?? term?.academicYearId;
  if (!yearId) throw new ApiError("Academic year not found");

  const data = await computeMockAnalysis(classId, termId, yearId);

  // Per-student × subject detail
  const header = ["Position", "Admission No", "Student", "Subject", "Core"];
  for (const n of data.mockNumbers) header.push(`Mock ${n}`);
  header.push("Average", "Best", "Worst", "Trend", "Predicted Grade", "Points", "Remark");

  const rows: (string | number | null)[][] = [header];
  for (const st of data.students) {
    for (const subj of st.subjects) {
      rows.push([
        st.position || "",
        st.admissionNo,
        st.fullName,
        subj.subject,
        subj.core ? "CORE" : "",
        ...subj.scores,
        subj.average,
        subj.best,
        subj.worst,
        subj.trend,
        subj.grade,
        subj.points,
        subj.remark,
      ]);
    }
  }

  // Predicted aggregate per student (best-6 JHS / 4 core + 2 electives SHS)
  const aggregateRows: (string | number | null)[][] = [
    ["Position", "Admission No", "Student", "Average %", "Predicted Aggregate", "Aggregate Max", "Subjects Used"],
    ...data.students
      .filter((st) => st.aggregate !== null)
      .sort((a, b) => (a.aggregate ?? 99) - (b.aggregate ?? 99))
      .map((st, i) => [
        i + 1,
        st.admissionNo,
        st.fullName,
        st.overallAverage,
        st.aggregate,
        st.aggregateMax,
        st.aggregateUsed.join(", "),
      ]),
  ];

  // Subject analysis
  const subjectHeader = ["Subject", "Core"];
  for (const n of data.mockNumbers) subjectHeader.push(`Class avg — Mock ${n}`);
  subjectHeader.push("Trend", "Class Average", "Highest", "Lowest", "Pass Count", "Pass Rate %", "Predicted Grade Distribution");

  const subjectRows: (string | number | null)[][] = [subjectHeader];
  for (const s of data.subjectStats) {
    subjectRows.push([
      s.subject,
      s.core ? "CORE" : "",
      ...s.perMockAverages,
      s.trend,
      s.classAverage,
      s.highest,
      s.lowest,
      s.passCount,
      s.passRate,
      s.gradeDist.map((g) => `${g.grade}:${g.count}`).join(", "),
    ]);
  }

  const allRows = [
    ...rows,
    [],
    ["PREDICTED AGGREGATE (lower is better)"],
    ...aggregateRows,
    [],
    ["SUBJECT ANALYSIS — CLASS AVERAGES & PREDICTED GRADES"],
    ...subjectRows,
  ];

  const { data: body, filename, contentType } = await buildSpreadsheet({
    rows: allRows,
    filename: `Mock-Analysis_${data.className}_${data.termName}`.replace(/[^\w\-]+/g, "_"),
    format,
  });

  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});

// ============================================================================
// Master Sheet & Broad Sheet — class-based analysis of SBA + report data.
// ----------------------------------------------------------------------------
// MASTER SHEET: every student × every subject with Class (SBA), Exam, Total,
// Grade — ranked by position, exactly like the report card's mark sheet.
// BROAD SHEET: per-subject statistics (class average, highest, lowest, pass
// rate, grade distribution) plus an overall class summary.
// Both are computed LIVE from the SBA component sheet + assessments, so they
// always reflect the current marks (no need to regenerate report cards first).
// ============================================================================
import { prisma } from "@/lib/prisma";
import { computeReportCard } from "@/lib/report";
import { computeAggregate } from "@/lib/aggregate";

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function computeMasterSheet(classId: string, termId: string, academicYearId: string) {
  const [cls, term, year, students, classSubjects] = await Promise.all([
    prisma.class.findUnique({ where: { id: classId }, include: { level: true } }),
    prisma.term.findUnique({ where: { id: termId } }),
    prisma.academicYear.findUnique({ where: { id: academicYearId } }),
    prisma.student.findMany({ where: { classId, status: "ACTIVE" }, orderBy: { fullName: "asc" } }),
    prisma.classSubject.findMany({ where: { classId }, include: { subject: true }, orderBy: { subject: { name: "asc" } } }),
  ]);
  if (!cls) throw new Error("Class not found");

  const subjectOrder = classSubjects.map((cs) => ({ id: cs.subjectId, name: cs.subject.name }));

  type MasterSubject = {
    subject: string;
    classScore: number | null;
    examScore: number | null;
    total: number | null;
    grade: string | null;
    points: number | null;
    remark: string | null;
    passed: boolean | null;
  };
  type MasterRow = {
    studentId: string;
    admissionNo: string;
    fullName: string;
    gender: string;
    position: number;
    onRoll: number;
    totalPercent: number;
    average: number;
    aggregate: number | null;
    aggregateMax: number;
    classAverage: number;
    promotionStatus: string;
    subjects: MasterSubject[];
  };

  // Master sheet rows — computed live for every student.
  const master: MasterRow[] = [];
  for (const s of students) {
    const report = await computeReportCard(s.id, termId, academicYearId);
    const subjectRows = subjectOrder.map((so) => {
      const r = report.results.find((x) => x.subjectId === so.id);
      return {
        subject: so.name,
        classScore: r?.classScore ?? null,
        examScore: r?.examScore ?? null,
        total: r?.total ?? null,
        grade: r?.grade ?? null,
        points: r?.points ?? null,
        remark: r?.remark ?? null,
        passed: r?.passed ?? null,
      };
    });
    // GES aggregate — sum of the best subject grade-points (JHS: best 6;
    // SHS: 4 core + 2 best electives). Only subjects that were actually
    // assessed count (an unassessed subject must not drag the aggregate to
    // a grade-9 worst case). Primary/KG: not applicable.
    const agg = computeAggregate(
      cls.level.code,
      report.results
        .filter((r) => r.classScore !== null || r.examScore !== null)
        .map((r) => ({ subject: r.subject, points: r.points }))
    );
    master.push({
      studentId: s.id,
      admissionNo: s.admissionNo,
      fullName: s.fullName,
      gender: s.gender,
      position: report.position,
      onRoll: report.onRoll,
      totalPercent: report.totalPercent,
      average: report.totalPercent,
      aggregate: agg.aggregate,
      aggregateMax: agg.maxAggregate,
      classAverage: report.classAverage,
      promotionStatus: report.promotionStatus,
      subjects: subjectRows,
    });
  }
  master.sort((a, b) => (a.position ?? 999) - (b.position ?? 999));

  // Per-student summary used by the broad sheet: average %, aggregate and rank.
  const summary = master.map((m) => ({
    studentId: m.studentId,
    admissionNo: m.admissionNo,
    fullName: m.fullName,
    position: m.position,
    average: m.average,
    aggregate: m.aggregate,
    aggregateMax: m.aggregateMax,
    promotionStatus: m.promotionStatus,
  }));

  // Broad sheet — per-subject statistics.
  const broad = subjectOrder.map((so) => {
    const totals = master
      .map((m) => m.subjects.find((x) => x.subject === so.name)?.total as number | null | undefined)
      .filter((v): v is number => v !== null && v !== undefined);
    const passed = master.filter((m) => m.subjects.find((x) => x.subject === so.name)?.passed).length;
    const grades = master
      .map((m) => m.subjects.find((x) => x.subject === so.name)?.grade as string | null | undefined)
      .filter((g): g is string => g !== null && g !== undefined);
    const dist = [...new Set(grades)].sort().map((g) => ({ grade: g, count: grades.filter((x) => x === g).length }));
    return {
      subject: so.name,
      count: totals.length,
      average: totals.length ? round2(totals.reduce((a, b) => a + b, 0) / totals.length) : null,
      highest: totals.length ? Math.max(...totals) : null,
      lowest: totals.length ? Math.min(...totals) : null,
      passCount: passed,
      passRate: totals.length ? Math.round((passed / totals.length) * 100) : null,
      gradeDist: dist,
    };
  });

  const totals = master.map((m) => m.totalPercent).filter((v): v is number => v !== null && v !== undefined);
  const aggregates = master.map((m) => m.aggregate).filter((v): v is number => v !== null);
  const promoted = master.filter((m) => m.promotionStatus === "PROMOTED").length;
  const conditional = master.filter((m) => m.promotionStatus === "CONDITIONAL").length;
  const repeat = master.filter((m) => m.promotionStatus === "REPEAT").length;

  return {
    meta: {
      className: cls.name,
      levelCode: cls.level.code,
      levelName: cls.level.name,
      termName: term?.name ?? "",
      yearName: year?.name ?? "",
      onRoll: students.length,
      overallAverage: totals.length ? round2(totals.reduce((a, b) => a + b, 0) / totals.length) : null,
      overallHighest: totals.length ? Math.max(...totals) : null,
      overallLowest: totals.length ? Math.min(...totals) : null,
      classAggregateAverage: aggregates.length ? round2(aggregates.reduce((a, b) => a + b, 0) / aggregates.length) : null,
      bestAggregate: aggregates.length ? Math.min(...aggregates) : null,
      worstAggregate: aggregates.length ? Math.max(...aggregates) : null,
      promoted,
      conditional,
      repeat,
    },
    subjects: subjectOrder,
    master,
    broad,
    summary,
  };
}

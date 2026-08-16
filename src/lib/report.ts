import { prisma } from "@/lib/prisma";
import { gradeForPercent } from "@/lib/grading";
import { signValue } from "@/lib/auth";

export type SubjectResult = {
  subjectId: string;
  subject: string;
  classScore: number | null; // SBA total (0-100) from the component sheet (fallback: legacy average)
  examScore: number | null; // end-of-term exam (0-100)
  classWeighted: number | null; // class exercise contribution, out of 100 (default ÷ 2 → 50%)
  examWeighted: number | null; // exam contribution, out of 100 (default ÷ 2 → 50%)
  total: number | null; // classWeighted + examWeighted (0-100)
  percent: number;
  grade: string;
  points: number | null;
  remark: string | null;
  passed: boolean;
};

export type ComputedReport = {
  student: { id: string; admissionNo: string; fullName: string; gender: string };
  className: string;
  levelCode: string;
  termName: string;
  yearName: string;
  sbaWeight: number; // % contribution of the class exercise (default 50)
  examWeight: number; // % contribution of the exam (default 50)
  results: SubjectResult[];
  totalScore: number;
  totalPercent: number;
  classAverage: number;
  position: number;
  onRoll: number;
  attendanceDays: number;
  attendancePresent: number;
  promotionStatus: string;
  qrToken: string;
  generatedAt: string;
};

async function getWeighting(levelCode: string) {
  const key = levelCode === "JHS" ? "weighting.jhs" : levelCode === "SHS" ? "weighting.shs" : null;
  if (!key) return { sba: 100, exam: 0 };
  const row = await prisma.setting.findUnique({ where: { key } });
  try {
    const parsed = row?.value ? JSON.parse(row.value) : null;
    return { sba: Number(parsed?.sba ?? 50), exam: Number(parsed?.exam ?? 50) };
  } catch {
    return { sba: 50, exam: 50 };
  }
}

export async function computeReportCard(studentId: string, termId: string, academicYearId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { class: { include: { level: true } } },
  });
  if (!student || !student.class) throw new Error("Student has no class");

  const term = await prisma.term.findUnique({ where: { id: termId } });
  const year = await prisma.academicYear.findUnique({ where: { id: academicYearId } });
  if (!term || !year) throw new Error("Term or academic year not found");

  const classSubjects = await prisma.classSubject.findMany({
    where: { classId: student.class.id },
    include: { subject: true },
  });
  const weighting = await getWeighting(student.class.level.code);

  // All assessments for this class/term
  const [assessments, sbaRecords] = await Promise.all([
    prisma.assessment.findMany({
      where: { classId: student.class.id, termId, academicYearId },
      include: { records: { where: { studentId } } },
    }),
    prisma.sbaRecord.findMany({ where: { classId: student.class.id, termId, studentId } }),
  ]);
  const sbaBySubject = new Map(sbaRecords.map((r) => [r.subjectId, r.total ?? null]));

  const results: SubjectResult[] = [];
  for (const cs of classSubjects) {
    const subjAssessments = assessments.filter((a) => a.subjectId === cs.subjectId);
    const sba = subjAssessments
      .filter((a) => a.type === "SBA")
      .map((a) => a.records[0]?.score ?? null);
    const exam = subjAssessments.filter((a) => a.type === "EXAM").map((a) => a.records[0]?.score ?? null)[0] ?? null;

    // SBA component sheet total takes precedence; fall back to the legacy
    // average of SBA assessments so existing data keeps working.
    const sbaTotal = sbaBySubject.get(cs.subjectId) ?? null;
    const sbaScores = sba.filter((s): s is number => s !== null);
    const classScore =
      sbaTotal !== null
        ? sbaTotal
        : sbaScores.length
          ? sbaScores.reduce((a, b) => a + b, 0) / sbaScores.length
          : null;

    // Weighted halves — at the default 50/50 these are exactly class ÷ 2 and
    // exam ÷ 2, which is what the report card prints as Class Exercise (50%)
    // and End-of-Term Exam (50%).
    const classWeighted =
      classScore !== null ? Math.min(100, Math.round(((classScore * weighting.sba) / 100) * 100) / 100) : null;
    const examWeighted =
      exam !== null ? Math.min(100, Math.round(((exam * weighting.exam) / 100) * 100) / 100) : null;

    const total =
      classWeighted !== null || examWeighted !== null
        ? Math.min(100, Math.round(((classWeighted ?? 0) + (examWeighted ?? 0)) * 100) / 100)
        : null;
    const percent = total ?? 0;
    const g = await gradeForPercent(student.class.level.id, percent);
    results.push({
      subjectId: cs.subjectId,
      subject: cs.subject.name,
      classScore: classScore !== null ? Math.round(classScore * 100) / 100 : null,
      examScore: exam !== null ? Math.round(exam * 100) / 100 : null,
      classWeighted,
      examWeighted,
      total,
      percent,
      grade: g.grade,
      points: g.points,
      remark: g.remark,
      passed: g.passed,
    });
  }

  // Class cohort for ranking — batch-computed (single set of queries, not per student)
  const cohort = await prisma.student.findMany({
    where: { classId: student.class.id, status: "ACTIVE" },
    select: { id: true },
  });

  const cohortTotals = await computeCohortTotals(cohort.map((c) => c.id), student.class.id, termId, academicYearId, weighting);
  cohortTotals.delete(studentId); // the target student is appended separately below

  // Average only subjects that actually have scores — a subject with no marks
  // (e.g. not yet assessed) must NOT count as 0%. This denominator matches the
  // cohort ranking (computeCohortTotals divides by the subjects with data), so
  // positions and class averages are consistent across students.
  const presentResults = results.filter((r) => r.classScore !== null || r.examScore !== null);
  const totalPercent = presentResults.length ? presentResults.reduce((a, r) => a + r.percent, 0) / presentResults.length : 0;
  const all = [...cohortTotals.values(), totalPercent].sort((a, b) => b - a);
  const position = all.indexOf(totalPercent) + 1;
  const onRoll = cohort.length;
  const classAverage = all.length ? all.reduce((a, b) => a + b, 0) / all.length : 0;

  // Attendance within the term window
  const start = term.startDate;
  const end = new Date(term.endDate.getTime() + 86400000);
  const attendance = await prisma.attendanceRecord.findMany({
    where: { studentId, date: { gte: start, lt: end } },
  });
  const attendanceDays = attendance.length;
  const attendancePresent = attendance.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;

  // Promotion status (JHS/SHS: failed = grade 9/F9). Only subjects that were
  // actually assessed count — an unassessed subject is not a failure.
  const failedSubjects = results.filter((r) => !r.passed && (r.classScore !== null || r.examScore !== null)).length;
  const promotionStatus =
    student.class.level.code === "JHS" || student.class.level.code === "SHS"
      ? failedSubjects === 0
        ? "PROMOTED"
        : failedSubjects <= 2
          ? "CONDITIONAL"
          : "REPEAT"
      : totalPercent >= 50
        ? "PROMOTED"
        : "REPEAT";

  const totalScore = results.reduce((a, r) => a + (r.total ?? 0), 0);
  const qrValue = `${studentId}:${termId}:${academicYearId}:${totalPercent.toFixed(2)}`;
  const qrToken = signValue(qrValue);

  return {
    student: {
      id: student.id,
      admissionNo: student.admissionNo,
      fullName: student.fullName,
      gender: student.gender,
    },
    className: student.class.name,
    levelCode: student.class.level.code,
    termName: term.name,
    yearName: year.name,
    sbaWeight: weighting.sba,
    examWeight: weighting.exam,
    results,
    totalScore,
    totalPercent: Math.round(totalPercent * 100) / 100,
    classAverage: Math.round(classAverage * 100) / 100,
    position,
    onRoll,
    attendanceDays,
    attendancePresent,
    promotionStatus,
    qrToken,
    generatedAt: new Date().toISOString(),
  } satisfies ComputedReport;
}

/**
 * Compute total percentages for an entire cohort in one batch of queries.
 * Uses the SAME weighting as the target student's level, so rankings are consistent.
 */
async function computeCohortTotals(
  studentIds: string[],
  classId: string,
  termId: string,
  academicYearId: string,
  weighting: { sba: number; exam: number }
): Promise<Map<string, number>> {
  const totals = new Map<string, number>();
  if (!studentIds.length) return totals;

  const [classSubjects, assessments, sbaRecords] = await Promise.all([
    prisma.classSubject.findMany({ where: { classId }, select: { subjectId: true } }),
    prisma.assessment.findMany({
      where: { classId, termId, academicYearId },
      include: { records: { where: { studentId: { in: studentIds } } } },
    }),
    prisma.sbaRecord.findMany({ where: { classId, termId, studentId: { in: studentIds } } }),
  ]);

  // studentId:subjectId -> { sba scores, sba sheet total, exam score }
  const byKey = new Map<string, { sba: number[]; sbaTotal: number | null; exam: number | null }>();
  for (const a of assessments) {
    for (const rec of a.records) {
      const key = `${rec.studentId}:${a.subjectId}`;
      const entry = byKey.get(key) ?? { sba: [], sbaTotal: null, exam: null };
      if (a.type === "SBA") entry.sba.push(rec.score);
      else entry.exam = rec.score;
      byKey.set(key, entry);
    }
  }
  for (const r of sbaRecords) {
    const key = `${r.studentId}:${r.subjectId}`;
    const entry = byKey.get(key) ?? { sba: [], sbaTotal: null, exam: null };
    entry.sbaTotal = r.total ?? null;
    byKey.set(key, entry);
  }

  for (const sid of studentIds) {
    let sum = 0;
    let n = 0;
    for (const cs of classSubjects) {
      const entry = byKey.get(`${sid}:${cs.subjectId}`);
      if (!entry) continue;
      const classScore =
        entry.sbaTotal !== null
          ? entry.sbaTotal
          : entry.sba.length
            ? entry.sba.reduce((a, b) => a + b, 0) / entry.sba.length
            : null;
      if (classScore !== null || entry.exam !== null) {
        const c = classScore ?? 0;
        const e = entry.exam ?? 0;
        sum += Math.min(100, (c * weighting.sba) / 100 + (e * weighting.exam) / 100);
        n++;
      }
    }
    if (n > 0) totals.set(sid, sum / n);
  }
  return totals;
}

/** Persist (upsert) a computed report card row. */
export async function persistReportCard(
  report: ComputedReport,
  studentId: string,
  classId: string,
  termId: string,
  academicYearId: string
) {
  const existing = await prisma.reportCard.findUnique({
    where: { studentId_termId_academicYearId: { studentId, termId, academicYearId } },
  });
  const data = {
    studentId,
    classId,
    termId,
    academicYearId,
    totalScore: report.totalScore,
    totalPercentage: report.totalPercent,
    classAverage: report.classAverage,
    position: report.position,
    onRoll: report.onRoll,
    promotionStatus: report.promotionStatus,
    attendanceDays: report.attendanceDays,
    attendancePresent: report.attendancePresent,
    data: JSON.stringify(report),
    qrToken: report.qrToken,
  };
  if (existing) {
    return prisma.reportCard.update({
      where: { id: existing.id },
      data: { ...data, published: existing.published },
    });
  }
  return prisma.reportCard.create({ data });
}

/** Verify a QR-coded result link: token must match a published report card. */
export async function verifyReportQr(qrToken: string) {
  const report = await prisma.reportCard.findUnique({ where: { qrToken } });
  if (!report || !report.published) return { valid: false as const, reason: "not_found" };
  const expected = signValue(
    `${report.studentId}:${report.termId}:${report.academicYearId}:${(report.totalPercentage ?? 0).toFixed(2)}`
  );
  if (expected !== qrToken) return { valid: false as const, reason: "tampered" };
  return { valid: true as const, report };
}

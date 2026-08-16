// ============================================================================
// Mock examination series — BECE (Basic 9) / WASSCE (SHS) preparation.
// ----------------------------------------------------------------------------
// A class sits a series of mocks per subject (GES practice: at least 5). The
// analysis rolls every student's scores across the series into per-subject
// trends, averages and PREDICTED grades (the grade their average would earn on
// the real exam), plus class-level per-subject statistics.
// ============================================================================
import { prisma } from "@/lib/prisma";
import { gradeForPercent } from "@/lib/grading";
import { computeAggregate } from "@/lib/aggregate";

const round = (n: number) => Math.round(n * 100) / 100;

// Core subjects listed first (in a fixed order), then the remaining subjects
// alphabetically — so English, Maths, Integrated Science and Social Studies
// lead both the BECE and WASSCE analyses.
const CORE_ORDER = [
  "English Language",
  "Core Mathematics",
  "Mathematics",
  "Integrated Science",
  "Social Studies",
  "Religious & Moral Education",
  "Ghanaian Language",
  "Computing (ICT)",
  "Career Technology",
  "Creative Arts & Design",
  "Physical & Health Education",
  "French",
];

export function orderSubjects(subjects: { id: string; name: string }[]) {
  const core = CORE_ORDER.map((name) => subjects.find((s) => s.name === name)).filter(Boolean) as { id: string; name: string }[];
  const coreIds = new Set(core.map((s) => s.id));
  const rest = subjects.filter((s) => !coreIds.has(s.id)).sort((a, b) => a.name.localeCompare(b.name));
  return core.map((s) => ({ ...s, core: true })).concat(rest.map((s) => ({ ...s, core: false })));
}

/** Create the mock structure for a class/term: mocks 1..count for every subject. */
export async function ensureMocks(classId: string, termId: string, academicYearId: string, count: number) {
  const classSubjects = await prisma.classSubject.findMany({ where: { classId }, select: { subjectId: true } });
  const existing = await prisma.mockExam.findMany({ where: { classId, termId, academicYearId }, select: { subjectId: true, mockNumber: true } });
  const have = new Set(existing.map((e) => `${e.subjectId}:${e.mockNumber}`));
  const toCreate: { title: string; mockNumber: number; classId: string; subjectId: string; termId: string; academicYearId: string }[] = [];
  for (const cs of classSubjects) {
    for (let n = 1; n <= count; n++) {
      if (!have.has(`${cs.subjectId}:${n}`)) {
        toCreate.push({ title: `Mock ${n}`, mockNumber: n, classId, subjectId: cs.subjectId, termId, academicYearId });
      }
    }
  }
  if (toCreate.length) {
    await prisma.mockExam.createMany({ data: toCreate });
  }
  return prisma.mockExam.findMany({
    where: { classId, termId, academicYearId },
    orderBy: [{ mockNumber: "asc" }],
    select: { id: true, title: true, mockNumber: true, published: true, date: true },
  });
}

export type MockStudentRow = {
  studentId: string;
  admissionNo: string;
  fullName: string;
  gender: string;
  subjects: {
    subjectId: string;
    subject: string;
    core: boolean;
    scores: (number | null)[];
    average: number | null;
    best: number | null;
    worst: number | null;
    trend: number | null;
    grade: string | null;
    points: number | null;
    remark: string | null;
    passed: boolean | null;
  }[];
  overallAverage: number | null;
  overallGrade: string | null;
  overallPoints: number | null;
  overallRemark: string | null;
  overallPassed: boolean | null;
  aggregate: number | null; // predicted BECE/WASSCE aggregate (grade points)
  aggregateMax: number;
  aggregateUsed: string[]; // subjects that make up the aggregate
  position: number;
};

/** Full BECE/WASSCE mock analysis for one class + term. */
export async function computeMockAnalysis(classId: string, termId: string, academicYearId: string) {
  const cls = await prisma.class.findUnique({ where: { id: classId }, include: { level: true } });
  if (!cls) throw new Error("Class not found");
  const term = await prisma.term.findUnique({ where: { id: termId } });
  const year = await prisma.academicYear.findUnique({ where: { id: academicYearId } });

  const [students, classSubjects, mocks] = await Promise.all([
    prisma.student.findMany({
      where: { classId, status: "ACTIVE" },
      orderBy: { fullName: "asc" },
      select: { id: true, admissionNo: true, fullName: true, gender: true },
    }),
    prisma.classSubject.findMany({ where: { classId }, include: { subject: true } }),
    prisma.mockExam.findMany({
      where: { classId, termId, academicYearId },
      include: { scores: true },
      orderBy: { mockNumber: "asc" },
    }),
  ]);

  const subjects = orderSubjects(classSubjects.map((cs) => ({ id: cs.subjectId, name: cs.subject.name })));
  const mockNumbers = [...new Set(mocks.map((m) => m.mockNumber))].sort((a, b) => a - b);

  const scoreBy = new Map<string, number>();
  for (const m of mocks) {
    for (const s of m.scores) scoreBy.set(`${m.mockNumber}:${m.subjectId}:${s.studentId}`, s.score);
  }

  const levelId = cls.level.id;
  const studentRows: MockStudentRow[] = [];
  for (const st of students) {
    const subjectRows: MockStudentRow["subjects"] = [];
    let overallSum = 0;
    let overallN = 0;
    for (const subj of subjects) {
      const scores = mockNumbers.map((n) => scoreBy.get(`${n}:${subj.id}:${st.id}`) ?? null);
      const present = scores.filter((s): s is number => s !== null);
      const average = present.length ? round(present.reduce((a, b) => a + b, 0) / present.length) : null;
      const first = scores.find((s) => s !== null) ?? null;
      const last = [...scores].reverse().find((s) => s !== null) ?? null;
      const trend = first !== null && last !== null ? round(last - first) : null;
      const g = average !== null ? await gradeForPercent(levelId, average) : null;
      subjectRows.push({
        subjectId: subj.id,
        subject: subj.name,
        core: subj.core,
        scores,
        average,
        best: present.length ? Math.max(...present) : null,
        worst: present.length ? Math.min(...present) : null,
        trend,
        grade: g?.grade ?? null,
        points: g?.points ?? null,
        remark: g?.remark ?? null,
        passed: g?.passed ?? null,
      });
      if (average !== null) {
        overallSum += average;
        overallN++;
      }
    }
    const overallAverage = overallN ? round(overallSum / overallN) : null;
    const overallGrade = overallAverage !== null ? await gradeForPercent(levelId, overallAverage) : null;
    // Predicted aggregate from the mocks — JHS: best 6 subjects; SHS: 4 core +
    // 2 best electives (grade points summed; lower is better).
    const agg = computeAggregate(
      cls.level.code,
      subjectRows.map((r) => ({ subject: r.subject, points: r.points }))
    );
    studentRows.push({
      studentId: st.id,
      admissionNo: st.admissionNo,
      fullName: st.fullName,
      gender: st.gender,
      subjects: subjectRows,
      overallAverage,
      overallGrade: overallGrade?.grade ?? null,
      overallPoints: overallGrade?.points ?? null,
      overallRemark: overallGrade?.remark ?? null,
      overallPassed: overallGrade?.passed ?? null,
      aggregate: agg.aggregate,
      aggregateMax: agg.maxAggregate,
      aggregateUsed: agg.used,
      position: 0,
    });
  }

  // Rank by predicted overall average (best first).
  const ranked = studentRows.filter((r) => r.overallAverage !== null).sort((a, b) => (b.overallAverage ?? 0) - (a.overallAverage ?? 0));
  ranked.forEach((r, i) => {
    r.position = i + 1;
  });

  // Class-level statistics per subject.
  const subjectStats = subjects.map((subj) => {
    const perMockAverages = mockNumbers.map((n) => {
      const vals = studentRows
        .map((r) => scoreBy.get(`${n}:${subj.id}:${r.studentId}`))
        .filter((v): v is number => v !== null);
      return vals.length ? round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
    });
    const avgs = studentRows
      .map((r) => r.subjects.find((s) => s.subjectId === subj.id)?.average ?? null)
      .filter((v): v is number => v !== null);
    const passed = studentRows.filter((r) => r.subjects.find((s) => s.subjectId === subj.id)?.passed === true).length;
    const grades = studentRows
      .map((r) => r.subjects.find((s) => s.subjectId === subj.id)?.grade ?? null)
      .filter((g): g is string => g !== null);
    const dist = [...new Set(grades)].sort().map((g) => ({ grade: g, count: grades.filter((x) => x === g).length }));
    const firstAvg = perMockAverages.find((v) => v !== null) ?? null;
    const lastAvg = [...perMockAverages].reverse().find((v) => v !== null) ?? null;
    return {
      subjectId: subj.id,
      subject: subj.name,
      core: subj.core,
      perMockAverages,
      trend: firstAvg !== null && lastAvg !== null ? round(lastAvg - firstAvg) : null,
      classAverage: avgs.length ? round(avgs.reduce((a, b) => a + b, 0) / avgs.length) : null,
      highest: avgs.length ? Math.max(...avgs) : null,
      lowest: avgs.length ? Math.min(...avgs) : null,
      passCount: passed,
      passRate: avgs.length ? Math.round((passed / avgs.length) * 100) : null,
      gradeDist: dist,
    };
  });

  return {
    className: cls.name,
    levelCode: cls.level.code,
    levelId,
    termName: term?.name ?? "",
    yearName: year?.name ?? "",
    subjects,
    mockNumbers,
    students: studentRows,
    subjectStats,
  };
}

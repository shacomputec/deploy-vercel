import { prisma } from "@/lib/prisma";
import { handle, ok } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

/**
 * GET /api/timetable/clashes?academicYearId=
 * Cross-class clash report: teacher double-bookings, duplicate subjects in a
 * day, subjects without a teacher, and classes with no timetable at all.
 */
export const GET = handle(async (req) => {
  await requirePerm("timetable", "read");
  const url = new URL(req.url);
  const academicYearId = url.searchParams.get("academicYearId") ?? undefined;

  const [entries, classes, classSubjects] = await Promise.all([
    prisma.timetableEntry.findMany({
      where: academicYearId ? { academicYearId } : {},
      include: {
        class: { select: { name: true } },
        subject: { select: { name: true } },
        teacher: { select: { fullName: true } },
      },
      orderBy: [{ day: "asc" }, { period: "asc" }],
    }),
    prisma.class.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.classSubject.findMany({
      include: { class: { select: { name: true } }, subject: { select: { name: true } }, teacher: { select: { fullName: true } } },
    }),
  ]);

  const errors: { type: string; detail: string; day?: string; period?: number }[] = [];
  const warnings: { type: string; detail: string; day?: string; period?: number }[] = [];

  // 1. Teacher double-bookings across classes (same day + period)
  const byTeacher = new Map<string, { teacher: string; slots: { day: number; period: number; class: string; subject: string }[] }>();
  for (const e of entries) {
    if (!e.teacherId) continue;
    const key = `${e.day}|${e.period}`;
    const slot = { day: e.day, period: e.period, class: e.class.name, subject: e.subject.name };
    const holder = byTeacher.get(e.teacherId);
    if (holder) {
      const clash = holder.slots.find((s) => s.day === e.day && s.period === e.period);
      if (clash) {
        errors.push({
          type: "TEACHER_CLASH",
          detail: `${e.teacher?.fullName ?? "Teacher"} teaches ${clash.subject} in ${clash.class} AND ${e.subject.name} in ${e.class.name} at ${DAY_NAMES[e.day]} Period ${e.period}.`,
          day: DAY_NAMES[e.day],
          period: e.period,
        });
        continue;
      }
      holder.slots.push(slot);
    } else {
      byTeacher.set(e.teacherId, { teacher: e.teacher?.fullName ?? "Teacher", slots: [slot] });
    }
  }

  // 2. Duplicate subject in one class on the same day (warning)
  const byClassDay = new Map<string, { day: number; class: string; subjects: Map<string, number> }>();
  for (const e of entries) {
    const key = `${e.classId}|${e.day}`;
    let holder = byClassDay.get(key);
    if (!holder) {
      holder = { day: e.day, class: e.class.name, subjects: new Map() };
      byClassDay.set(key, holder);
    }
    const count = holder.subjects.get(e.subject.name) ?? 0;
    if (count > 0) {
      warnings.push({
        type: "SUBJECT_TWICE",
        detail: `${e.subject.name} appears ${count + 1} times in ${e.class.name} on ${DAY_NAMES[e.day]}.`,
        day: DAY_NAMES[e.day],
      });
    }
    holder.subjects.set(e.subject.name, count + 1);
  }

  // 3. Subjects assigned to a class but with no teacher (warning)
  for (const cs of classSubjects) {
    if (!cs.teacherId) {
      warnings.push({
        type: "NO_TEACHER",
        detail: `${cs.subject.name} in ${cs.class.name} has no teacher assigned.`,
      });
    }
  }

  // 4. Timetable entries with no teacher (warning)
  for (const e of entries) {
    if (!e.teacherId) {
      warnings.push({
        type: "NO_TEACHER",
        detail: `${e.subject.name} in ${e.class.name} on ${DAY_NAMES[e.day]} Period ${e.period} has no teacher.`,
        day: DAY_NAMES[e.day],
        period: e.period,
      });
    }
  }

  // 5. Classes with no timetable at all (warning)
  const classesWithTimetable = new Set(entries.map((e) => e.classId));
  for (const c of classes) {
    if (!classesWithTimetable.has(c.id)) {
      warnings.push({ type: "NO_TIMETABLE", detail: `${c.name} has no timetable saved yet.` });
    }
  }

  return ok({
    errors: errors.slice(0, 50),
    warnings: warnings.slice(0, 80),
    stats: {
      classes: classes.length,
      classesWithTimetable: classesWithTimetable.size,
      lessons: entries.length,
      teacherClashes: errors.length,
    },
  });
});

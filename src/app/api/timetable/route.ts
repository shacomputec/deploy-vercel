import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok, readJson } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export const GET = handle(async (req) => {
  await requirePerm("timetable", "read");
  const url = new URL(req.url);
  const classId = url.searchParams.get("classId");
  const academicYearId = url.searchParams.get("academicYearId");
  if (!classId) throw new ApiError("classId is required");
  const rows = await prisma.timetableEntry.findMany({
    where: {
      classId,
      ...(academicYearId ? { academicYearId } : {}),
    },
    include: { subject: { select: { id: true, name: true } }, teacher: { select: { id: true, fullName: true } } },
    orderBy: [{ day: "asc" }, { period: "asc" }],
  });
  return ok(rows);
});

/**
 * Save the whole week grid for a class (replace). Body:
 * { classId, academicYearId, entries: [{ day, period, startTime, endTime, subjectId, teacherId? }] }
 *
 * Clash rules enforced here:
 *  - ERROR: a teacher booked in two different classes at the same day+period.
 *  - WARNING: the same subject appearing twice in one class on the same day.
 */
export const POST = handle(async (req) => {
  const user = await requirePerm("timetable", "update");
  const body = await readJson<{
    classId: string;
    academicYearId: string;
    entries: { day: number; period: number; startTime?: string; endTime?: string; subjectId: string; teacherId?: string | null }[];
  }>(req);
  if (!body.classId || !body.academicYearId) throw new ApiError("classId and academicYearId are required");
  if (body.entries.length > 60) throw new ApiError("Too many entries (max 60)");

  const cleaned = body.entries.map((e) => ({
    classId: body.classId,
    academicYearId: body.academicYearId,
    day: Math.min(4, Math.max(0, Math.round(Number(e.day) || 0))),
    period: Math.min(12, Math.max(1, Math.round(Number(e.period) || 1))),
    startTime: e.startTime || null,
    endTime: e.endTime || null,
    subjectId: e.subjectId,
    teacherId: e.teacherId || null,
  }));

  // ── Clash detection across ALL classes for this academic year ─────────────
  const [existing, subjects, teachers] = await Promise.all([
    prisma.timetableEntry.findMany({
      where: { academicYearId: body.academicYearId, NOT: { classId: body.classId } },
      include: { class: { select: { name: true } }, subject: { select: { name: true } }, teacher: { select: { fullName: true } } },
    }),
    prisma.subject.findMany({ select: { id: true, name: true } }),
    prisma.teacher.findMany({ select: { id: true, fullName: true } }),
  ]);
  const subjectName = (id: string) => subjects.find((s) => s.id === id)?.name ?? "?";
  const teacherName = (id: string) => teachers.find((t) => t.id === id)?.fullName ?? "?";

  const errors: string[] = [];
  const warnings: string[] = [];

  // Teacher double-bookings (incoming vs incoming)
  const seenTeacher = new Map<string, string>();
  for (const e of cleaned) {
    if (!e.teacherId) continue;
    const key = `${e.day}|${e.period}|${e.teacherId}`;
    if (seenTeacher.has(key)) {
      errors.push(`Teacher ${teacherName(e.teacherId)} is booked twice at ${DAY_NAMES[e.day]} Period ${e.period} in the same class.`);
    }
    seenTeacher.set(key, `${e.day}|${e.period}`);
  }
  // Teacher double-bookings (incoming vs other classes already saved)
  for (const e of cleaned) {
    if (!e.teacherId) continue;
    const clash = existing.find((x) => x.day === e.day && x.period === e.period && x.teacherId === e.teacherId);
    if (clash) {
      errors.push(
        `Teacher ${teacherName(e.teacherId)} is already teaching ${clash.subject.name} in ${clash.class.name} at ${DAY_NAMES[e.day]} Period ${e.period}.`
      );
    }
  }
  // Same subject twice in one class on the same day (warning)
  const daySubject = new Map<string, string>();
  for (const e of cleaned) {
    const key = `${e.day}|${e.subjectId}`;
    if (daySubject.has(key)) {
      warnings.push(`${subjectName(e.subjectId)} appears twice in this class on ${DAY_NAMES[e.day]} — check if that is intended.`);
    }
    daySubject.set(key, e.day.toString());
  }
  // Free-period gap detection: a subject occupying a later period while an earlier period in the day is empty
  const dayPeriods = new Map<number, number[]>();
  for (const e of cleaned) {
    if (!dayPeriods.has(e.day)) dayPeriods.set(e.day, []);
    dayPeriods.get(e.day)!.push(e.period);
  }
  for (const [day, periods] of dayPeriods) {
    const sorted = [...periods].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    for (let p = min; p < max; p++) {
      if (!sorted.includes(p)) {
        warnings.push(`Free period ${p} sits between lessons on ${DAY_NAMES[day]} — the class will be idle during school hours.`);
        break;
      }
    }
  }

  if (errors.length > 0) {
    throw new ApiError(`Timetable has ${errors.length} teacher clash(es): ${errors[0]}`, 409);
  }

  await prisma.$transaction([
    prisma.timetableEntry.deleteMany({ where: { classId: body.classId, academicYearId: body.academicYearId } }),
    ...cleaned.map((e) => prisma.timetableEntry.create({ data: e })),
  ]);

  await auditLog(user.id, "UPDATE", "timetable", body.classId, { entries: cleaned.length, warnings: warnings.length });
  return NextResponse.json({ ok: true, data: { saved: cleaned.length, warnings } });
});

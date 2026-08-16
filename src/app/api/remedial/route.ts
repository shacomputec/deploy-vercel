import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok, readJson } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const SESSIONS = ["MORNING", "AFTERNOON"] as const;

export const GET = handle(async (req) => {
  await requirePerm("remedial", "read");
  const url = new URL(req.url);
  const classId = url.searchParams.get("classId") ?? undefined;
  const session = url.searchParams.get("session") ?? undefined;
  const academicYearId = url.searchParams.get("academicYearId") ?? undefined;
  const rows = await prisma.remedialClass.findMany({
    where: {
      ...(classId ? { classId } : {}),
      ...(session ? { session } : {}),
      ...(academicYearId ? { academicYearId } : {}),
    },
    include: {
      class: { select: { name: true } },
      subject: { select: { name: true } },
      teacher: { select: { id: true, fullName: true } },
    },
    orderBy: [{ session: "asc" }, { day: "asc" }],
  });
  return ok(rows);
});

/** POST /api/remedial — { classId, subjectId, session, day, startTime, endTime, focus, teacherId?, academicYearId? } */
export const POST = handle(async (req) => {
  const user = await requirePerm("remedial", "update");
  const body = await readJson<{
    classId: string;
    subjectId: string;
    session: string;
    day: number;
    startTime?: string;
    endTime?: string;
    focus?: string;
    teacherId?: string | null;
    academicYearId?: string;
  }>(req);
  if (!body.classId || !body.subjectId) throw new ApiError("Class and subject are required");
  const session = SESSIONS.includes(body.session as (typeof SESSIONS)[number]) ? body.session : "MORNING";
  const day = Math.min(4, Math.max(0, Math.round(Number(body.day) || 0)));

  // A plain teacher may only schedule themselves; managers may assign anyone.
  let teacherId: string | null = body.teacherId || null;
  if (teacherId) {
    const canManage = user.role.name === "developer" || user.role.name === "super_admin" || user.role.name === "admin" || user.role.name === "headteacher" || user.role.name === "proprietor" || user.role.name === "ict_admin";
    if (!canManage) {
      const me = await prisma.teacher.findFirst({ where: { userId: user.id } }).catch(() => null);
      if (me && me.id !== teacherId) throw new ApiError("You can only schedule remedial sessions for yourself.", 403);
    }
  } else {
    // Auto-assign the teacher of this class+subject if known.
    const cs = await prisma.classSubject.findFirst({ where: { classId: body.classId, subjectId: body.subjectId } });
    teacherId = cs?.teacherId ?? null;
  }

  // ── Availability check: same teacher in another remedial session at this slot
  const [others, timetableLessons] = await Promise.all([
    prisma.remedialClass.findMany({
      where: { teacherId, session, day },
      include: { subject: { select: { name: true } }, class: { select: { name: true } }, teacher: { select: { fullName: true } } },
    }),
    teacherId
      ? prisma.timetableEntry.findMany({ where: { teacherId, day }, include: { subject: { select: { name: true } }, class: { select: { name: true } } } })
      : [],
  ]);
  if (others.length > 0) {
    const o = others[0];
    throw new ApiError(`Clash: ${o.teacher?.fullName ?? "This teacher"} already runs a ${session.toLowerCase()} remedial session (${o.subject.name} — ${o.class.name}) on ${DAY_NAMES[day]}.`, 409);
  }
  // If the remedial time overlaps the teacher's main timetable (e.g. afternoon
  // session inside school hours), warn but allow — the user may know better.
  const periodStart = timeToMinutes(body.startTime || "");
  const periodEnd = timeToMinutes(body.endTime || "");
  const overlaps = timetableLessons.filter((l) => {
    if (session === "MORNING" && (periodStart == null || periodStart >= 8 * 60)) return false; // morning is before lessons
    if (session === "AFTERNOON" && (periodEnd == null || periodEnd <= 14 * 60 + 30)) return false; // afternoon is after lessons
    return true;
  });

  const row = await prisma.remedialClass.create({
    data: {
      classId: body.classId,
      subjectId: body.subjectId,
      teacherId,
      session,
      day,
      startTime: body.startTime || null,
      endTime: body.endTime || null,
      focus: body.focus?.trim() || null,
      academicYearId: body.academicYearId || null,
    },
    include: { class: { select: { name: true } }, subject: { select: { name: true } }, teacher: { select: { fullName: true } } },
  });
  await auditLog(user.id, "CREATE", "remedial", row.id, { session, day });
  return NextResponse.json({
    ok: true,
    data: row,
    warning: overlaps.length > 0 ? `Note: this session may overlap ${overlaps.length} lesson(s) on the teacher's main timetable (${overlaps[0].subject.name} — ${overlaps[0].class.name}).` : undefined,
  }, { status: 201 });
});

function timeToMinutes(t: string): number | null {
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}


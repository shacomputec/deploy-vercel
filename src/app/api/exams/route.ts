import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok, readJson } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { assertNoExamClash } from "@/lib/exam-clash";

/** Exam timetable — Academics module. Schedule exams per class, term, subject. */
export const GET = handle(async (req) => {
  const user = await requirePerm("timetable", "read");
  const url = new URL(req.url);
  const classId = url.searchParams.get("classId");
  const termId = url.searchParams.get("termId");

  const rows = await prisma.examTimetable.findMany({
    where: {
      ...(classId ? { classId } : {}),
      ...(termId ? { termId } : {}),
    },
    include: {
      class: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true, code: true } },
      term: { select: { id: true, name: true } },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    take: 1000,
  });
  return ok(rows);
});

export const POST = handle(async (req) => {
  const user = await requirePerm("timetable", "create");
  const body = await readJson<{
    classId: string;
    subjectId: string;
    termId?: string;
    date: string;
    startTime: string;
    endTime: string;
    venue?: string;
    invigilator?: string;
    notes?: string;
  }>(req);

  if (!body.classId || !body.subjectId || !body.date) {
    throw new ApiError("Class, subject and date are required");
  }
  const date = new Date(body.date);
  if (isNaN(date.getTime())) throw new ApiError("Invalid date");

  // Reject scheduling conflicts at the API level (desktop + mobile + web).
  await assertNoExamClash({
    classId: body.classId,
    subjectId: body.subjectId,
    date,
    startTime: body.startTime?.trim() || "08:30",
    endTime: body.endTime?.trim() || "10:00",
    venue: body.venue?.trim() || null,
    invigilator: body.invigilator?.trim() || null,
  });

  const row = await prisma.examTimetable.create({
    data: {
      classId: body.classId,
      subjectId: body.subjectId,
      termId: body.termId || null,
      date,
      startTime: body.startTime?.trim() || "08:30",
      endTime: body.endTime?.trim() || "10:00",
      venue: body.venue?.trim() || null,
      invigilator: body.invigilator?.trim() || null,
      notes: body.notes?.trim() || null,
    },
  });
  await auditLog(user.id, "CREATE", "examTimetable", row.id, { classId: body.classId, subjectId: body.subjectId });
  return NextResponse.json({ ok: true, data: row }, { status: 201 });
});

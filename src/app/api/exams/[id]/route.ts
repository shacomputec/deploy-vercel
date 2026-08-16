import { prisma } from "@/lib/prisma";
import { handle, ok, readJson } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { assertNoExamClash } from "@/lib/exam-clash";

/** Update or delete a single exam timetable entry. */
export const PUT = handle(async (req, { params }) => {
  const user = await requirePerm("timetable", "update");
  const body = await readJson<{
    classId?: string;
    subjectId?: string;
    termId?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    venue?: string;
    invigilator?: string;
    notes?: string;
  }>(req);

  const data: Record<string, unknown> = {};
  if (body.classId !== undefined) data.classId = body.classId;
  if (body.subjectId !== undefined) data.subjectId = body.subjectId;
  if (body.termId !== undefined) data.termId = body.termId || null;
  if (body.date !== undefined) {
    const d = new Date(body.date);
    if (isNaN(d.getTime())) throw { status: 422, message: "Invalid date" };
    data.date = d;
  }
  if (body.startTime !== undefined) data.startTime = body.startTime;
  if (body.endTime !== undefined) data.endTime = body.endTime;
  if (body.venue !== undefined) data.venue = body.venue || null;
  if (body.invigilator !== undefined) data.invigilator = body.invigilator || null;
  if (body.notes !== undefined) data.notes = body.notes || null;

  // Reject scheduling conflicts on update too (ignore the row being edited).
  // Merge the patch with the existing row so partial updates are still checked.
  const existing = await prisma.examTimetable.findUnique({ where: { id: params.id } });
  if (!existing) throw { status: 404, message: "Exam not found" };
  await assertNoExamClash({
    excludeId: params.id,
    classId: (data.classId as string) ?? existing.classId,
    subjectId: (data.subjectId as string) ?? existing.subjectId,
    date: (data.date as Date | undefined) ?? existing.date,
    startTime: (data.startTime as string | undefined) ?? existing.startTime,
    endTime: (data.endTime as string | undefined) ?? existing.endTime,
    venue: data.venue !== undefined ? (data.venue as string | null) : existing.venue,
    invigilator: data.invigilator !== undefined ? (data.invigilator as string | null) : existing.invigilator,
  });

  const row = await prisma.examTimetable.update({ where: { id: params.id }, data });
  await auditLog(user.id, "UPDATE", "examTimetable", row.id);
  return ok(row);
});

export const DELETE = handle(async (req, { params }) => {
  const user = await requirePerm("timetable", "delete");
  await prisma.examTimetable.delete({ where: { id: params.id } });
  await auditLog(user.id, "DELETE", "examTimetable", params.id);
  return ok({ deleted: true });
});

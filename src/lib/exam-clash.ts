import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";

/** Shared exam-clash validation (server-side). Rejects a new/updated paper that
 * conflicts with an existing one: same class, same venue, same subject, or same
 * invigilator — same day with overlapping times. Mirrors the admin detector. */
export async function assertNoExamClash(params: {
  excludeId?: string;
  classId?: string;
  subjectId?: string;
  date?: Date | string;
  startTime?: string;
  endTime?: string;
  venue?: string | null;
  invigilator?: string | null;
}) {
  if (!params.date || !params.startTime || !params.endTime) return;

  const dayStart = new Date(new Date(params.date).setHours(0, 0, 0, 0));
  const dayEnd = new Date(new Date(params.date).setHours(23, 59, 59, 999));
  const sameDayRows = await prisma.examTimetable.findMany({
    where: {
      ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
      date: { gte: dayStart, lte: dayEnd },
    },
    include: { class: { select: { name: true } }, subject: { select: { name: true } } },
  });

  const mins = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const xS = mins(params.startTime);
  const xE = mins(params.endTime);
  const xv = (params.venue || "").trim().toLowerCase();
  const xi = (params.invigilator || "").trim().toLowerCase();

  for (const row of sameDayRows) {
    const yS = mins(row.startTime);
    const yE = mins(row.endTime);
    const overlaps = xS < yE && yS < xE;
    if (!overlaps) continue;
    // Same class at the same time
    if (params.classId && row.classId === params.classId) {
      throw new ApiError(
        `Clash: ${row.subject.name} is already scheduled for this class at ${row.startTime}–${row.endTime}. Adjust the time first.`,
        409
      );
    }
    // Same venue at the same time
    if (xv && (row.venue || "").trim().toLowerCase() === xv) {
      throw new ApiError(
        `Clash: venue “${row.venue}” is already booked at ${row.startTime}–${row.endTime}. Pick another venue or time.`,
        409
      );
    }
    // Same invigilator at the same time
    if (xi && (row.invigilator || "").trim().toLowerCase() === xi) {
      throw new ApiError(
        `Clash: invigilator “${row.invigilator}” is already on duty at ${row.startTime}–${row.endTime}.`,
        409
      );
    }
  }
  // Duplicate subject for the same class on the same day (even at another time)
  if (params.classId && params.subjectId) {
    const dup = sameDayRows.find(
      (row) => row.classId === params.classId && row.subjectId === params.subjectId
    );
    if (dup) {
      throw new ApiError(
        `Duplicate: ${dup.subject.name} is already scheduled for this class on this day (${dup.startTime}–${dup.endTime}).`,
        409
      );
    }
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson, ok } from "@/lib/api";
import { attendanceSchema } from "@/lib/validators";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

export const GET = handle(async (req) => {
  const user = await requirePerm("attendance", "read");
  const url = new URL(req.url);
  const classId = url.searchParams.get("classId");
  const dateStr = url.searchParams.get("date");
  if (!classId || !dateStr) throw new ApiError("classId and date are required");

  const start = new Date(dateStr);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 86400000);

  const records = await prisma.attendanceRecord.findMany({
    where: { classId, date: { gte: start, lt: end } },
  });
  return ok(records);
});

export const POST = handle(async (req) => {
  const user = await requirePerm("attendance", "create");
  const parsed = attendanceSchema.safeParse(await readJson(req));
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]!.message, 422);
  const { date, classId, records } = parsed.data;

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  await prisma.$transaction([
    prisma.attendanceRecord.deleteMany({ where: { classId, date: { gte: start, lt: new Date(start.getTime() + 86400000) } } }),
    ...records.map((r) =>
      prisma.attendanceRecord.create({
        data: { date: start, classId, studentId: r.studentId, status: r.status, note: r.note, markedById: user.id },
      })
    ),
  ]);
  await auditLog(user.id, "CREATE", "attendance", classId, { date, count: records.length });
  return NextResponse.json({ ok: true, data: { marked: records.length } }, { status: 201 });
});

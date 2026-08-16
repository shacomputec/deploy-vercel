import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok, readJson } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { findSample } from "@/lib/lesson-samples";

/** POST /api/lessons/from-sample — { key, classId, subjectId, week? } */
export const POST = handle(async (req) => {
  const user = await requirePerm("lessons", "create");
  const body = await readJson<{ key: string; classId?: string; subjectId?: string; week?: number }>(req);
  const sample = await findSample(body.key);
  if (!sample) throw new ApiError("Sample not found", 404);

  const teacher = await prisma.teacher.findFirst({ where: { userId: user.id } }).catch(() => null);
  const row = await prisma.lessonNote.create({
    data: {
      classId: body.classId || null,
      subjectId: body.subjectId || null,
      teacherId: teacher?.id ?? null,
      week: body.week ? Number(body.week) : sample.week,
      topic: sample.topic,
      objectives: sample.objectives,
      content: sample.activityMain,
      duration: sample.duration,
      resources: sample.resources,
      activityIntro: sample.activityIntro,
      activityMain: sample.activityMain,
      activityPlenary: sample.activityPlenary,
      homework: sample.homework,
      status: "DRAFT",
    },
  });
  await auditLog(user.id, "CREATE", "lessons", row.id, { topic: row.topic, source: "sample" });
  return NextResponse.json({ ok: true, data: row }, { status: 201 });
});

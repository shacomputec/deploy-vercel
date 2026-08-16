import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok, readJson } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

const STATUSES = ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"];

export const GET = handle(async (req) => {
  await requirePerm("lessons", "read");
  const url = new URL(req.url);
  const classId = url.searchParams.get("classId") ?? undefined;
  const subjectId = url.searchParams.get("subjectId") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;
  const mine = url.searchParams.get("mine") === "1";
  const rows = await prisma.lessonNote.findMany({
    where: {
      ...(classId ? { classId } : {}),
      ...(subjectId ? { subjectId } : {}),
      ...(status ? { status } : {}),
      ...(mine ? { teacher: { userId: { not: null } } } : {}),
      isSample: false,
    },
    orderBy: { createdAt: "desc" },
    take: 300,
    include: {
      class: { select: { name: true } },
      subject: { select: { id: true, name: true } },
      teacher: { select: { fullName: true, staffId: true } },
      reviewedBy: { select: { fullName: true } },
    },
  });
  return ok(rows);
});

export const POST = handle(async (req) => {
  const user = await requirePerm("lessons", "create");
  const body = await readJson<{
    classId?: string;
    subjectId?: string;
    topic: string;
    week?: number;
    objectives?: string;
    content?: string;
    duration?: string;
    resources?: string;
    activityIntro?: string;
    activityMain?: string;
    activityPlenary?: string;
    homework?: string;
  }>(req);
  if (!body.topic?.trim()) throw new ApiError("Topic is required");
  // Resolve the Teacher record for this user (teacherId references Teacher, not User)
  const teacher = await prisma.teacher.findFirst({ where: { userId: user.id } }).catch(() => null);
  const row = await prisma.lessonNote.create({
    data: {
      classId: body.classId || null,
      subjectId: body.subjectId || null,
      teacherId: teacher?.id ?? null,
      week: body.week ? Number(body.week) : null,
      topic: body.topic.trim(),
      objectives: body.objectives?.trim() || null,
      content: body.content?.trim() || null,
      duration: body.duration?.trim() || null,
      resources: body.resources?.trim() || null,
      activityIntro: body.activityIntro?.trim() || null,
      activityMain: body.activityMain?.trim() || null,
      activityPlenary: body.activityPlenary?.trim() || null,
      homework: body.homework?.trim() || null,
      status: "DRAFT",
    },
  });
  await auditLog(user.id, "CREATE", "lessons", row.id, { topic: row.topic });
  return NextResponse.json({ ok: true, data: row }, { status: 201 });
});

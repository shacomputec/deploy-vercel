import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok, readJson } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

export const GET = handle(async (req) => {
  await requirePerm("homework", "read");
  const url = new URL(req.url);
  const classId = url.searchParams.get("classId") ?? undefined;
  const subjectId = url.searchParams.get("subjectId") ?? undefined;
  const rows = await prisma.homework.findMany({
    where: { ...(classId ? { classId } : {}), ...(subjectId ? { subjectId } : {}) },
    orderBy: { createdAt: "desc" },
    take: 300,
    include: {
      class: { select: { name: true } },
      subject: { select: { name: true } },
    },
  });
  return ok(rows);
});

export const POST = handle(async (req) => {
  const user = await requirePerm("homework", "create");
  const body = await readJson<{ classId: string; subjectId: string; title: string; description?: string; dueDate?: string }>(req);
  if (!body.classId || !body.subjectId || !body.title?.trim()) {
    throw new ApiError("Class, subject and title are required");
  }
  const row = await prisma.homework.create({
    data: {
      classId: body.classId,
      subjectId: body.subjectId,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      assignedById: user.id,
    },
  });
  await auditLog(user.id, "CREATE", "homework", row.id, { title: row.title });
  return NextResponse.json({ ok: true, data: row }, { status: 201 });
});

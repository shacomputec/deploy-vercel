import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok, readJson } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

/**
 * GES SHS programmes / courses — each programme (General Science, General
 * Arts, Business, …) carries its own subject set (core + electives). Attaching
 * a class to a programme defines that class's curriculum.
 *
 * GET  /api/programmes                        → list with subjects + classes
 * POST /api/programmes                        → { name, code?, description?,
 *                                                subjectIds, coreSubjectIds? }
 * POST /api/programmes/apply                  → { classId, programmeId } —
 *                                                attaches the class and replaces
 *                                                its ClassSubject links with the
 *                                                programme's subjects
 */
export const GET = handle(async () => {
  await requirePerm("subjects", "read");
  const programmes = await prisma.programme.findMany({
    orderBy: { name: "asc" },
    include: {
      subjects: { include: { subject: true }, orderBy: { isCore: "desc" } },
      classes: { select: { id: true, name: true } },
    },
  });
  return ok(programmes);
});

export const POST = handle(async (req) => {
  const user = await requirePerm("subjects", "manage");
  const body = await readJson<{
    name?: string;
    code?: string;
    description?: string;
    levelId?: string;
    subjectIds?: string[];
    coreSubjectIds?: string[];
  }>(req);
  if (!body.name?.trim()) throw new ApiError("Programme name is required");
  const subjectIds = Array.isArray(body.subjectIds) ? [...new Set(body.subjectIds)] : [];
  if (!subjectIds.length) throw new ApiError("Pick at least one subject for the programme");

  const shsLevel = await prisma.level.findUnique({ where: { code: "SHS" } });
  const levelId = body.levelId || shsLevel?.id;
  if (!levelId) throw new ApiError("SHS level not found");
  const valid = await prisma.subject.findMany({ where: { id: { in: subjectIds } }, select: { id: true } });
  if (valid.length !== subjectIds.length) throw new ApiError("Some subject ids are invalid");

  const core = new Set(body.coreSubjectIds ?? []);
  const programme = await prisma.programme.create({
    data: {
      name: body.name.trim(),
      code: body.code?.trim() || null,
      description: body.description?.trim() || null,
      levelId,
      subjects: {
        create: subjectIds.map((sid) => ({ subjectId: sid, isCore: core.has(sid) })),
      },
    },
    include: { subjects: { include: { subject: true } } },
  });
  await auditLog(user.id, "CREATE", "subjects", programme.id, { programme: programme.name, subjects: subjectIds.length });
  return NextResponse.json({ ok: true, data: programme }, { status: 201 });
});

/** Apply a programme to a class: attach it and sync the class's subjects. */
export const PUT = handle(async (req) => {
  const user = await requirePerm("subjects", "manage");
  const body = await readJson<{ classId?: string; programmeId?: string }>(req);
  if (!body.classId || !body.programmeId) throw new ApiError("classId and programmeId are required");

  const [cls, programme] = await Promise.all([
    prisma.class.findUnique({ where: { id: body.classId }, include: { level: true } }),
    prisma.programme.findUnique({ where: { id: body.programmeId }, include: { subjects: true } }),
  ]);
  if (!cls) throw new ApiError("Class not found", 404);
  if (!programme) throw new ApiError("Programme not found", 404);
  if (cls.level.code !== "SHS") throw new ApiError("Only SHS classes can use a programme", 400);

  await prisma.$transaction(async (tx) => {
    await tx.classSubject.deleteMany({ where: { classId: cls.id } });
    await tx.classSubject.createMany({
      data: programme.subjects.map((s) => ({ classId: cls.id, subjectId: s.subjectId })),
    });
    await tx.class.update({ where: { id: cls.id }, data: { programmeId: programme.id } });
  });

  await auditLog(user.id, "UPDATE", "classes", cls.id, {
    programme: programme.name,
    subjects: programme.subjects.length,
  });
  return ok({ classId: cls.id, programmeId: programme.id, subjects: programme.subjects.length });
});

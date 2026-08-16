import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson, ok } from "@/lib/api";
import { teacherSchema } from "@/lib/validators";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

export const GET = handle(async (req, { params }) => {
  await requirePerm("teachers", "read");
  const teacher = await prisma.teacher.findUnique({ where: { id: params.id } });
  if (!teacher) throw new ApiError("Teacher not found", 404);
  return ok(teacher);
});

export const PUT = handle(async (req, { params }) => {
  const user = await requirePerm("teachers", "update");
  const parsed = teacherSchema.partial().safeParse(await readJson(req));
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]!.message, 422);
  const d = parsed.data;
  const dateKeys = new Set(["dateOfBirth", "dateOfFirstAppointment", "dateOfLastPromotion", "datePosted"]);
  const numKeys = new Set(["yearCompleted", "teachingPeriodsPerWeek"]);
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(d)) {
    if (v === undefined) continue;
    if (dateKeys.has(k)) data[k] = v ? new Date(v as string) : null;
    else if (numKeys.has(k)) data[k] = typeof v === "number" ? v : null;
    else data[k] = v === "" ? null : v;
  }
  const teacher = await prisma.teacher.update({ where: { id: params.id }, data });
  await auditLog(user.id, "UPDATE", "teachers", teacher.id);
  return ok(teacher);
});

export const DELETE = handle(async (req, { params }) => {
  const user = await requirePerm("teachers", "delete");
  await prisma.teacher.delete({ where: { id: params.id } });
  await auditLog(user.id, "DELETE", "teachers", params.id);
  return ok({ deleted: true });
});

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson, ok } from "@/lib/api";
import { parentSchema } from "@/lib/validators";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

export const PUT = handle(async (req, { params }) => {
  const user = await requirePerm("parents", "update");
  const parsed = parentSchema.partial().safeParse(await readJson(req));
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]!.message, 422);
  const parent = await prisma.parent.update({ where: { id: params.id }, data: parsed.data });
  await auditLog(user.id, "UPDATE", "parents", parent.id);
  return ok(parent);
});

export const DELETE = handle(async (req, { params }) => {
  const user = await requirePerm("parents", "delete");
  await prisma.parent.delete({ where: { id: params.id } });
  await auditLog(user.id, "DELETE", "parents", params.id);
  return ok({ deleted: true });
});

/** Link a parent to a student (studentId in body). */
export const POST = handle(async (req, { params }) => {
  const user = await requirePerm("parents", "update");
  const body = (await req.json()) as { studentId?: string };
  if (!body.studentId) throw new ApiError("studentId is required");
  const link = await prisma.studentParent.create({
    data: { parentId: params.id, studentId: body.studentId, isPrimary: true },
  });
  await auditLog(user.id, "LINK", "parents", params.id, { studentId: body.studentId });
  return ok(link, { status: 201 });
});

import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok, readJson } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

export const PUT = handle(async (req, { params }) => {
  const user = await requirePerm("homework", "update");
  const body = await readJson<{ title?: string; description?: string; dueDate?: string }>(req);
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description ?? null;
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  const row = await prisma.homework.update({ where: { id: params.id }, data });
  await auditLog(user.id, "UPDATE", "homework", row.id);
  return ok(row);
});

export const DELETE = handle(async (req, { params }) => {
  const user = await requirePerm("homework", "delete");
  await prisma.homework.delete({ where: { id: params.id } });
  await auditLog(user.id, "DELETE", "homework", params.id);
  return ok({ deleted: true });
});

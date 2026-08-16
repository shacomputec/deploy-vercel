import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok, readJson } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

export const PUT = handle(async (req, { params }) => {
  const user = await requirePerm("expenses", "update");
  const body = await readJson<{ title?: string; amount?: number; category?: string; date?: string; note?: string }>(req);
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.amount !== undefined) data.amount = Number(body.amount);
  if (body.category !== undefined) data.category = body.category || null;
  if (body.date !== undefined) data.date = new Date(body.date);
  if (body.note !== undefined) data.note = body.note || null;
  const row = await prisma.expense.update({ where: { id: params.id }, data });
  await auditLog(user.id, "UPDATE", "expenses", row.id);
  return ok(row);
});

export const DELETE = handle(async (req, { params }) => {
  const user = await requirePerm("expenses", "delete");
  await prisma.expense.delete({ where: { id: params.id } });
  await auditLog(user.id, "DELETE", "expenses", params.id);
  return ok({ deleted: true });
});

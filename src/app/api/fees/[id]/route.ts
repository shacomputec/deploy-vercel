import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson, ok } from "@/lib/api";
import { feeSchema } from "@/lib/validators";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

export const PUT = handle(async (req, { params }) => {
  const user = await requirePerm("fees", "update");
  const parsed = feeSchema.partial().safeParse(await readJson(req));
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]!.message, 422);
  const d = parsed.data;
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(d)) if (v !== undefined) data[k] = v;
  const fee = await prisma.feeItem.update({ where: { id: params.id }, data });
  await auditLog(user.id, "UPDATE", "fees", fee.id);
  return ok(fee);
});

export const DELETE = handle(async (req, { params }) => {
  const user = await requirePerm("fees", "delete");
  await prisma.feeItem.delete({ where: { id: params.id } });
  await auditLog(user.id, "DELETE", "fees", params.id);
  return ok({ deleted: true });
});

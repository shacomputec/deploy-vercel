import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson, ok } from "@/lib/api";
import { staffSchema } from "@/lib/validators";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

export const PUT = handle(async (req, { params }) => {
  const user = await requirePerm("staff", "update");
  const parsed = staffSchema.partial().safeParse(await readJson(req));
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]!.message, 422);
  const d = parsed.data;
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(d)) if (v !== undefined) data[k] = v === "" ? null : v;
  const staff = await prisma.staff.update({ where: { id: params.id }, data });
  await auditLog(user.id, "UPDATE", "staff", staff.id);
  return ok(staff);
});

export const DELETE = handle(async (req, { params }) => {
  const user = await requirePerm("staff", "delete");
  await prisma.staff.delete({ where: { id: params.id } });
  await auditLog(user.id, "DELETE", "staff", params.id);
  return ok({ deleted: true });
});

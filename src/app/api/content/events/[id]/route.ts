import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson, ok } from "@/lib/api";
import { eventSchema } from "@/lib/validators";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

export const PUT = handle(async (req, { params }) => {
  const user = await requirePerm("content", "update");
  const parsed = eventSchema.partial().safeParse(await readJson(req));
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]!.message, 422);
  const d = parsed.data;
  const item = await prisma.eventItem.update({
    where: { id: params.id },
    data: {
      ...d,
      startDate: d.startDate ? new Date(d.startDate) : undefined,
      endDate: d.endDate ? new Date(d.endDate) : null,
    },
  });
  await auditLog(user.id, "UPDATE", "content.events", item.id);
  return ok(item);
});

export const DELETE = handle(async (req, { params }) => {
  const user = await requirePerm("content", "delete");
  await prisma.eventItem.delete({ where: { id: params.id } });
  await auditLog(user.id, "DELETE", "content.events", params.id);
  return ok({ deleted: true });
});

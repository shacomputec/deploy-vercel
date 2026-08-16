import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson, ok } from "@/lib/api";
import { newsSchema } from "@/lib/validators";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

export const PUT = handle(async (req, { params }) => {
  const user = await requirePerm("content", "update");
  const parsed = newsSchema.partial().safeParse(await readJson(req));
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]!.message, 422);
  const d = parsed.data;
  const item = await prisma.newsItem.update({
    where: { id: params.id },
    data: {
      ...d,
      publishedAt:
        d.published === true ? new Date() : undefined,
    },
  });
  await auditLog(user.id, "UPDATE", "content.news", item.id);
  return ok(item);
});

export const DELETE = handle(async (req, { params }) => {
  const user = await requirePerm("content", "delete");
  await prisma.newsItem.delete({ where: { id: params.id } });
  await auditLog(user.id, "DELETE", "content.news", params.id);
  return ok({ deleted: true });
});

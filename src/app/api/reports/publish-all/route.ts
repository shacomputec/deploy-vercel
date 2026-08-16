import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { notifyRoleInApp } from "@/lib/notify";

export const POST = handle(async (req) => {
  const user = await requirePerm("reports", "publish");
  const body = (await req.json()) as { classId?: string; termId?: string; published?: boolean };
  if (!body.classId || !body.termId) throw new ApiError("classId and termId are required");

  const result = await prisma.reportCard.updateMany({
    where: { classId: body.classId, termId: body.termId },
    data: { published: body.published ?? false },
  });
  await auditLog(user.id, body.published ? "PUBLISH_ALL" : "UNPUBLISH_ALL", "reports", body.classId, {
    count: result.count,
  });
  if (body.published && result.count > 0) {
    const klass = await prisma.class.findUnique({ where: { id: body.classId }, select: { name: true } });
    await notifyRoleInApp(
      ["admin", "super_admin", "headteacher"],
      "Report cards published",
      `${result.count} report cards published for ${klass?.name ?? "class"} — students and parents can now view them.`,
      "success",
      "/admin/reports",
    );
  }
  return NextResponse.json({ ok: true, data: { updated: result.count } });
});

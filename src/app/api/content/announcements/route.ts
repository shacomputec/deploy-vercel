import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson, ok } from "@/lib/api";
import { announcementSchema } from "@/lib/validators";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { getActiveSchoolId } from "@/lib/school";

export const GET = handle(async () => {
  await requirePerm("content", "read");
  const schoolId = await getActiveSchoolId();
  const items = await prisma.announcement.findMany({ where: { schoolId }, orderBy: { createdAt: "desc" } });
  return ok(items);
});

export const POST = handle(async (req) => {
  const user = await requirePerm("content", "create");
  const schoolId = await getActiveSchoolId();
  const parsed = announcementSchema.safeParse(await readJson(req));
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]!.message, 422);
  const d = parsed.data;
  const item = await prisma.announcement.create({
    data: { schoolId, title: d.title, body: d.body || null, priority: d.priority ?? "NORMAL", published: d.published ?? true },
  });
  await auditLog(user.id, "CREATE", "content.announcements", item.id, { title: item.title });
  return NextResponse.json({ ok: true, data: item }, { status: 201 });
});

export const PUT = handle(async (req) => {
  const user = await requirePerm("content", "update");
  const body = (await req.json()) as { id: string; title?: string; body?: string | null; priority?: string; published?: boolean };
  if (!body.id) throw new ApiError("id is required");
  const item = await prisma.announcement.update({
    where: { id: body.id },
    data: { title: body.title, body: body.body, priority: body.priority, published: body.published },
  });
  await auditLog(user.id, "UPDATE", "content.announcements", item.id);
  return ok(item);
});

export const DELETE = handle(async (req) => {
  const user = await requirePerm("content", "delete");
  const body = (await req.json()) as { id: string };
  await prisma.announcement.delete({ where: { id: body.id } });
  await auditLog(user.id, "DELETE", "content.announcements", body.id);
  return ok({ deleted: true });
});

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson, ok } from "@/lib/api";
import { gallerySchema } from "@/lib/validators";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { getActiveSchoolId } from "@/lib/school";

export const GET = handle(async () => {
  await requirePerm("content", "read");
  const schoolId = await getActiveSchoolId();
  const items = await prisma.galleryImage.findMany({ where: { schoolId }, orderBy: { sortOrder: "asc" } });
  return ok(items);
});

export const POST = handle(async (req) => {
  const user = await requirePerm("content", "create");
  const schoolId = await getActiveSchoolId();
  const parsed = gallerySchema.safeParse(await readJson(req));
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]!.message, 422);
  const count = await prisma.galleryImage.count({ where: { schoolId } });
  const item = await prisma.galleryImage.create({
    data: { schoolId, title: parsed.data.title || null, url: parsed.data.url, caption: parsed.data.caption || null, sortOrder: count + 1 },
  });
  await auditLog(user.id, "CREATE", "content.gallery", item.id);
  return NextResponse.json({ ok: true, data: item }, { status: 201 });
});

export const PUT = handle(async (req) => {
  const user = await requirePerm("content", "update");
  const body = (await req.json()) as { id: string; title?: string; url?: string; caption?: string; sortOrder?: number };
  if (!body.id) throw new ApiError("id is required");
  const item = await prisma.galleryImage.update({
    where: { id: body.id },
    data: { title: body.title, url: body.url, caption: body.caption, sortOrder: body.sortOrder },
  });
  await auditLog(user.id, "UPDATE", "content.gallery", item.id);
  return ok(item);
});

export const DELETE = handle(async (req) => {
  const user = await requirePerm("content", "delete");
  const body = (await req.json()) as { id: string };
  await prisma.galleryImage.delete({ where: { id: body.id } });
  await auditLog(user.id, "DELETE", "content.gallery", body.id);
  return ok({ deleted: true });
});

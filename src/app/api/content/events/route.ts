import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson, ok } from "@/lib/api";
import { eventSchema } from "@/lib/validators";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { getActiveSchoolId } from "@/lib/school";

export const GET = handle(async () => {
  await requirePerm("content", "read");
  const schoolId = await getActiveSchoolId();
  const items = await prisma.eventItem.findMany({ where: { schoolId }, orderBy: { startDate: "desc" } });
  return ok(items);
});

export const POST = handle(async (req) => {
  const user = await requirePerm("content", "create");
  const schoolId = await getActiveSchoolId();
  const parsed = eventSchema.safeParse(await readJson(req));
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]!.message, 422);
  const d = parsed.data;
  const item = await prisma.eventItem.create({
    data: {
      schoolId,
      title: d.title,
      description: d.description || null,
      location: d.location || null,
      startDate: new Date(d.startDate),
      endDate: d.endDate ? new Date(d.endDate) : null,
      coverImage: d.coverImage || null,
      published: d.published ?? true,
    },
  });
  await auditLog(user.id, "CREATE", "content.events", item.id, { title: item.title });
  return NextResponse.json({ ok: true, data: item }, { status: 201 });
});

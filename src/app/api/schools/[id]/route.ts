import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok, readJson } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { clearSchoolCache } from "@/lib/school";
import { schoolSchema } from "@/lib/validators";

export const PUT = handle(async (req, { params }) => {
  const user = await requirePerm("settings", "update");
  const parsed = schoolSchema.safeParse(await readJson(req));
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]!.message, 422);

  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) data[k] = v === "" ? null : v;
  }
  const school = await prisma.school.update({ where: { id: params.id }, data });
  clearSchoolCache();
  await auditLog(user.id, "UPDATE", "schools", school.id, { fields: Object.keys(data) });
  return ok(school);
});

export const DELETE = handle(async (req, { params }) => {
  const user = await requirePerm("settings", "update");
  if (params.id === "main") throw new ApiError("The main school profile cannot be deleted.", 403);
  const active = await prisma.setting.findUnique({ where: { key: "activeSchoolId" } });
  if (active?.value === params.id) throw new ApiError("Deactivate this school first (switch to another).", 400);
  // Remove the school and all content scoped to it (content rows store
  // schoolId as a plain scalar, so no FK cascade exists).
  await prisma.$transaction([
    prisma.newsItem.deleteMany({ where: { schoolId: params.id } }),
    prisma.eventItem.deleteMany({ where: { schoolId: params.id } }),
    prisma.announcement.deleteMany({ where: { schoolId: params.id } }),
    prisma.galleryImage.deleteMany({ where: { schoolId: params.id } }),
    prisma.videoItem.deleteMany({ where: { schoolId: params.id } }),
    prisma.downloadFile.deleteMany({ where: { schoolId: params.id } }),
    prisma.school.delete({ where: { id: params.id } }),
  ]);
  clearSchoolCache();
  await auditLog(user.id, "DELETE", "schools", params.id);
  return ok({ deleted: true });
});

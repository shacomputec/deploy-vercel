import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok, readJson } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { clearSchoolCache, getFreeSchoolLimit } from "@/lib/school";
import { schoolSchema } from "@/lib/validators";

export const GET = handle(async (req) => {
  const user = await requirePerm("settings", "read");
  const [schools, active, freeSchoolLimit] = await Promise.all([
    prisma.school.findMany({ orderBy: { name: "asc" } }),
    prisma.setting.findUnique({ where: { key: "activeSchoolId" } }),
    getFreeSchoolLimit(),
  ]);
  void user;
  return ok({ schools, activeSchoolId: active?.value || "main", freeSchoolLimit });
});

/** Create a new school profile. Data rows (content) are scoped by schoolId. */
export const POST = handle(async (req) => {
  const user = await requirePerm("settings", "update");
  const parsed = schoolSchema.safeParse(await readJson(req));
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]!.message, 422);

  const d = parsed.data;
  const id = (d.name ?? "school").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24) || "school";
  const existing = await prisma.school.findUnique({ where: { id } });
  if (existing) throw new ApiError("A school with this name already exists (id conflict).", 409);

  // Free schools are capped at the configured limit — every school beyond it
  // must be purchased (the UI routes those through the payment popup; this
  // guard stops direct API calls from bypassing the payment).
  const [count, freeSchoolLimit] = await Promise.all([prisma.school.count(), getFreeSchoolLimit()]);
  if (count >= freeSchoolLimit) {
    throw new ApiError(
      `Your ${freeSchoolLimit} included schools are used. Additional schools are purchased separately — use the "Purchase this school" flow.`,
      402
    );
  }

  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(d)) {
    if (v !== undefined && k !== "id") data[k] = v === "" ? null : v;
  }
  const school = await prisma.school.create({ data: { id, ...data, name: d.name! } });
  await auditLog(user.id, "CREATE", "schools", school.id, { name: school.name });
  return NextResponse.json({ ok: true, data: school }, { status: 201 });
});

/** Switch which school the site + admin content currently use. */
export const PUT = handle(async (req) => {
  const user = await requirePerm("settings", "update");
  const body = await readJson<{ activeSchoolId?: string }>(req);
  if (!body.activeSchoolId) throw new ApiError("activeSchoolId is required");
  const school = await prisma.school.findUnique({ where: { id: body.activeSchoolId } });
  if (!school) throw new ApiError("School not found", 404);

  await prisma.setting.upsert({
    where: { key: "activeSchoolId" },
    update: { value: body.activeSchoolId },
    create: { key: "activeSchoolId", value: body.activeSchoolId },
  });
  clearSchoolCache();
  await auditLog(user.id, "UPDATE", "schools", body.activeSchoolId, { action: "activate" });
  return ok({ activeSchoolId: body.activeSchoolId, school });
});

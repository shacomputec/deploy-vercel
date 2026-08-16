import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok, readJson } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { clearSettingsCache } from "@/lib/settings";

const KEY = "idCardBuilder";

/** GET /api/settings/id-card-builder → { value: string | null } (raw JSON). */
export const GET = handle(async () => {
  await requirePerm("settings", "read");
  const row = await prisma.setting.findUnique({ where: { key: KEY } });
  return ok({ value: row?.value ?? null });
});

/** PUT /api/settings/id-card-builder — body: { design: IdCardDesign } */
export const PUT = handle(async (req) => {
  const user = await requirePerm("settings", "update");
  const body = await readJson<{ design: unknown }>(req);
  if (!body.design || typeof body.design !== "object") throw new ApiError("A design object is required");
  const value = JSON.stringify(body.design);
  await prisma.setting.upsert({ where: { key: KEY }, update: { value }, create: { key: KEY, value } });
  clearSettingsCache();
  await auditLog(user.id, "UPDATE", "settings", undefined, { key: KEY });
  return NextResponse.json({ ok: true });
});

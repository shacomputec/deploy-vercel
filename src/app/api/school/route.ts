import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson, ok } from "@/lib/api";
import { schoolSchema } from "@/lib/validators";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { clearSchoolCache, getSchool } from "@/lib/school";
import { clearSchoolTypeCache } from "@/lib/school-type";

export const GET = handle(async () => {
  await requirePerm("school", "read");
  // Return the ACTIVE school — in multi-school deployments the whole site
  // (name, motto, colours, content) follows the active profile.
  const school = await getSchool();
  return ok(school);
});

export const PUT = handle(async (req) => {
  const user = await requirePerm("school", "update");
  const parsed = schoolSchema.safeParse(await readJson(req));
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]!.message, 422);
  const d = parsed.data;

  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(d)) {
    if (v !== undefined) data[k] = v === "" ? null : v;
  }
  // Developer contact is fixed by the system developer — never editable via API.
  delete data.developerName;
  delete data.developerPhone;
  delete data.developerEmail;

  const school = await prisma.school.upsert({
    where: { id: "main" },
    update: data,
    create: { id: "main", name: d.name ?? "School" },
  });
  clearSchoolCache();
  clearSchoolTypeCache(); // school-type switches re-gate nav + pickers immediately
  await auditLog(user.id, "UPDATE", "school", school.id, { fields: Object.keys(data) });
  return ok(school);
});

import { handle, ApiError, ok, readJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";

const requireDeveloper = async () => {
  const user = await getCurrentUser();
  if (!user) throw { status: 401, message: "Authentication required" };
  if (user.role.name !== "developer") throw { status: 403, message: "Developer only" };
  return user;
};

/** Normalise a school code the way license keys embed it (A–Z, 0–9). */
function normalizeSchoolCode(code: string): string {
  return (code || "main").toUpperCase().replace(/[^A-Z0-9]/g, "") || "MAIN";
}

export type VendorSchoolRow = {
  id: string;
  licenseCode: string;
  name: string;
  district: string | null;
  region: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  paymentStatus: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  locked: boolean;
  licenseState: string; // TRIAL | ACTIVE | SUSPENDED | EXPIRED | NONE
  issuanceCount: number;
  lastIssuedAt: string | null;
};

/**
 * GET /api/dev/schools — the developer's school directory.
 * Every school the developer has sold to (or registered), each with its
 * current lock state, license status and payment status — so the developer can
 * lock ONE school from a district-style list when a buyer fails to pay.
 */
export const GET = handle(async () => {
  await requireDeveloper();
  const [schools, lockSettings, licenses, issuances] = await Promise.all([
    prisma.vendorSchool.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.setting.findMany({ where: { key: { startsWith: "lock.school." } }, select: { key: true, value: true } }),
    prisma.license.findMany({ select: { schoolId: true, status: true } }),
    prisma.licenseIssuance.groupBy({ by: ["schoolId"], _count: { _all: true }, _max: { createdAt: true } }),
  ]);

  const lockMap = new Map(lockSettings.map((s) => [s.key.replace(/^lock\.school\./, ""), s.value]));
  const licMap = new Map<string, string>();
  for (const l of licenses) {
    const code = normalizeSchoolCode(l.schoolId);
    if (!licMap.has(code)) licMap.set(code, l.status);
  }
  const issMap = new Map(issuances.map((g) => [normalizeSchoolCode(g.schoolId), g]));

  const rows: VendorSchoolRow[] = schools.map((s) => ({
    id: s.id,
    licenseCode: s.licenseCode,
    name: s.name,
    district: s.district,
    region: s.region,
    contactEmail: s.contactEmail,
    contactPhone: s.contactPhone,
    paymentStatus: s.paymentStatus,
    notes: s.notes,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    locked: lockMap.get(s.licenseCode) === "true",
    licenseState: licMap.get(s.licenseCode) ?? "NONE",
    issuanceCount: issMap.get(s.licenseCode)?._count._all ?? 0,
    lastIssuedAt: issMap.get(s.licenseCode)?._max.createdAt?.toISOString() ?? null,
  }));
  return ok(rows);
});

/**
 * POST /api/dev/schools — register (or update) a school in the directory.
 * Body: { licenseCode, name, district?, region?, contactEmail?, contactPhone?, paymentStatus?, notes? }
 */
export const POST = handle(async (req) => {
  const user = await requireDeveloper();
  const body = await readJson<{
    licenseCode: string;
    name: string;
    district?: string;
    region?: string;
    contactEmail?: string;
    contactPhone?: string;
    paymentStatus?: string;
    notes?: string;
  }>(req);
  const code = normalizeSchoolCode(body.licenseCode);
  if (!body.name?.trim()) throw new ApiError("School name is required.", 422);
  const payment = ["FULL", "PARTIAL", "UNPAID"].includes(body.paymentStatus ?? "") ? (body.paymentStatus as string) : "UNPAID";

  const school = await prisma.vendorSchool.upsert({
    where: { licenseCode: code },
    create: {
      licenseCode: code,
      name: body.name.trim(),
      district: body.district?.trim() || null,
      region: body.region?.trim() || null,
      contactEmail: body.contactEmail?.trim() || null,
      contactPhone: body.contactPhone?.trim() || null,
      paymentStatus: payment,
      notes: body.notes?.trim() || null,
    },
    update: {
      name: body.name.trim(),
      district: body.district?.trim() ?? undefined,
      region: body.region?.trim() ?? undefined,
      contactEmail: body.contactEmail?.trim() ?? undefined,
      contactPhone: body.contactPhone?.trim() ?? undefined,
      paymentStatus: payment,
      notes: body.notes?.trim() ?? undefined,
    },
  });
  await auditLog(user.id, "REGISTER_SCHOOL", "vendor", school.id, { licenseCode: code, name: school.name });
  return ok({ id: school.id, licenseCode: school.licenseCode, name: school.name, paymentStatus: school.paymentStatus });
});

/**
 * PATCH /api/dev/schools — update payment status / contact / notes for a school.
 * Body: { id, paymentStatus?, contactEmail?, contactPhone?, notes? }
 */
export const PATCH = handle(async (req) => {
  const user = await requireDeveloper();
  const body = await readJson<{ id: string; paymentStatus?: string; contactEmail?: string; contactPhone?: string; notes?: string }>(req);
  const existing = await prisma.vendorSchool.findUnique({ where: { id: body.id } });
  if (!existing) throw new ApiError("School not found.", 404);
  const payment = body.paymentStatus !== undefined ? (["FULL", "PARTIAL", "UNPAID"].includes(body.paymentStatus) ? body.paymentStatus : existing.paymentStatus) : existing.paymentStatus;

  const updated = await prisma.vendorSchool.update({
    where: { id: body.id },
    data: {
      paymentStatus: payment,
      contactEmail: body.contactEmail !== undefined ? (body.contactEmail.trim() || null) : undefined,
      contactPhone: body.contactPhone !== undefined ? (body.contactPhone.trim() || null) : undefined,
      notes: body.notes !== undefined ? (body.notes.trim() || null) : undefined,
    },
  });
  await auditLog(user.id, "UPDATE_SCHOOL", "vendor", updated.id, { licenseCode: updated.licenseCode, paymentStatus: payment });
  return ok({ id: updated.id, paymentStatus: updated.paymentStatus });
});

/**
 * DELETE /api/dev/schools — remove a school from the directory (does NOT touch
 * its lock or license — it just stops appearing in the list).
 */
export const DELETE = handle(async (req) => {
  const user = await requireDeveloper();
  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? "";
  const existing = await prisma.vendorSchool.findUnique({ where: { id } });
  if (!existing) throw new ApiError("School not found.", 404);
  await prisma.vendorSchool.delete({ where: { id } });
  await auditLog(user.id, "DELETE_SCHOOL", "vendor", existing.id, { licenseCode: existing.licenseCode });
  return ok({ deleted: true });
});

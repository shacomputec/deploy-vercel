import { handle, ok, readJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { setSetting } from "@/lib/settings";
import { auditLog } from "@/lib/audit";
import { getSystemGate, getThisSchoolId } from "@/lib/system-gate";
import { prisma } from "@/lib/prisma";

const requireDeveloper = async () => {
  const user = await getCurrentUser();
  if (!user) throw { status: 401, message: "Authentication required" };
  if (user.role.name !== "developer") throw { status: 403, message: "Developer only" };
  return user;
};

/** Normalise a school code the way license keys embed it (A–Z, 0–9). */
function normalizeCode(code: string): string {
  return (code || "main").toUpperCase().replace(/[^A-Z0-9]/g, "") || "MAIN";
}

/**
 * GET — the current gate plus every school code that is currently locked.
 * Locking is PER-SCHOOL: the developer targets one license code (the SCHOOLID
 * embedded in that school's license key), so paid schools are never locked
 * when one buyer misbehaves.
 */
export const GET = handle(async () => {
  await requireDeveloper();
  const gate = await getSystemGate();
  const locked = await prisma.setting.findMany({
    where: { key: { startsWith: "lock.school." }, value: "true" },
    select: { key: true },
  });
  const codes = locked.map((s) => s.key.replace(/^lock\.school\./, ""));
  return ok({ gate, lockedSchools: codes, thisSchool: gate.schoolId });
});

/**
 * POST — lock / unlock ONE school by its license code.
 * Body: { schoolId?: string, locked: boolean, message?: string }
 *   schoolId defaults to the current installation's own code.
 */
export const POST = handle(async (req) => {
  const user = await requireDeveloper();
  const body = await readJson<{ schoolId?: string; locked: boolean; message?: string }>(req);
  const code = body.schoolId ? normalizeCode(body.schoolId) : await getThisSchoolId();

  await Promise.all([
    setSetting(`lock.school.${code}`, body.locked ? "true" : "false"),
    setSetting(`lock.school.${code}.message`, body.locked ? body.message?.trim() || "" : ""),
  ]);
  await auditLog(user.id, body.locked ? "LOCK_SCHOOL" : "UNLOCK_SCHOOL", "system", code, {
    locked: body.locked,
    schoolId: code,
  });
  return ok({ gate: await getSystemGate(), lockedSchools: body.locked ? [code] : [], target: code });
});

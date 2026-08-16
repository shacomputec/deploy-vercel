import { NextResponse } from "next/server";
import { handle, ok, readJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { setSetting } from "@/lib/settings";
import { auditLog } from "@/lib/audit";
import { getSystemGate } from "@/lib/system-gate";

const requireDeveloper = async () => {
  const user = await getCurrentUser();
  if (!user) throw { status: 401, message: "Authentication required" };
  if (user.role.name !== "developer") throw { status: 403, message: "Developer only" };
  return user;
};

/** GET — read the current terms (developer console). */
export const GET = handle(async () => {
  await requireDeveloper();
  return ok(await getSystemGate());
});

/** PUT — publish a new version of the Terms & Conditions (forces re-acceptance). */
export const PUT = handle(async (req) => {
  const user = await requireDeveloper();
  const body = await readJson<{ version: string; content: string }>(req);
  if (!body.version?.trim()) throw { status: 422, message: "A version is required" };
  if (!body.content?.trim()) throw { status: 422, message: "Terms text cannot be empty" };
  await Promise.all([
    setSetting("terms.version", body.version.trim()),
    setSetting("terms.content", body.content.trim()),
  ]);
  await auditLog(user.id, "PUBLISH_TERMS", "terms", body.version.trim(), { version: body.version.trim() });
  return NextResponse.json({ ok: true, data: { gate: await getSystemGate() } }, { status: 201 });
});

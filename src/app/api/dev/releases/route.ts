import { NextResponse } from "next/server";
import { handle, ok, readJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getSetting, setSetting } from "@/lib/settings";
import { auditLog } from "@/lib/audit";

const requireDeveloper = async () => {
  const user = await getCurrentUser();
  if (!user) throw { status: 401, message: "Authentication required" };
  if (user.role.name !== "developer") throw { status: 403, message: "Developer only" };
  return user;
};

export type Release = { version: string; title: string; notes: string[]; date: string };

async function getReleases(): Promise<Release[]> {
  const raw = await getSetting("releases.v1");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** GET — every developer-published release (newest first). */
export const GET = handle(async () => {
  await requireDeveloper();
  return ok(await getReleases());
});

/** POST — publish a release; it appears in the in-app What's New changelog. */
export const POST = handle(async (req) => {
  const user = await requireDeveloper();
  const body = await readJson<{ version: string; title: string; notes: string }>(req);
  if (!body.version?.trim() || !body.title?.trim() || !body.notes?.trim()) {
    throw { status: 422, message: "Version, title and notes are required" };
  }
  const list = await getReleases();
  const release: Release = {
    version: body.version.trim(),
    title: body.title.trim(),
    notes: body.notes
      .split("\n")
      .map((n) => n.replace(/^[•\-\*]\s*/, "").trim())
      .filter(Boolean),
    date: new Date().toISOString(),
  };
  const next = [release, ...list.filter((r) => r.version !== release.version)];
  await setSetting("releases.v1", JSON.stringify(next));
  await auditLog(user.id, "PUBLISH_RELEASE", "releases", release.version, { title: release.title });
  return NextResponse.json({ ok: true, data: release }, { status: 201 });
});

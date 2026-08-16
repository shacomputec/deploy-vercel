import { handle, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import type { Release } from "@/app/api/dev/releases/route";

/** The developer-published changelog — merged into the What's New page. */
export const GET = handle(async () => {
  const user = await getCurrentUser();
  if (!user) throw { status: 401, message: "Authentication required" };
  const raw = await getSetting("releases.v1");
  let releases: Release[] = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) releases = parsed;
    } catch {
      releases = [];
    }
  }
  return ok(releases);
});

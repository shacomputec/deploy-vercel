import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { TOUR_KEYS_SET, parseTourList } from "@/lib/tours-meta";

function parseMap(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(obj)) if (typeof v === "string" && TOUR_KEYS_SET.has(k)) out[k] = v;
      return out;
    }
  } catch {
    /* ignore */
  }
  return {};
}

/**
 * Per-user first-run tour flags. Storing the "seen" state on the User record
 * means a tour dismissed on the desktop does not reappear on the phone or the
 * Windows app — the flag follows the account, not the browser.
 *
 *   GET    /api/portal/tours            → { tours, completed, enabled }
 *   POST   /api/portal/tours            body { key, status?: "completed" | "dismissed" }
 *   DELETE /api/portal/tours?key=...    → clear the flag (re-enable the tour)
 *   GET    /api/portal/tours/stats      → per-tour completion analytics (admins)
 */

export const GET = handle(async () => {
  const user = await getCurrentUser();
  if (!user) throw new ApiError("Authentication required", 401);
  const setting = await prisma.setting.findUnique({ where: { key: "tours.enabled" } });
  const enabled = setting?.value !== "0";
  return ok({
    tours: parseTourList(user.toursSeen),
    completed: parseTourList(user.toursCompleted),
    enabled,
  });
});

export const POST = handle(async (req) => {
  const user = await getCurrentUser();
  if (!user) throw new ApiError("Authentication required", 401);
  const body = await readJson<{ key?: string; status?: string }>(req);
  const key = String(body?.key ?? "");
  if (!TOUR_KEYS_SET.has(key)) throw new ApiError("Unknown tour key.", 422);
  const status = body?.status === "completed" ? "completed" : "dismissed";

  let seen = parseTourList(user.toursSeen);
  let completed = parseTourList(user.toursCompleted);

  if (!seen.includes(key)) seen.push(key);
  // Finished tours count as completed; dismissing one again demotes it back to
  // plain "dismissed" so the analytics stay truthful.
  if (status === "completed") {
    if (!completed.includes(key)) completed.push(key);
  } else {
    completed = completed.filter((k) => k !== key);
  }

  // Timestamp the interaction so adoption trends (this week vs last week)
  // can be computed in /api/portal/tours/stats.
  const takenAt = parseMap(user.toursTakenAt);
  takenAt[key] = new Date().toISOString();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      toursSeen: JSON.stringify(seen),
      toursCompleted: JSON.stringify(completed),
      toursTakenAt: JSON.stringify(takenAt),
    },
  });

  return ok({ tours: seen, completed });
});

export const DELETE = handle(async (req) => {
  const user = await getCurrentUser();
  if (!user) throw new ApiError("Authentication required", 401);
  const url = new URL(req.url);
  const key = url.searchParams.get("key") ?? "";
  if (!TOUR_KEYS_SET.has(key)) throw new ApiError("Unknown tour key.", 422);

  const seen = parseTourList(user.toursSeen).filter((k) => k !== key);
  const completed = parseTourList(user.toursCompleted).filter((k) => k !== key);
  const takenAt = parseMap(user.toursTakenAt);
  delete takenAt[key];
  await prisma.user.update({
    where: { id: user.id },
    data: {
      toursSeen: JSON.stringify(seen),
      toursCompleted: JSON.stringify(completed),
      toursTakenAt: JSON.stringify(takenAt),
    },
  });
  return ok({ tours: seen, completed });
});

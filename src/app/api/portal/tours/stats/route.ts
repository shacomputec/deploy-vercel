import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { TOUR_KEYS, TOUR_META, parseTourList } from "@/lib/tours-meta";

/**
 * Analytics: how many accounts have seen / completed each first-run tour,
 * plus adoption trends (taken this week vs last week — a tour is "taken"
 * whenever the user dismissed or finished it, timestamped in toursTakenAt).
 * Visible to administrators (the dashboard "Tours" card) and the developer.
 *
 *   GET /api/portal/tours/stats
 */

function parseMap(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(obj)) if (typeof v === "string") out[k] = v;
      return out;
    }
  } catch {
    /* ignore */
  }
  return {};
}

/** Monday 00:00 of the current week (school weeks start Monday in Ghana). */
function mondayOf(now: Date): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - day);
  return d;
}

export const GET = handle(async () => {
  const user = await getCurrentUser();
  if (!user) throw new ApiError("Authentication required", 401);
  if (!["super_admin", "admin", "headteacher", "developer"].includes(user.role.name)) {
    throw new ApiError("Admins only.", 403);
  }

  const users = await prisma.user.findMany({
    select: { toursSeen: true, toursCompleted: true, toursTakenAt: true },
  });

  const now = new Date();
  const thisMonday = mondayOf(now).getTime();
  const lastMonday = mondayOf(new Date(thisMonday - 1)).getTime();

  const stats = Object.fromEntries(
    TOUR_KEYS.map((key) => [
      key,
      { seen: 0, completed: 0, takenThisWeek: 0, takenLastWeek: 0, lastTakenAt: null as string | null },
    ])
  ) as Record<string, { seen: number; completed: number; takenThisWeek: number; takenLastWeek: number; lastTakenAt: string | null }>;

  for (const u of users) {
    const seen = new Set(parseTourList(u.toursSeen));
    const completed = new Set(parseTourList(u.toursCompleted));
    const takenAt = parseMap(u.toursTakenAt);
    for (const key of TOUR_KEYS) {
      if (seen.has(key)) stats[key].seen++;
      if (completed.has(key)) stats[key].completed++;
      const ts = takenAt[key] ? new Date(takenAt[key]).getTime() : 0;
      if (ts) {
        if (ts >= thisMonday) stats[key].takenThisWeek++;
        else if (ts >= lastMonday) stats[key].takenLastWeek++;
        if (!stats[key].lastTakenAt || ts > new Date(stats[key].lastTakenAt).getTime()) {
          stats[key].lastTakenAt = takenAt[key];
        }
      }
    }
  }

  const totals = { thisWeek: 0, lastWeek: 0 };
  for (const key of TOUR_KEYS) {
    totals.thisWeek += stats[key].takenThisWeek;
    totals.lastWeek += stats[key].takenLastWeek;
  }

  return ok({
    stats,
    totals,
    totalUsers: users.length,
    meta: TOUR_META,
  });
});

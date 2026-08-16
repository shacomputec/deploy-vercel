/**
 * Shared metadata for the first-run tours — used by the server API routes
 * (/api/portal/tours and /api/portal/tours/stats). Kept OUT of the route
 * files because Next.js route handlers may only export HTTP methods.
 */

export const TOUR_KEYS = [
  "smis-firstrun-tour-v1",
  "smis-teacher-tour-v1",
  "smis-parent-tour-v1",
  "smis-student-tour-v1",
] as const;

export type TourKey = (typeof TOUR_KEYS)[number];

export const TOUR_META: Record<TourKey, { label: string; page: string }> = {
  "smis-firstrun-tour-v1": { label: "Admin setup tour", page: "/admin?tour=1" },
  "smis-teacher-tour-v1": { label: "Teacher tour", page: "/portal/teacher?tour=1" },
  "smis-parent-tour-v1": { label: "Parent tour", page: "/portal/parent?tour=1" },
  "smis-student-tour-v1": { label: "Student tour", page: "/portal/student?tour=1" },
};

export const TOUR_KEYS_SET = new Set<string>(TOUR_KEYS);

export function parseTourList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((k) => typeof k === "string") : [];
  } catch {
    return [];
  }
}

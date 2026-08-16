import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";
import type { School } from "@prisma/client";

/** Default number of school profiles included in the purchase. The developer
 * can change it via the Developer Console (`license.freeSchools` setting). */
export const DEFAULT_FREE_SCHOOL_LIMIT = 3;

/** How many school profiles are included for free; every school beyond that
 * (the 4th, 5th, …) must be bought separately via the payment popup
 * (POST /api/schools/purchase). Shared by the schools API (enforcement) and
 * the Schools page (free-vs-purchase UI). */
export async function getFreeSchoolLimit(): Promise<number> {
  const raw = await getSetting("schools.freeLimit");
  const n = parseInt(raw ?? "", 10);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_FREE_SCHOOL_LIMIT;
}

let cache: { school: School | null; expiresAt: number } | null = null;
// Short TTL keeps admin school switches near-instant. In multi-process/cluster
// deployments each process holds its own cache, so a switch propagates within
// one TTL — call clearSchoolCache() after any write (done in the schools API).
const TTL = 15_000;

/**
 * Returns the active school profile. Multi-school deployments create several
 * School rows and switch the active one via the `activeSchoolId` setting — the
 * whole site (name, motto, colours, content) follows the active school.
 */
export async function getSchool(): Promise<School | null> {
  if (cache && cache.expiresAt > Date.now()) return cache.school;
  const setting = await prisma.setting.findUnique({ where: { key: "activeSchoolId" } });
  const school = await prisma.school.findUnique({
    where: { id: setting?.value || "main" },
  });
  cache = { school, expiresAt: Date.now() + TTL };
  return school;
}

/** Id of the currently active school ("main" by default). */
export async function getActiveSchoolId(): Promise<string> {
  const setting = await prisma.setting.findUnique({ where: { key: "activeSchoolId" } });
  return setting?.value || "main";
}

/** `{ schoolId }` filter to scope content queries to the active school. */
export async function schoolWhere(): Promise<{ schoolId: string }> {
  return { schoolId: await getActiveSchoolId() };
}

export function clearSchoolCache() {
  cache = null;
}

/** "#047857" -> "4 120 87" (RGB triplet for use with rgb(var(--x) / alpha)). */
export function hexToRgbTriplet(hex?: string | null): string {
  if (!hex) return "4 120 87";
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return "4 120 87";
  return `${parseInt(m[1]!, 16)} ${parseInt(m[2]!, 16)} ${parseInt(m[3]!, 16)}`;
}

/** Lighten an RGB triplet by mixing toward white. */
function lighten(triplet: string, amount: number): string {
  return triplet
    .split(" ")
    .map((v) => Math.round(+v + (255 - +v) * amount))
    .join(" ");
}

/** Build the :root CSS variable block that themes the whole site. */
export function themeVars(school: School | null): string {
  const primary = hexToRgbTriplet(school?.primaryColor);
  const accent = hexToRgbTriplet(school?.accentColor);
  return `:root{--c-primary:${primary};--c-primary-soft:${lighten(primary, 0.82)};--c-accent:${accent};--c-accent-soft:${lighten(accent, 0.82)};}`;
}

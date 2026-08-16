// ============================================================================
// School-type engine — the platform runs TWO management engines from one code
// base: BASIC (Creche · KG · Primary · JHS — SBA/BECE logic) and SHS
// (SHS 1–3 — programmes/courses, electives, WASSCE logic). The active school
// profile stores `schoolType` (BASIC | SHS | BOTH); every module, level and
// picker checks it so irrelevant features never appear.
// ============================================================================
import { prisma } from "@/lib/prisma";
import { clearSchoolCache, getSchool } from "@/lib/school";

export type SchoolType = "BASIC" | "SHS" | "BOTH";

export const SCHOOL_TYPES: { value: SchoolType; label: string; icon: string; desc: string }[] = [
  {
    value: "BASIC",
    label: "Basic School",
    icon: "🏫",
    desc: "Creche · KG · Primary · JHS — SBA, BECE and promotion focused.",
  },
  {
    value: "SHS",
    label: "Senior High School",
    icon: "🎓",
    desc: "SHS 1 · SHS 2 · SHS 3 — programmes/courses, electives and WASSCE.",
  },
  {
    value: "BOTH",
    label: "Basic + SHS",
    icon: "🏛️",
    desc: "A combined school running both the Basic and Senior High engines.",
  },
];

let typeCache: { type: SchoolType; expiresAt: number } | null = null;
const TTL = 15_000;

/** The active school's type (BASIC | SHS | BOTH). Defaults to BOTH. */
export async function getSchoolType(): Promise<SchoolType> {
  if (typeCache && typeCache.expiresAt > Date.now()) return typeCache.type;
  const school = await getSchool();
  const raw = school?.schoolType ?? "BOTH";
  const type: SchoolType = raw === "BASIC" || raw === "SHS" ? raw : "BOTH";
  typeCache = { type, expiresAt: Date.now() + TTL };
  return type;
}

export function clearSchoolTypeCache() {
  typeCache = null;
  clearSchoolCache();
}

/** Does this school type include the BASIC (non-SHS) engine? */
export function includesBasic(type: SchoolType): boolean {
  return type === "BASIC" || type === "BOTH";
}

/** Does this school type include the SHS engine? */
export function includesSHS(type: SchoolType): boolean {
  return type === "SHS" || type === "BOTH";
}

/** Should a level (by code) be visible in pickers for this school type? */
export function levelVisible(levelCode: string, type: SchoolType): boolean {
  if (levelCode === "SHS") return includesSHS(type);
  return includesBasic(type);
}

/** Should a class (by its level code) be visible? */
export function classVisible(levelCode: string, type: SchoolType): boolean {
  return levelVisible(levelCode, type);
}

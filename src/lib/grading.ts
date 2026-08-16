import { prisma } from "@/lib/prisma";

type GradeRow = { min: number; max: number; grade: string; points: number | null; remark: string | null };

const cache = new Map<string, { rows: GradeRow[]; expiresAt: number }>();
const TTL = 60_000;

export async function getScalesForLevel(levelId: string): Promise<GradeRow[]> {
  const hit = cache.get(levelId);
  if (hit && hit.expiresAt > Date.now()) return hit.rows;
  const scales = await prisma.gradingScale.findMany({
    where: { levelId },
    orderBy: { min: "desc" },
  });
  const rows = scales.map((s) => ({
    min: s.min,
    max: s.max,
    grade: s.grade,
    points: s.points,
    remark: s.remark,
  }));
  cache.set(levelId, { rows, expiresAt: Date.now() + TTL });
  return rows;
}

export function clearGradingCache() {
  cache.clear();
}

export type GradeResult = {
  grade: string;
  percent: number;
  points: number | null;
  remark: string | null;
  passed: boolean;
};

export async function gradeForPercent(levelId: string, percent: number): Promise<GradeResult> {
  const scales = await getScalesForLevel(levelId);
  // Round to the nearest whole mark (Ghanaian practice) so fractional scores
  // like 49.5 never fall into the gaps between integer scale boundaries.
  const p = Math.round(Math.max(0, Math.min(100, percent)));
  const row =
    scales.find((s) => p >= s.min && p <= s.max) ??
    scales[scales.length - 1] ?? {
      min: 0,
      max: 100,
      grade: "NS",
      points: null,
      remark: "Needs Support",
    };
  // "Fail" is the bottom grade: 9 (BECE/JHS), F or F9 (WASSCE/SHS), NS (primary)
  const failed = row.grade === "9" || row.grade === "F" || row.grade === "F9" || row.grade === "NS";
  return { ...row, percent: p, passed: !failed };
}

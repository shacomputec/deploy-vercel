// ============================================================================
// Ghanaian School-Based Assessment (SBA) component sheet
// ----------------------------------------------------------------------------
// The SBA for a subject is built from five components — class work, project
// work, class test, practicals and homework. Each component is entered as a
// mark out of its max (default 100). Components are normalised to 0–100 and
// combined with the configured weights (default 20% each, i.e. a simple
// average) so the SBA total is always on a 0–100 scale.
//
// The report card then shows:
//   Class Exercise (50%) = SBA total ÷ 2   (or the level's SBA weight)
//   End-of-Term Exam (50%) = exam score ÷ 2 (or the level's exam weight)
//   Total = the two halves summed (0–100)
// ============================================================================
import { prisma } from "@/lib/prisma";
import { getSettingJSON, setSetting, clearSettingsCache } from "@/lib/settings";

export const SBA_COMPONENTS = ["classWork", "projectWork", "classTest", "practicals", "homework"] as const;
export type SbaComponent = (typeof SBA_COMPONENTS)[number];

export type SbaWeights = Record<SbaComponent, number>;

export const SBA_DEFAULTS: SbaWeights = {
  classWork: 20,
  projectWork: 20,
  classTest: 20,
  practicals: 20,
  homework: 20,
};

export const SBA_LABELS: Record<SbaComponent, string> = {
  classWork: "Class Work",
  projectWork: "Project Work",
  classTest: "Class Test",
  practicals: "Practicals",
  homework: "Homework",
};

/** Weights from Settings (key `sba.weights`), falling back to equal 20% each. */
export async function getSbaWeights(): Promise<SbaWeights> {
  const saved = await getSettingJSON<SbaWeights | null>("sba.weights", null);
  const w: SbaWeights = { ...SBA_DEFAULTS };
  if (saved && typeof saved === "object") {
    for (const k of SBA_COMPONENTS) {
      const v = Number((saved as Record<string, unknown>)[k]);
      if (Number.isFinite(v) && v >= 0 && v <= 100) w[k] = v;
    }
  }
  return w;
}

export async function saveSbaWeights(weights: SbaWeights): Promise<SbaWeights> {
  const clean: SbaWeights = { ...SBA_DEFAULTS };
  for (const k of SBA_COMPONENTS) {
    const v = Number(weights[k]);
    clean[k] = Number.isFinite(v) && v >= 0 && v <= 100 ? v : SBA_DEFAULTS[k];
  }
  await setSetting("sba.weights", JSON.stringify(clean));
  clearSettingsCache();
  return clean;
}

export type SbaComponentValues = {
  classWork?: number | null;
  projectWork?: number | null;
  classTest?: number | null;
  practicals?: number | null;
  homework?: number | null;
};

/**
 * Weighted SBA total on a 0–100 scale. Components that are blank are skipped
 * and the remaining weights are renormalised, so partial entry still yields a
 * fair percentage. Returns null when no component has a value.
 */
export function computeSbaTotal(rec: SbaComponentValues, weights: SbaWeights): number | null {
  let sum = 0;
  let weightSum = 0;
  for (const k of SBA_COMPONENTS) {
    const v = rec[k];
    if (v === null || v === undefined || Number.isNaN(Number(v))) continue;
    const score = Math.max(0, Math.min(100, Number(v)));
    sum += score * weights[k];
    weightSum += weights[k];
  }
  if (weightSum === 0) return null;
  return Math.round((sum / weightSum) * 100) / 100;
}

/** Sum of a student's subject SBA totals — the "Aggregate" column of the sheet. */
export function aggregateTotals(
  totals: (number | null | undefined)[]
): number | null {
  const vals = totals.filter((t): t is number => t !== null && t !== undefined);
  if (!vals.length) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) * 100) / 100;
}

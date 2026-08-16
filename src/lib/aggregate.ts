// ============================================================================
// GES aggregate computation — shared by the master sheet and mock analysis.
// ----------------------------------------------------------------------------
// JHS (BECE): the aggregate is the sum of the student's BEST 6 subjects'
// grade points (grade 1 = highest … grade 9 = lowest) → best 6, worst 54.
// SHS (WASSCE): the four core subjects (English Language, Core Mathematics,
// Mathematics, Integrated Science, Social Studies) plus the BEST 2 electives,
// summed grade points (A+ = 1 … F = 9) → best 6, worst 36.
// Primary/KG report cards do not use aggregates.
// ============================================================================

export const SHS_CORE = [
  "English Language",
  "Core Mathematics",
  "Mathematics",
  "Integrated Science",
  "Social Studies",
] as const;

export type AggregateRow = {
  subject: string;
  points: number | null; // null when the subject has no marks / grade yet
};

export type AggregateResult = {
  aggregate: number | null; // null when the level isn't aggregated or too few subjects assessed
  maxAggregate: number;
  used: string[]; // subject names that made the aggregate
  isCore: boolean[]; // parallel to `used`: true for core-subject slots (SHS)
};

/** Sum of the best `count` grade points (lower is better). */
function bestN(rows: AggregateRow[], count: number): { sum: number; used: string[] } {
  const scored = rows.filter((r) => r.points !== null) as { subject: string; points: number }[];
  const best = scored
    .slice()
    .sort((a, b) => a.points - b.points)
    .slice(0, count);
  return { sum: best.reduce((a, r) => a + r.points, 0), used: best.map((r) => r.subject) };
}

export function computeAggregate(levelCode: string, rows: AggregateRow[]): AggregateResult {
  const none: AggregateResult = { aggregate: null, maxAggregate: 0, used: [], isCore: [] };
  if (levelCode === "JHS") {
    const { sum, used } = bestN(rows, 6);
    // A BECE aggregate needs at least 6 subjects actually assessed.
    if (used.length < 6) return none;
    return { aggregate: sum, maxAggregate: 54, used, isCore: used.map(() => false) };
  }
  if (levelCode === "SHS") {
    const core = rows.filter((r) => (SHS_CORE as readonly string[]).includes(r.subject));
    const electives = rows.filter((r) => !(SHS_CORE as readonly string[]).includes(r.subject));
    const coreScored = core.filter((r) => r.points !== null);
    if (coreScored.length < 4) return none;
    const coreSum = coreScored.reduce((a, r) => a + (r.points as number), 0);
    const { sum: elecSum, used: elecUsed } = bestN(electives, 2);
    if (elecUsed.length < 2) return none;
    const used = [...coreScored.map((r) => r.subject), ...elecUsed];
    return {
      aggregate: coreSum + elecSum,
      maxAggregate: 36,
      used,
      isCore: used.map((s) => (SHS_CORE as readonly string[]).includes(s)),
    };
  }
  return none;
}

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Transient/security tables that must never leave the machine they belong to.
const EXCLUDE = new Set(["OtpRequest"]);

const camel = (s: string) => s[0].toLowerCase() + s.slice(1);

/**
 * Export every table (except transient auth codes) as a plain-JSON snapshot.
 * This is the cloud side of the two-way sync: the desktop app downloads it and
 * imports it into the local SQLite database (scripts/sync-db.mjs import).
 */
export async function exportSnapshot() {
  const models = Prisma.dmmf.datamodel.models.filter((m) => !EXCLUDE.has(m.name));
  const modelsOut: Record<string, unknown[]> = {};
  let total = 0;
  for (const m of models) {
    const rows = await (prisma as any)[camel(m.name)].findMany();
    modelsOut[m.name] = rows;
    total += rows.length;
  }
  return { format: "ges-mis-sync-v1", exportedAt: new Date().toISOString(), total, models: modelsOut };
}

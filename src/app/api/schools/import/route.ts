import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok, readJson } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { clearSchoolCache, getFreeSchoolLimit } from "@/lib/school";
import * as XLSX from "xlsx";

/**
 * Minimal CSV parser — handles quoted fields (commas inside quotes) and
 * escaped double quotes. No dependency needed for a school-profile import.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field); field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

/** Normalise a school name into its row id (slug) — mirrors POST /api/schools. */
function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24) || "school";
}

const HEADERS = ["name", "shortname", "motto", "phone", "email", "address", "district", "region"];

const CSV_TEMPLATE = [
  "name,shortName,motto,phone,email,address,district,region",
  "Kumasi International School,KIS,Knowledge Integrity Excellence,+233 32 200 0000,info@kis.edu.gh,Adum,Ashanti Region,Ashanti",
  "Accra Academy,ACC,Truth and Merit,+233 30 200 0000,office@accraacademy.edu.gh,Accra New Town,Greater Accra,Greater Accra",
].join("\n");

const TEMPLATE_HEADERS = [
  "name", "shortName", "motto", "phone", "email", "address", "district", "region",
].join(",");

/** GET — the CSV/XLSX import template (download this, fill it in, re-upload). */
export const GET = handle(async (req) => {
  await requirePerm("settings", "read");
  void req;
  return new NextResponse(CSV_TEMPLATE, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="schools-import-template.csv"' },
  });
});

/** Convert an XLSX/XLS file (base64) into the same array-of-arrays shape as
 * parseCsv — first row is the header. SheetJS does the heavy lifting. */
function parseXlsx(base64: string): string[][] {
  const wb = XLSX.read(Buffer.from(base64, "base64"), { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new ApiError("The workbook has no sheets.", 422);
  const aoa = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "" }) as string[][];
  return aoa.map((r) => r.map((c) => String(c ?? "")));
}

type ImportRow = Record<string, string>;

/** POST — bulk-create school profiles from CSV text or an XLSX file. Free
 * slots are used first; any school beyond the free-school limit is reported as
 * `requiresPurchase` and NOT created (the payment popup handles those). */
export const POST = handle(async (req) => {
  const user = await requirePerm("settings", "update");
  const body = await readJson<{ csv?: string; xlsxBase64?: string }>(req);
  const rows = body.xlsxBase64 ? parseXlsx(body.xlsxBase64) : body.csv?.trim() ? parseCsv(body.csv) : null;
  if (!rows) throw new ApiError("No file content provided — paste CSV text or upload an Excel file.", 422);
  if (rows.length < 2) throw new ApiError("The file needs a header row and at least one school.", 422);

  // Header → index map (case-insensitive).
  const headerRow = rows[0].map((h) => h.trim().toLowerCase().replace(/[\s-]+/g, ""));
  const idx: Record<string, number> = {};
  headerRow.forEach((h, i) => { idx[h] = i; });
  for (const h of HEADERS) {
    if (!(h in idx)) throw new ApiError(`Missing column "${h}" — use the downloadable template.`, 422);
  }
  const cell = (row: string[], h: string): string => String(row[idx[h]] ?? "").trim();

  const [limit, existingAll] = await Promise.all([getFreeSchoolLimit(), prisma.school.findMany({ select: { id: true } })]);
  const existingIds = new Set(existingAll.map((s) => s.id));

  const created: string[] = [];
  const requiresPurchase: string[] = [];
  const duplicates: string[] = [];
  const invalid: string[] = [];

  const dataRows = rows.slice(1);
  for (const row of dataRows) {
    const name = cell(row, "name");
    if (!name) { invalid.push("(no name)"); continue; }
    const id = slugify(name);
    if (existingIds.has(id)) { duplicates.push(name); continue; }
    if (existingIds.size >= limit) { requiresPurchase.push(name); continue; }

    await prisma.school.create({
      data: {
        id,
        name,
        shortName: cell(row, "shortname") || null,
        motto: cell(row, "motto") || null,
        phone: cell(row, "phone") || null,
        email: cell(row, "email") || null,
        address: cell(row, "address") || null,
        district: cell(row, "district") || null,
        region: cell(row, "region") || null,
      },
    });
    existingIds.add(id);
    created.push(name);
  }

  clearSchoolCache();
  await auditLog(user.id, "CREATE", "schools.import", user.id, {
    created: created.length,
    requiresPurchase: requiresPurchase.length,
    duplicates: duplicates.length,
    invalid: invalid.length,
  });

  return ok({
    created,
    requiresPurchase,
    duplicates,
    invalid,
    freeSchoolLimit: limit,
    summary: {
      created: created.length,
      requiresPurchase: requiresPurchase.length,
      duplicates: duplicates.length,
      invalid: invalid.length,
    },
    template: TEMPLATE_HEADERS,
  });
});

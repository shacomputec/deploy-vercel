// ============================================================================
// Shared spreadsheet I/O — CSV/XLSX parsing and CSV serialization
// ----------------------------------------------------------------------------
// Used by every import/export route so the parsers behave identically:
// - results/upload (per-assessment scores)
// - assessments/sba import/export (SBA component sheet)
// - assessments/marksheet export (class mark sheet)
// - reports export (report summary)
// ============================================================================
import ExcelJS from "exceljs";

/** Simple CSV parser (handles quoted fields, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      row.push(cur);
      cur = "";
    } else if (ch === "\n" || ch === "\r") {
      if (cur || row.length) {
        row.push(cur);
        rows.push(row);
      }
      row = [];
      cur = "";
      if (ch === "\r" && text[i + 1] === "\n") i++;
    } else cur += ch;
  }
  if (cur || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** Parse an .xlsx workbook into rows of strings (first sheet only). */
export async function parseXlsx(buffer: ArrayBuffer): Promise<string[][]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const rows: string[][] = [];
  ws.eachRow((row) => {
    const values = row.values as unknown[];
    rows.push(values.slice(1).map((v) => (v === undefined || v === null ? "" : String(v))));
  });
  return rows;
}

/** Accepts a File and returns rows + which format it was. Throws on bad types. */
export async function readSpreadsheet(file: File): Promise<{ rows: string[][]; format: "csv" | "xlsx" }> {
  if (file.size > 5_000_000) throw new Error("File too large (max 5MB)");
  const isCsv = /\.csv$/i.test(file.name);
  const isXlsx = /\.xlsx?$/i.test(file.name);
  if (!isCsv && !isXlsx) throw new Error("Only .csv or .xlsx files are supported");
  const rows = isCsv ? parseCsv(await file.text()) : await parseXlsx(await file.arrayBuffer());
  return { rows, format: isCsv ? "csv" : "xlsx" };
}

/** Quote a single CSV cell per RFC 4180. */
export function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Serialize rows to a CSV string (UTF-8 BOM included for Excel). */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\n");
}

/** Build a spreadsheet body (CSV text or XLSX workbook) + filename for a download route. */
export async function buildSpreadsheet(opts: {
  rows: (string | number | null | undefined)[][];
  filename: string;
  format?: "csv" | "xlsx";
}): Promise<{ data: Blob; filename: string; contentType: string }> {
  const format = opts.format === "xlsx" ? "xlsx" : "csv";
  if (format === "csv") {
    return {
      data: new Blob([toCsv(opts.rows)], { type: "text/csv; charset=utf-8" }),
      filename: `${opts.filename}.csv`,
      contentType: "text/csv; charset=utf-8",
    };
  }
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Sheet1");
  ws.addRows(opts.rows as (string | number)[][]);
  const buf = (await wb.xlsx.writeBuffer()) as unknown as ArrayBuffer;
  return {
    data: new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename: `${opts.filename}.xlsx`,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}

// ============================================================================
// Minimal dependency-free PDF writer — A4 portrait receipts.
// ----------------------------------------------------------------------------
// The project deliberately has no PDF library (report cards print via the
// browser); email attachments need a real PDF file, so this tiny writer emits
// a valid single-page PDF using the built-in Helvetica core fonts. It is
// intentionally small, deterministic and free of any external dependency.
// ============================================================================

const PAGE_W = 595.28; // A4 portrait (points)
const PAGE_H = 841.89;

type Rgb = [number, number, number];

const INK: Rgb = [0.09, 0.12, 0.16];
const MUTED: Rgb = [0.45, 0.5, 0.56];
const GREEN: Rgb = [0.05, 0.55, 0.33];
const WHITE: Rgb = [1, 1, 1];
const DARK: Rgb = [0.08, 0.1, 0.14];

/** Escape PDF string literals and strip anything outside Latin-1. */
function esc(s: string): string {
  let out = "";
  for (const ch of s.normalize("NFKD")) {
    const code = ch.codePointAt(0)!;
    if (code > 0xff) continue; // drop non-Latin-1 (e.g. ₵ — we always print "GHS")
    if (ch === "\\" || ch === "(" || ch === ")") {
      out += "\\" + ch;
    } else {
      out += ch;
    }
  }
  return out;
}

/** Rough Helvetica advance width (≈0.5em average) — enough for right-align. */
function textWidth(text: string, size: number): number {
  return [...text].reduce((w, ch) => {
    const code = ch.codePointAt(0)!;
    if (code > 0xff) return w + size * 0.5;
    // Fairly accurate widths for the characters receipts actually use.
    const n = ch.toLowerCase();
    if ("iljt".includes(n)) return w + size * 0.28;
    if ("mw".includes(n)) return w + size * 0.75;
    if (ch === " " || ch === "," || ch === ".") return w + size * 0.28;
    if (ch >= "0" && ch <= "9") return w + size * 0.56;
    return w + size * 0.5;
  }, 0);
}

type Op =
  | { kind: "text"; x: number; y: number; text: string; size: number; bold?: boolean; color?: Rgb; align?: "left" | "right" | "center" }
  | { kind: "rect"; x: number; y: number; w: number; h: number; fill: Rgb }
  | { kind: "line"; x1: number; y1: number; x2: number; y2: number; color?: Rgb; width?: number };

function renderOps(ops: Op[]): string {
  const lines: string[] = [];
  for (const op of ops) {
    if (op.kind === "text") {
      const font = op.bold ? "/F2" : "/F1";
      const [r, g, b] = op.color ?? INK;
      let x = op.x;
      const w = textWidth(op.text, op.size);
      if (op.align === "right") x = op.x - w;
      else if (op.align === "center") x = op.x - w / 2;
      lines.push("BT");
      lines.push(`${font} ${op.size} Tf`);
      lines.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`);
      lines.push(`${x.toFixed(2)} ${op.y.toFixed(2)} Td`);
      lines.push(`(${esc(op.text)}) Tj`);
      lines.push("ET");
    } else if (op.kind === "rect") {
      const [r, g, b] = op.fill;
      lines.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`);
      lines.push(`${op.x.toFixed(2)} ${op.y.toFixed(2)} ${op.w.toFixed(2)} ${op.h.toFixed(2)} re f`);
    } else {
      const [r, g, b] = op.color ?? MUTED;
      lines.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG`);
      lines.push(`${(op.width ?? 1).toFixed(2)} w`);
      lines.push(`${op.x1.toFixed(2)} ${op.y1.toFixed(2)} m`);
      lines.push(`${op.x2.toFixed(2)} ${op.y2.toFixed(2)} l S`);
    }
  }
  return lines.join("\n");
}

function assemble(objects: string[]): Buffer {
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefStart = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

export type ReceiptPdfData = {
  schoolName: string;
  reference: string;
  amount: string; // already formatted, e.g. "GHS 50.00"
  method: string; // e.g. "Paystack (card / mobile money)"
  date: string;
  purpose: string;
  status: string; // SUCCESS | PENDING | FAILED | EXPIRED
  developerName?: string | null;
  developerPhone?: string | null;
  developerEmail?: string | null;
};

const statusLabel: Record<string, string> = {
  SUCCESS: "Payment confirmed",
  PENDING: "Payment pending confirmation",
  FAILED: "Payment not completed",
  EXPIRED: "Payment not completed",
};

/** Build a clean single-page A4 license-payment receipt as a PDF Buffer. */
export function buildLicenseReceiptPdf(d: ReceiptPdfData): Buffer {
  const M = 52; // margin
  const W = PAGE_W - M * 2; // content width
  let y = PAGE_H - 64;

  const ops: Op[] = [];

  // ── Brand row ──────────────────────────────────────────────────────────────
  ops.push({ kind: "text", x: M, y, text: d.schoolName, size: 17, bold: true, color: INK });
  ops.push({
    kind: "text",
    x: M,
    y: y - 20,
    text: "GES School MIS · License payment receipt",
    size: 9.5,
    color: MUTED,
  });
  ops.push({ kind: "text", x: M + W, y, text: "RECEIPT", size: 9, bold: true, color: MUTED, align: "right" });
  ops.push({ kind: "text", x: M + W, y: y - 16, text: d.reference, size: 10.5, bold: true, color: INK, align: "right" });
  ops.push({ kind: "text", x: M + W, y: y - 32, text: d.date, size: 8.5, color: MUTED, align: "right" });
  y -= 62;

  // ── Divider ────────────────────────────────────────────────────────────────
  ops.push({ kind: "line", x1: M, y1: y, x2: M + W, y2: y, color: [0.85, 0.87, 0.9], width: 1 });
  y -= 30;

  // ── Status pill ────────────────────────────────────────────────────────────
  const confirmed = d.status === "SUCCESS";
  const pillText = statusLabel[d.status] ?? d.status;
  const pillW = textWidth(pillText, 11) + 28;
  ops.push({ kind: "rect", x: M, y: y - 22, w: pillW, h: 26, fill: confirmed ? GREEN : MUTED });
  ops.push({ kind: "text", x: M + 14, y: y - 7.5, text: pillText, size: 11, bold: true, color: WHITE });
  ops.push({
    kind: "text",
    x: M,
    y: y - 48,
    text: confirmed
      ? "Your license key was delivered to your email / WhatsApp / SMS."
      : "This receipt is a record of the payment attempt.",
    size: 8.5,
    color: MUTED,
  });
  y -= 84;

  // ── Details rows ───────────────────────────────────────────────────────────
  const rows: [string, string][] = [
    ["Reference", d.reference],
    ["Amount", d.amount],
    ["Method", d.method],
    ["Date", d.date],
    ["Purpose", d.purpose],
    ["Status", d.status],
  ];
  for (const [label, value] of rows) {
    ops.push({ kind: "text", x: M, y, text: label.toUpperCase(), size: 8, bold: true, color: MUTED });
    ops.push({ kind: "text", x: M + W, y, text: value, size: 10, color: INK, align: "right" });
    ops.push({ kind: "line", x1: M, y1: y - 14, x2: M + W, y2: y - 14, color: [0.93, 0.94, 0.95], width: 0.75 });
    y -= 38;
  }

  // ── Total bar ──────────────────────────────────────────────────────────────
  y -= 6;
  ops.push({ kind: "rect", x: M, y: y - 30, w: W, h: 40, fill: DARK });
  ops.push({ kind: "text", x: M + 18, y: y - 6, text: "Total paid", size: 11, color: [0.8, 0.84, 0.9] });
  ops.push({ kind: "text", x: M + W - 18, y: y - 4.5, text: d.amount, size: 14, bold: true, color: WHITE, align: "right" });
  y -= 70;

  // ── Footer ─────────────────────────────────────────────────────────────────
  const dev = d.developerName || "shacomputec";
  const devLine = `Developed by ${dev}${d.developerPhone ? ` · ${d.developerPhone}` : ""}${
    d.developerEmail ? ` · ${d.developerEmail}` : ""
  }`;
  ops.push({ kind: "line", x1: M, y1: y, x2: M + W, y2: y, color: [0.9, 0.91, 0.93], width: 1 });
  y -= 26;
  ops.push({ kind: "text", x: M + W / 2, y, text: devLine, size: 8.5, color: MUTED, align: "center" });
  ops.push({
    kind: "text",
    x: M + W / 2,
    y: y - 16,
    text: "Keep this receipt together with your license key. It is for your records.",
    size: 8,
    color: MUTED,
    align: "center",
  });

  // ── Assemble the PDF ───────────────────────────────────────────────────────
  const content = renderOps(ops);
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
  ];
  return assemble(objects);
}

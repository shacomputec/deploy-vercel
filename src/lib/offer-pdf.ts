// ============================================================================
// Minimal dependency-free PDF writer — A4 admission offer letters (multi-page).
// ----------------------------------------------------------------------------
// Same philosophy as receipt-pdf.ts: no PDF library, Helvetica core fonts,
// deterministic output. Used to attach the offer letter to the parent's email
// the moment an application is approved.
// ============================================================================

const PAGE_W = 595.28; // A4 portrait (points)
const PAGE_H = 841.89;

type Rgb = [number, number, number];

const INK: Rgb = [0.09, 0.12, 0.16];
const MUTED: Rgb = [0.45, 0.5, 0.56];
const GREEN: Rgb = [0.05, 0.55, 0.33];
const GREEN_DARK: Rgb = [0.02, 0.36, 0.23];
const WHITE: Rgb = [1, 1, 1];

/** Escape PDF string literals and strip anything outside Latin-1. */
function esc(s: string): string {
  let out = "";
  for (const ch of s.normalize("NFKD")) {
    const code = ch.codePointAt(0)!;
    if (code > 0xff) continue; // drop non-Latin-1
    if (ch === "\\" || ch === "(" || ch === ")") {
      out += "\\" + ch;
    } else {
      out += ch;
    }
  }
  return out;
}

/** Rough Helvetica advance width — enough for wrapping and right-align. */
function textWidth(text: string, size: number): number {
  return [...text].reduce((w, ch) => {
    const code = ch.codePointAt(0)!;
    if (code > 0xff) return w + size * 0.5;
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

/** Wrap text into lines that fit `maxWidth` at the given size. */
function wrap(text: string, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const trial = cur ? `${cur} ${w}` : w;
    if (textWidth(trial, size) <= maxWidth || !cur) {
      cur = trial;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

type Page = { ops: Op[] };

/** A flowing single-column document builder with automatic page breaks. */
class Doc {
  private pages: Page[] = [{ ops: [] }];
  private cur: Op[] = this.pages[0].ops;
  private y = PAGE_H - 64;
  private readonly margin = 52;
  private readonly width = PAGE_W - 52 * 2;

  private ensure(space: number) {
    if (this.y - space < 70) {
      this.pages.push({ ops: [] });
      this.cur = this.pages[this.pages.length - 1].ops;
      this.y = PAGE_H - 64;
    }
  }

  text(text: string, size: number, opts: { bold?: boolean; color?: Rgb; align?: "left" | "right" | "center"; indent?: number } = {}) {
    const indent = opts.indent ?? 0;
    this.ensure(size * 1.6);
    this.cur.push({
      kind: "text",
      x: this.margin + indent,
      y: this.y,
      text,
      size,
      bold: opts.bold,
      color: opts.color,
      align: opts.align,
    });
    this.y -= size * 1.5;
  }

  paragraph(text: string, size: number, opts: { bold?: boolean; color?: Rgb } = {}) {
    for (const line of wrap(text, size, this.width)) this.text(line, size, opts);
    this.y -= 6;
  }

  gap(h: number) {
    this.ensure(h);
    this.y -= h;
  }

  line(color: Rgb = [0.9, 0.91, 0.93], width = 1) {
    this.ensure(8);
    this.cur.push({ kind: "line", x1: this.margin, y1: this.y, x2: PAGE_W - this.margin, y2: this.y, color, width });
    this.y -= 14;
  }

  rect(x: number, y: number, w: number, h: number, fill: Rgb) {
    this.ensure(h);
    this.cur.push({ kind: "rect", x, y, w, h, fill });
  }

  /** Two signature lines (parent + headteacher) side by side at the same height. */
  signatureRow(leftLabel: string, rightLabel: string) {
    this.ensure(70);
    const y = this.y - 10;
    const rightX = PAGE_W - this.margin - 150;
    for (const [label, x] of [
      [leftLabel, this.margin],
      [rightLabel, rightX],
    ] as const) {
      this.cur.push({
        kind: "line", x1: x, y1: y, x2: x + 150, y2: y, color: [0.55, 0.6, 0.66], width: 1,
      });
      this.cur.push({ kind: "text", x, y: y - 14, text: label, size: 9, color: MUTED });
      this.cur.push({ kind: "text", x, y: y - 28, text: "Date: ______________", size: 8.5, color: MUTED });
    }
    this.y = y - 38;
  }

  render(): Buffer {
    const objects: string[] = [
      "<< /Type /Catalog /Pages 2 0 R >>",
    ];
    const kids: string[] = [];
    const n = this.pages.length;
    // pages object + one object per page + fonts + one content stream per page
    for (let i = 0; i < n; i++) {
      const content = renderOps(this.pages[i].ops);
      kids.push(`${3 + i} 0 R`);
      objects.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 ${3 + n} 0 R /F2 ${4 + n} 0 R >> >> /Contents ${5 + n + i} 0 R >>`
      );
    }
    objects.splice(1, 0, `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${n} >>`);
    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
    for (const page of this.pages) {
      const content = renderOps(page.ops);
      objects.push(`<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`);
    }
    return assemble(objects);
  }
}

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

export type AdmissionOfferPdfData = {
  schoolName: string;
  schoolMotto?: string | null;
  schoolContact?: string;
  childName: string;
  parentName: string;
  className: string;
  admissionNo: string;
  academicYear: string;
  reference: string;
  date: string;
  reportingDate: string;
  acceptanceDeadline: string;
};

/** Build a clean multi-page A4 admission offer letter as a PDF Buffer. */
export function buildAdmissionOfferPdf(d: AdmissionOfferPdfData): Buffer {
  const doc = new Doc();

  // ── Header ─────────────────────────────────────────────────────────────────
  doc.text(d.schoolName, 17, { bold: true, color: INK });
  if (d.schoolMotto) {
    doc.gap(2);
    doc.text(d.schoolMotto, 9, { color: MUTED });
  }
  doc.gap(2);
  doc.text(d.schoolContact || "", 8.5, { color: MUTED });
  doc.text("DATE", 8, { bold: true, color: MUTED, align: "right" });
  doc.text(d.date, 10, { bold: true, color: INK, align: "right" });
  doc.text("REFERENCE", 8, { bold: true, color: MUTED, align: "right" });
  doc.text(d.reference, 10, { bold: true, color: INK, align: "right" });
  doc.text("STATUS", 8, { bold: true, color: MUTED, align: "right" });
  doc.text("OFFERED", 10, { bold: true, color: GREEN_DARK, align: "right" });
  doc.gap(6);
  doc.line([0.05, 0.55, 0.33], 2.5);
  doc.gap(10);

  // ── Title ──────────────────────────────────────────────────────────────────
  doc.text("ADMISSION OFFER LETTER", 13, { bold: true, color: GREEN_DARK, align: "center" });
  doc.gap(14);

  // ── Body ───────────────────────────────────────────────────────────────────
  doc.paragraph(`Dear ${d.parentName},`, 11, { color: INK });
  doc.gap(4);
  doc.paragraph(
    `We are delighted to inform you that ${d.childName} has been offered admission to ${d.schoolName} in ${d.className} for the ${d.academicYear} academic year.`,
    11,
    { color: INK }
  );
  doc.gap(4);
  doc.paragraph(
    `The child has been issued the admission number ${d.admissionNo}. Please present this letter and the required documents when reporting to school on ${d.reportingDate}.`,
    11,
    { color: INK }
  );
  doc.gap(12);

  // ── Admission details ──────────────────────────────────────────────────────
  doc.text("ADMISSION DETAILS", 10, { bold: true, color: GREEN_DARK });
  doc.gap(6);
  const rows: [string, string][] = [
    ["Child's full name", d.childName],
    ["Admission number", d.admissionNo],
    ["Class admitted to", d.className],
    ["Academic year", d.academicYear],
    ["Application reference", d.reference],
  ];
  for (const [label, value] of rows) {
    doc.text(label.toUpperCase(), 8, { bold: true, color: MUTED });
    doc.text(value, 10, { color: INK, align: "right" });
    doc.line([0.93, 0.94, 0.95], 0.75);
    doc.gap(2);
  }
  doc.gap(12);

  // ── Documents ──────────────────────────────────────────────────────────────
  doc.text("PLEASE BRING ON REPORTING DAY", 10, { bold: true, color: GREEN_DARK });
  doc.gap(6);
  const docs = [
    "This offer letter (printed or on your phone)",
    "Two recent passport-size photographs",
    "Birth certificate or baptismal card",
    "Previous school's report card (Basic 1 and above)",
    "Medical / NHIS information where applicable",
  ];
  for (const item of docs) {
    doc.text(item, 10, { color: INK, indent: 10 });
    doc.gap(1);
  }
  doc.gap(12);

  // ── Acceptance ─────────────────────────────────────────────────────────────
  doc.text("ACCEPTANCE", 10, { bold: true, color: GREEN_DARK });
  doc.gap(6);
  doc.paragraph(
    `To accept this offer, please confirm with the school office on or before ${d.acceptanceDeadline}. If we do not hear from you by then, the place may be offered to another applicant.`,
    10,
    { color: INK }
  );
  doc.gap(20);

  // ── Signatures ─────────────────────────────────────────────────────────────
  doc.signatureRow("Parent / Guardian Signature", "Headteacher / Admissions Officer");
  doc.gap(24);

  // ── Footer ─────────────────────────────────────────────────────────────────
  doc.line([0.9, 0.91, 0.93], 1);
  doc.gap(6);
  doc.text(`${d.schoolName} · Admission Offer · ${d.reference} · ${d.date}`, 8, { color: MUTED, align: "center" });

  return doc.render();
}

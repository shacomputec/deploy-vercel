// ============================================================================
// Minimal dependency-free PDF writer — GES/NaCCA lesson notes (multi-page).
// ----------------------------------------------------------------------------
// Same philosophy as receipt-pdf.ts / offer-pdf.ts / id-card-pdf.ts: no PDF
// library, Helvetica core fonts, deterministic output. Renders one structured
// lesson plan (topic, objectives, resources, starter, main activity, plenary,
// homework) as a clean A4 document that flows onto extra pages when needed.
// ============================================================================

const PAGE_W = 595.28; // A4 portrait (points)
const PAGE_H = 841.89;

type Rgb = [number, number, number];

const INK: Rgb = [0.09, 0.12, 0.16];
const MUTED: Rgb = [0.45, 0.5, 0.56];
const GREEN: Rgb = [0.05, 0.55, 0.33];
const GREEN_DARK: Rgb = [0.02, 0.36, 0.23];
const WHITE: Rgb = [1, 1, 1];

function esc(s: string): string {
  let out = "";
  for (const ch of s.normalize("NFKD")) {
    const code = ch.codePointAt(0)!;
    if (code > 0xff) continue; // drop non-Latin-1 (e.g. ₵ — write "GHS")
    if (ch === "\\" || ch === "(" || ch === ")") out += "\\" + ch;
    else out += ch;
  }
  return out;
}

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

type Op =
  | { kind: "text"; x: number; y: number; text: string; size: number; bold?: boolean; color?: Rgb; align?: "left" | "right" | "center" }
  | { kind: "rect"; x: number; y: number; w: number; h: number; fill: Rgb }
  | { kind: "line"; x1: number; y1: number; x2: number; y2: number; color?: Rgb; width?: number };

type Page = { ops: Op[] };

class Doc {
  private pages: Page[] = [{ ops: [] }];
  private cur: Op[] = this.pages[0].ops;
  private y = PAGE_H - 64;
  private readonly margin = 52;
  private readonly width = PAGE_W - 52 * 2;

  /** Current pen Y (PDF coords, top-down decrements). */
  penY() {
    return this.y;
  }

  /** Move the pen down by h points (larger = lower on the page). */
  drop(h: number) {
    this.ensure(h);
    this.y -= h;
  }

  /** Content column width (page width minus both margins). */
  contentWidth() {
    return this.width;
  }

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
    this.cur.push({ kind: "text", x: this.margin + indent, y: this.y, text, size, bold: opts.bold, color: opts.color, align: opts.align });
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

  render(): Buffer {
    const objects: string[] = ["<< /Type /Catalog /Pages 2 0 R >>"];
    const kids: string[] = [];
    const n = this.pages.length;
    for (let i = 0; i < n; i++) {
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
      lines.push("BT", `${font} ${op.size} Tf`, `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`, `${x.toFixed(2)} ${op.y.toFixed(2)} Td`, `(${esc(op.text)}) Tj`, "ET");
    } else if (op.kind === "rect") {
      const [r, g, b] = op.fill;
      lines.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`, `${op.x.toFixed(2)} ${op.y.toFixed(2)} ${op.w.toFixed(2)} ${op.h.toFixed(2)} re f`);
    } else {
      const [r, g, b] = op.color ?? MUTED;
      lines.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG`, `${(op.width ?? 1).toFixed(2)} w`, `${op.x1.toFixed(2)} ${op.y1.toFixed(2)} m`, `${op.x2.toFixed(2)} ${op.y2.toFixed(2)} l S`);
    }
  }
  return lines.join("\n");
}

export type LessonNotePdfData = {
  schoolName: string;
  schoolMotto?: string | null;
  subject: string;
  level: string;
  topic: string;
  week: number;
  duration: string;
  objectives: string;
  resources: string;
  activityIntro: string;
  activityMain: string;
  activityPlenary: string;
  homework: string;
  developerName?: string;
  developerPhone?: string;
  developerEmail?: string;
};

function section(doc: Doc, title: string, body: string) {
  doc.rect(52, doc.penY() - 11, 3, 14, GREEN);
  doc.text(title.toUpperCase(), 8.5, { bold: true, color: GREEN_DARK });
  doc.drop(16);
  doc.paragraph(body, 10, { color: INK });
  doc.gap(10);
}

/** Build a clean multi-page A4 GES/NaCCA lesson note as a PDF Buffer. */
export function buildLessonNotePdf(d: LessonNotePdfData): Buffer {
  const doc = new Doc();

  // ── Header ─────────────────────────────────────────────────────────────────
  doc.text(d.schoolName, 17, { bold: true, color: INK });
  if (d.schoolMotto) {
    doc.gap(2);
    doc.text(d.schoolMotto, 9, { color: MUTED });
  }
  doc.gap(2);
  doc.text("GES / NaCCA LESSON PLAN", 8.5, { bold: true, color: MUTED, align: "right" });
  doc.text(`${d.subject} · ${d.level}`, 10, { bold: true, color: INK, align: "right" });
  doc.text(`Week ${d.week} · ${d.duration}`, 8.5, { color: MUTED, align: "right" });
  doc.gap(6);
  doc.line(GREEN, 2.5);
  doc.gap(12);

  // ── Topic band ─────────────────────────────────────────────────────────────
  doc.rect(52, doc.penY() - 24, doc.contentWidth(), 34, GREEN_DARK);
  doc.text("TOPIC", 7.5, { bold: true, color: [0.65, 0.85, 0.75] });
  doc.text(d.topic, 13, { bold: true, color: WHITE });
  doc.drop(40);
  doc.gap(8);

  // ── Sections ───────────────────────────────────────────────────────────────
  section(doc, "Lesson Objectives", d.objectives);
  section(doc, "Teaching & Learning Resources", d.resources);
  section(doc, "Starter / Previous Knowledge", d.activityIntro);
  section(doc, "Main Activity", d.activityMain);
  section(doc, "Plenary / Assessment", d.activityPlenary);
  section(doc, "Homework / Follow-up", d.homework);

  // ── Footer ─────────────────────────────────────────────────────────────────
  const dev = d.developerName || "shacomputec";
  const devLine = `Sample lesson note prepared with GES School MIS · ${dev}${d.developerPhone ? ` · ${d.developerPhone}` : ""}${d.developerEmail ? ` · ${d.developerEmail}` : ""}`;
  doc.line([0.9, 0.91, 0.93], 1);
  doc.gap(6);
  doc.text(devLine, 8, { color: MUTED, align: "center" });

  return doc.render();
}

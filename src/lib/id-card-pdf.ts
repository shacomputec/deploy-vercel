// ============================================================================
// Minimal dependency-free PDF writer — student & staff ID cards.
// ----------------------------------------------------------------------------
// Same philosophy as receipt-pdf.ts / offer-pdf.ts: no PDF library, Helvetica
// core fonts, deterministic output. One A4 portrait page per person — the card
// front at the top, a cut line, then the card back below (matching the on-screen
// print layout). Photos are embedded directly (JPEG via /DCTDecode, PNG via
// inflate + de-filter + /FlateDecode) and QR codes are drawn as vector squares
// so the file is fully self-contained and prints crisply at any size.
// ============================================================================

import { inflateSync, deflateSync } from "zlib";

const PAGE_W = 595.28; // A4 portrait (points)
const PAGE_H = 841.89;

const CARD_W = 242.65; // 85.6 mm
const CARD_H = 153.07; // 54 mm
const MARGIN = 28.35; // 10 mm

type Rgb = [number, number, number];

const INK: Rgb = [0.09, 0.12, 0.16];
const MUTED: Rgb = [0.45, 0.5, 0.56];
const WHITE: Rgb = [1, 1, 1];
const SLATE_BORDER: Rgb = [0.2, 0.24, 0.33];

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

function hexToRgb(hex: string, fallback: string): Rgb {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const src = m ? m[1] : /^#?([0-9a-f]{6})$/i.exec(fallback)?.[1] ?? "0f172a";
  return [
    parseInt(src.slice(0, 2), 16) / 255,
    parseInt(src.slice(2, 4), 16) / 255,
    parseInt(src.slice(4, 6), 16) / 255,
  ];
}

type Op =
  | { kind: "text"; x: number; y: number; text: string; size: number; bold?: boolean; color?: Rgb; align?: "left" | "right" | "center" }
  | { kind: "rect"; x: number; y: number; w: number; h: number; fill: Rgb }
  | { kind: "line"; x1: number; y1: number; x2: number; y2: number; color?: Rgb; width?: number }
  | { kind: "rect-stroke"; x: number; y: number; w: number; h: number; color?: Rgb; width?: number }
  | { kind: "image"; x: number; y: number; w: number; h: number; image: number };

type Page = { ops: Op[]; images: Set<number> };

/** One embedded raster image (JPEG bytes or already-de-filtered RGB). */
export type EmbeddedImage = {
  width: number;
  height: number;
  colorSpace: "DeviceRGB" | "DeviceGray";
  filter: "DCTDecode" | "FlateDecode";
  bytes: Buffer; // for DCTDecode: the JPEG file itself; for FlateDecode: zlib-deflated RGB
};

// ── PNG / JPEG parsing ────────────────────────────────────────────────────────

/** Extract (width, height) from a JPEG by walking its markers. */
function jpegDims(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 4 <= buf.length) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1];
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      i += 2;
      continue;
    }
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xc3 && marker !== 0xc4 && marker !== 0xc8) {
      if (i + 9 > buf.length) return null;
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  return null;
}

/** Parse PNG header for (width, height, colorType, bitDepth) + the IDAT payload. */
function pngInfo(buf: Buffer): { width: number; height: number; colorType: number; bitDepth: number; idat: Buffer } | null {
  if (buf.length < 33 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  if (buf.readUInt32BE(12) !== 0x49484452) return null; // IHDR
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const bitDepth = buf[24];
  const colorType = buf[25];
  let i = 8;
  const chunks: Buffer[] = [];
  while (i + 12 <= buf.length) {
    const len = buf.readUInt32BE(i);
    const type = buf.toString("latin1", i + 4, i + 8);
    if (type === "IDAT") chunks.push(buf.subarray(i + 8, i + 8 + len));
    if (type === "IEND") break;
    i += 12 + len;
  }
  if (!chunks.length) return null;
  return { width, height, colorType, bitDepth, idat: Buffer.concat(chunks) };
}

/** De-filter a PNG IDAT payload into raw pixel data. */
function unfilterPng(width: number, height: number, bpp: number, outBpp: number, raw: Buffer): Buffer {
  const stride = width * bpp;
  const out = Buffer.alloc(height * stride);
  let pos = 0;
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    if (pos >= raw.length) break;
    const f = raw[pos++];
    const line = raw.subarray(pos, pos + stride);
    pos += stride;
    const rowOut = out.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const left = x >= bpp ? rowOut[x - bpp] : 0;
      const up = prev[x];
      const ul = x >= bpp ? prev[x - bpp] : 0;
      let v = line[x];
      if (f === 1) v = (v + left) & 0xff;
      else if (f === 2) v = (v + up) & 0xff;
      else if (f === 3) v = (v + ((left + up) >> 1)) & 0xff;
      else if (f === 4) {
        const p = left + up - ul;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - ul);
        const pred = pa <= pb && pa <= pc ? left : pb <= pc ? up : ul;
        v = (v + pred) & 0xff;
      }
      rowOut[x] = v;
    }
    prev = rowOut;
  }
  // Strip alpha / convert to the output color space.
  if (outBpp === bpp) return out;
  const outBuf = Buffer.alloc(height * width * outBpp);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const si = (y * width + x) * bpp;
      const di = (y * width + x) * outBpp;
      outBuf[di] = out[si];
      if (outBpp >= 2) outBuf[di + 1] = out[si + 1];
      if (outBpp >= 3) outBuf[di + 2] = out[si + 2];
    }
  }
  return outBuf;
}

/** Turn a base64 data-URL photo into an embeddable image, or null if unsupported. */
export function embedPhoto(dataUrl: string | null | undefined): EmbeddedImage | null {
  if (!dataUrl) return null;
  const m = /^data:image\/(png|jpe?g);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl.trim());
  if (!m) return null;
  const buf = Buffer.from(m[2], "base64");
  if (m[1] === "jpg" || m[1] === "jpeg") {
    const d = jpegDims(buf);
    if (!d) return null;
    return { width: d.width, height: d.height, colorSpace: "DeviceRGB", filter: "DCTDecode", bytes: buf };
  }
  const info = pngInfo(buf);
  if (!info || info.bitDepth !== 8) return null;
  let bpp: number;
  let outBpp: number;
  let colorSpace: "DeviceRGB" | "DeviceGray";
  if (info.colorType === 0) {
    bpp = 1;
    outBpp = 1;
    colorSpace = "DeviceGray";
  } else if (info.colorType === 2) {
    bpp = 3;
    outBpp = 3;
    colorSpace = "DeviceRGB";
  } else if (info.colorType === 4) {
    bpp = 2;
    outBpp = 1;
    colorSpace = "DeviceGray";
  } else if (info.colorType === 6) {
    bpp = 4;
    outBpp = 3;
    colorSpace = "DeviceRGB";
  } else {
    return null; // palette / others not supported for photos
  }
  try {
    const raw = inflateSync(info.idat);
    const rgb = unfilterPng(info.width, info.height, bpp, outBpp, raw);
    return { width: info.width, height: info.height, colorSpace, filter: "FlateDecode", bytes: deflateSync(rgb) };
  } catch {
    return null;
  }
}

// ── Document builder ──────────────────────────────────────────────────────────

class Pfd {
  private pages: Page[] = [{ ops: [], images: new Set() }];
  private images: EmbeddedImage[] = [];

  addImage(img: EmbeddedImage): number {
    const idx = this.images.length;
    this.images.push(img);
    return idx;
  }

  private ops() {
    return this.pages[this.pages.length - 1].ops;
  }

  text(x: number, y: number, text: string, size: number, opts: { bold?: boolean; color?: Rgb; align?: "left" | "right" | "center" } = {}) {
    this.ops().push({ kind: "text", x, y, text, size, bold: opts.bold, color: opts.color, align: opts.align });
  }

  rect(x: number, y: number, w: number, h: number, fill: Rgb) {
    this.ops().push({ kind: "rect", x, y, w, h, fill });
  }

  rectStroke(x: number, y: number, w: number, h: number, color: Rgb = SLATE_BORDER, width = 1) {
    this.ops().push({ kind: "rect-stroke", x, y, w, h, color, width });
  }

  line(x1: number, y1: number, x2: number, y2: number, color: Rgb = MUTED, width = 1) {
    this.ops().push({ kind: "line", x1, y1, x2, y2, color, width });
  }

  /** Draw an image scaled to fit (w × h) with a 1:1 crop-free fit. */
  image(idx: number, x: number, y: number, w: number, h: number) {
    this.pages[this.pages.length - 1].images.add(idx);
    this.ops().push({ kind: "image", x, y, w, h, image: idx });
  }

  /** Draw a QR code as vector squares (modules from the `qrcode` library). */
  qr(modules: { size: number; data: Uint8Array }, x: number, y: number, size: number, quiet = 4) {
    const n = modules.size;
    const cell = size / (n + quiet * 2);
    const ox = x + quiet * cell;
    const oy = y + quiet * cell;
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        if (modules.data[row * n + col]) {
          this.rect(ox + col * cell, oy + row * cell, cell, cell, INK);
        }
      }
    }
  }

  newPage() {
    this.pages.push({ ops: [], images: new Set() });
  }

  render(): Buffer {
    const imageObjects = this.images.map((img, i) => {
      const props = [
        "/Type /XObject",
        "/Subtype /Image",
        `/Width ${img.width}`,
        `/Height ${img.height}`,
        `/ColorSpace /${img.colorSpace}`,
        "/BitsPerComponent 8",
        `/Filter /${img.filter}`,
        `/Length ${img.bytes.length}`,
      ].join(" ");
      return `${6 + i} 0 obj\n<< ${props} >>\nstream\n`;
    });

    const objects: string[] = ["<< /Type /Catalog /Pages 2 0 R >>"];
    const n = this.pages.length;
    const kids: string[] = [];
    const imageCount = this.images.length;

    for (let i = 0; i < n; i++) {
      kids.push(`${3 + i} 0 R`);
      const page = this.pages[i];
      const xobjs = [...page.images].map((idx) => `/Im${idx + 1} ${6 + idx} 0 R`).join(" ");
      const resources = [
        `<< /Font << /F1 ${3 + n} 0 R /F2 ${4 + n} 0 R >>`,
        xobjs ? `/XObject << ${xobjs} >>` : "",
        ">>",
      ].join(" ");
      objects.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources ${resources} /Contents ${5 + n + imageCount + i} 0 R >>`
      );
    }
    objects.splice(1, 0, `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${n} >>`);
    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
    for (const page of this.pages) {
      const content = this.renderOps(page.ops);
      objects.push(`<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`);
    }
    objects.splice(5, 0, ...imageObjects.map((obj, i) => obj + this.images[i].bytes.toString("latin1") + "\nendstream"));

    // Assemble with a correct xref (objects array order: catalog, pages, page×n, font, font, image×m, content×n).
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

  private renderOps(ops: Op[]): string {
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
      } else if (op.kind === "rect-stroke") {
        const [r, g, b] = op.color ?? SLATE_BORDER;
        lines.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG`, `${(op.width ?? 1).toFixed(2)} w`, `${op.x.toFixed(2)} ${op.y.toFixed(2)} ${op.w.toFixed(2)} ${op.h.toFixed(2)} re S`);
      } else if (op.kind === "line") {
        const [r, g, b] = op.color ?? MUTED;
        lines.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG`, `${(op.width ?? 1).toFixed(2)} w`, `${op.x1.toFixed(2)} ${op.y1.toFixed(2)} m`, `${op.x2.toFixed(2)} ${op.y2.toFixed(2)} l S`);
      } else {
        const [r, g, b] = [1, 1, 1];
        lines.push("q", `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`, `${op.w.toFixed(2)} 0 0 ${op.h.toFixed(2)} ${op.x.toFixed(2)} ${op.y.toFixed(2)} cm`, `/Im${op.image + 1} Do`, "Q");
      }
    }
    return lines.join("\n");
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export type IdCardPdfPerson = {
  id: string;
  name: string;
  photo: string | null; // base64 data URL (jpg/png) or null
  /** Front lines, in order, e.g. "Class: Basic 4", "Admission No: GES-2024-0007". */
  frontLines: string[];
  /** Back field rows — label (small, muted) + value (bold). */
  backRows: { label: string; value: string }[];
  qrText?: string | null; // URL encoded in the QR (null → no QR)
  qrHint?: string | null; // caption beside the QR
  contact?: string | null; // school phone/email line under the QR
  accentLabel: string; // bottom strip text, e.g. "Student Identity Card"
};

export type IdCardPdfOptions = {
  design: {
    headerBg: string;
    headerTextColor: string;
    accent: string;
    headerTitle: string;
    headerSub: string;
    footerText: string;
    front: { photo: boolean; name: boolean; classLine: boolean; admissionNo: boolean; year: boolean; gender: boolean };
    back: { idNo: boolean; dob: boolean; hometown: boolean; region: boolean; phone: boolean; nationality: boolean; qr: boolean; devFooter: boolean };
  };
  people: IdCardPdfPerson[];
  logoPng?: Buffer | null; // optional small PNG to show in the header bar
  qrModules?: (text: string) => { size: number; data: Uint8Array }; // injectable for tests
};

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "—";
}

/** Build a multi-page A4 PDF with one ID card (front + back) per person. */
export function buildIdCardPdf(opts: IdCardPdfOptions): Buffer {
  const { design, people } = opts;
  const doc = new Pfd();
  const headerBg = hexToRgb(design.headerBg, "#0f172a");
  const headerFg = hexToRgb(design.headerTextColor, "#ffffff");
  const accent = hexToRgb(design.accent, "#0f172a");

  const logo = opts.logoPng ? embedPhoto(`data:image/png;base64,${opts.logoPng.toString("base64")}`) : null;
  const logoIdx = logo ? doc.addImage(logo) : -1;

  for (const person of people) {
    const top = MARGIN;
    const left = (PAGE_W - CARD_W) / 2;

    // ── FRONT ────────────────────────────────────────────────────────────────
    const cardTop = PAGE_H - top - CARD_H; // PDF y of the card's top edge
    doc.rect(left, cardTop, CARD_W, CARD_H, WHITE);
    doc.rectStroke(left, cardTop, CARD_W, CARD_H);

    // Header bar (30 pt)
    const headerH = 30;
    doc.rect(left, cardTop + CARD_H - headerH, CARD_W, headerH, headerBg);
    doc.text(left + 12, cardTop + CARD_H - 19, design.headerTitle, 11, { bold: true, color: headerFg });
    doc.text(left + 12, cardTop + CARD_H - 8, design.headerSub, 7.5, { color: headerFg });
    if (logoIdx >= 0) {
      doc.image(logoIdx, left + CARD_W - 30, cardTop + CARD_H - 26, 20, 20);
    }

    // Body
    const photoW = 74;
    const photoH = 96;
    const photoX = left + 12;
    const photoY = cardTop + 24; // sits just above the bottom strip

    if (design.front.photo) {
      const img = person.photo ? embedPhoto(person.photo) : null;
      if (img) {
        // Cover-fit the photo into the box (crop overflow).
        const scale = Math.max(photoW / img.width, photoH / img.height);
        const dw = img.width * scale;
        const dh = img.height * scale;
        const dx = photoX + (photoW - dw) / 2;
        const dy = photoY + (photoH - dh) / 2;
        doc.image(doc.addImage(img), dx, dy, dw, dh);
      } else {
        doc.rect(photoX, photoY, photoW, photoH, [0.95, 0.96, 0.97]);
        doc.rectStroke(photoX, photoY, photoW, photoH, [0.78, 0.82, 0.86], 0.8);
        doc.text(photoX + photoW / 2, photoY + photoH / 2 + 5, initials(person.name), 16, { bold: true, color: [0.55, 0.58, 0.63], align: "center" });
      }
    } else {
      doc.rect(photoX, photoY, photoW, photoH, [0.98, 0.98, 0.99]);
      doc.rectStroke(photoX, photoY, photoW, photoH, [0.85, 0.87, 0.9], 0.6);
    }

    const textX = photoX + photoW + 14;
    const textW = left + CARD_W - 12 - textX;
    let ty = cardTop + 112; // first line sits just under the header bar
    if (design.front.name) {
      for (const line of wrap(person.name.toUpperCase(), 10, textW)) {
        doc.text(textX, ty, line, 10, { bold: true, color: INK });
        ty -= 14;
      }
      ty -= 3;
    }
    const frontRows = design.front.classLine || design.front.admissionNo || design.front.year || design.front.gender ? person.frontLines : [];
    for (const line of frontRows) {
      for (const sub of wrap(line, 8, textW)) {
        doc.text(textX, ty, sub, 8, { color: [0.42, 0.47, 0.53] });
        ty -= 12;
      }
      ty -= 1;
    }

    // Bottom strip
    doc.rect(left, cardTop, CARD_W, 20, accent);
    doc.text(left + CARD_W / 2, cardTop + 12.5, person.accentLabel.toUpperCase(), 8, { bold: true, color: WHITE, align: "center" });

    // ── Cut line ─────────────────────────────────────────────────────────────
    const cutY = cardTop - 16;
    doc.line(left, cutY, left + CARD_W, cutY, [0.58, 0.62, 0.68], 0.7);
    doc.text(left + CARD_W / 2, cutY - 9, "— cut here · fold & laminate —", 6, { color: MUTED, align: "center" });

    // ── BACK ─────────────────────────────────────────────────────────────────
    const backTop = cutY - 26;
    doc.rect(left, backTop, CARD_W, CARD_H, WHITE);
    doc.rectStroke(left, backTop, CARD_W, CARD_H);

    // Fields grid (two columns) — top area of the card
    const rows = person.backRows;
    const colW = (CARD_W - 24) / 2;
    let gy = backTop + CARD_H - 14;
    let col = 0;
    for (const row of rows) {
      const x = left + 12 + col * colW;
      doc.text(x, gy, row.label.toUpperCase(), 5.5, { bold: true, color: MUTED });
      doc.text(x, gy - 10, row.value, 8.5, { bold: true, color: INK });
      col = col === 0 ? 1 : 0;
      if (col === 0) gy -= 26;
    }

    // QR row — bottom area, above the footer strip
    const qrRowTop = backTop + 30;
    const qrSize = 44;
    if (design.back.qr && person.qrText) {
      const modules = opts.qrModules ? opts.qrModules(person.qrText) : null;
      if (modules) {
        doc.qr(modules, left + 12, qrRowTop, qrSize);
        const hintX = left + 12 + qrSize + 10;
        const hintW = CARD_W - 24 - qrSize - 10;
        let hy = qrRowTop + qrSize - 6;
        for (const line of wrap(person.qrHint ?? "", 6.5, hintW)) {
          doc.text(hintX, hy, line, 6.5, { color: MUTED });
          hy -= 9;
        }
        if (person.contact) {
          for (const line of wrap(person.contact, 7, hintW)) {
            doc.text(hintX, hy, line, 7, { bold: true, color: [0.42, 0.47, 0.53] });
            hy -= 9.5;
          }
        }
      }
    }

    // Footer strip
    if (design.back.devFooter) {
      doc.rect(left, backTop, CARD_W, 20, accent);
      doc.text(left + CARD_W / 2, backTop + 12.5, design.footerText, 6, { bold: true, color: WHITE, align: "center" });
    }

    if (people.length > 1 && person !== people[people.length - 1]) doc.newPage();
  }

  return doc.render();
}

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { handle } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

// Administrator level or higher may open the buyer checklist.
const GUIDE_MIN_LEVEL = 800;

/** Tiny zero-dependency markdown→HTML for the checklist file's limited subset. */
function mdToHtml(md: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s: string) =>
    esc(s)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");

  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let inTable = false;
  let inList = false;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${para.map(inline).join(" ")}</p>`);
      para = [];
    }
  };
  const closeTable = () => {
    if (inTable) {
      out.push("</tbody></table>");
      inTable = false;
    }
  };
  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushPara();
      closeTable();
      closeList();
      continue;
    }
    if (line.startsWith("|")) {
      flushPara();
      closeList();
      const cells = line.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      if (!inTable) {
        out.push("<table><thead><tr>" + cells.map((c) => `<th>${inline(c)}</th>`).join("") + "</tr></thead><tbody>");
        inTable = true;
      } else if (cells.every((c) => /^:?-{2,}:?$/.test(c))) {
        // separator row — skip
      } else {
        out.push("<tr>" + cells.map((c) => `<td>${inline(c)}</td>`).join("") + "</tr>");
      }
      continue;
    }
    closeTable();
    if (line.startsWith("### ")) {
      closeList();
      flushPara();
      out.push(`<h3>${inline(line.slice(4))}</h3>`);
    } else if (line.startsWith("## ")) {
      closeList();
      flushPara();
      out.push(`<h2>${inline(line.slice(3))}</h2>`);
    } else if (line.startsWith("# ")) {
      closeList();
      flushPara();
      out.push(`<h1>${inline(line.slice(2))}</h1>`);
    } else if (line.startsWith("> ")) {
      closeList();
      flushPara();
      out.push(`<blockquote>${inline(line.slice(2))}</blockquote>`);
    } else if (/^\d+\.\s/.test(line) || line.startsWith("- ")) {
      flushPara();
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${inline(line.replace(/^\d+\.\s/, "").replace(/^- /, ""))}</li>`);
    } else {
      closeList();
      para.push(line);
    }
  }
  flushPara();
  closeTable();
  closeList();

  return out.join("\n");
}

export const GET = handle(async () => {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  if (user.role.level < GUIDE_MIN_LEVEL) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const file = path.join(process.cwd(), "docs", "BUYER-ONBOARDING.md");
  const md = fs.readFileSync(file, "utf8");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Buyer's Onboarding &amp; Setup Checklist</title>
<style>
  :root { --primary:#047857; --ink:#0f172a; --muted:#64748b; --line:#e2e8f0; --bg:#f8fafc; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font-family:Inter, ui-sans-serif, system-ui, "Segoe UI", Roboto, Arial, sans-serif; line-height:1.6; }
  .sheet { max-width: 820px; margin: 32px auto; background:#fff; border:1px solid var(--line); border-radius:16px; padding: 40px 48px; box-shadow: 0 8px 30px -12px rgb(15 23 42 / .15); }
  h1 { font-size: 26px; margin: 0 0 4px; color: var(--primary); }
  h2 { font-size: 19px; margin: 28px 0 8px; padding-bottom:6px; border-bottom:2px solid rgb(4 120 87 / .18); }
  h3 { font-size: 15px; margin: 20px 0 6px; }
  p { margin: 8px 0; color:#334155; }
  strong { color: var(--ink); }
  code { background:#f1f5f9; border:1px solid var(--line); border-radius:5px; padding:1px 5px; font-size:.9em; }
  table { width:100%; border-collapse:collapse; margin:12px 0; font-size:14px; }
  th, td { border:1px solid var(--line); padding:8px 10px; text-align:left; vertical-align:top; }
  th { background:#f0fdf4; color:#065f46; font-size:12px; text-transform:uppercase; letter-spacing:.04em; }
  td:first-child { white-space: nowrap; font-weight:600; }
  ul { margin:8px 0; padding-left:22px; }
  li { margin:4px 0; color:#334155; }
  blockquote { margin:12px 0; padding:10px 16px; background:#fefce8; border-left:4px solid #ca8a04; border-radius:8px; color:#713f12; }
  .brand { display:flex; align-items:center; gap:12px; margin-bottom:18px; padding-bottom:16px; border-bottom:1px solid var(--line); }
  .brand .dot { width:42px; height:42px; border-radius:12px; background:linear-gradient(135deg,#059669,#047857); display:flex; align-items:center; justify-content:center; color:#fff; font-weight:900; font-size:20px; }
  .footer { margin-top:32px; padding-top:14px; border-top:1px solid var(--line); font-size:12px; color:var(--muted); }
  .no-print { display:flex; justify-content:flex-end; gap:8px; margin-bottom:12px; }
  .no-print button { font:inherit; font-size:13px; font-weight:600; border:1px solid var(--line); background:#fff; color:var(--ink); border-radius:8px; padding:8px 14px; cursor:pointer; }
  .no-print button.primary { background:var(--primary); border-color:var(--primary); color:#fff; }
  @media print {
    body { background:#fff; }
    .sheet { max-width:none; margin:0; border:0; box-shadow:none; padding:20px 6mm; }
    .no-print { display:none !important; }
    h2 { break-after: avoid; }
  }
</style>
</head>
<body>
  <div class="sheet">
    <div class="no-print">
      <button onclick="window.print()">🖨 Print / Save PDF</button>
      <button class="primary" onclick="window.close()">Close</button>
    </div>
    ${mdToHtml(md)}
    <div class="footer">GES School MIS · Built by Shacomputec — "Hard Works Never Fail" · shacomputecgh@gmail.com · +233 530 941 750</div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
});

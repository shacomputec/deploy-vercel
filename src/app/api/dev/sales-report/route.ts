import { NextResponse } from "next/server";
import { handle, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSchool } from "@/lib/school";
import { getLicenseConfig } from "@/lib/license";
import { getSetting, setSetting } from "@/lib/settings";
import { notify } from "@/lib/notify";

const esc = (v: string | number) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const requireDeveloper = async () => {
  const user = await getCurrentUser();
  if (!user) throw { status: 401, message: "Authentication required" };
  if (user.role.name !== "developer") throw { status: 403, message: "Developer only" };
  return user;
};

export type SalesReportRow = {
  month: string; // YYYY-MM
  label: string; // e.g. "Aug 2026"
  count: number;
  revenue: number;
  byMethod: { method: string; count: number; revenue: number }[];
};

export type SalesReportYear = {
  year: string; // e.g. "2026"
  count: number;
  revenue: number;
};

export type CashbookRow = {
  reference: string;
  buyer: string; // school / buyer name, or schoolId when unnamed
  method: string;
  provider: string | null;
  amount: number;
  date: string; // ISO
};

export type SalesReportResponse = {
  rows: SalesReportRow[];
  years: SalesReportYear[];
  totalRevenue: number;
  totalSales: number;
  currentMonth: { month: string; label: string; count: number; revenue: number };
  cashbook: CashbookRow[];
  /** true when this open triggered the auto-emailed monthly summary. */
  monthlyEmailSent: boolean;
};

/**
 * GET /api/dev/sales-report — the developer's sales summary from license
 * payments (both school activations and public /buy purchases). Revenue is
 * counted the moment a payment settles (status SUCCESS). Developer-only.
 */
export const GET = handle(async (req) => {
  await requireDeveloper();

  const txs = await prisma.paymentGatewayTx.findMany({
    where: {
      purpose: { in: ["LICENSE", "LICENSE_PURCHASE"] },
      status: "SUCCESS",
    },
    select: { reference: true, amount: true, method: true, provider: true, buyerName: true, schoolId: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  // Cashbook — every settled license payment, newest first, for the developer's
  // records. Each row is one confirmed sale.
  const cashbook: CashbookRow[] = [...txs]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map((t) => ({
      reference: t.reference,
      buyer: t.buyerName ?? (t.schoolId === "main" ? "This installation" : t.schoolId.toUpperCase()),
      method: t.method,
      provider: t.provider,
      amount: t.amount,
      date: t.createdAt.toISOString(),
    }));

  const byMonth = new Map<string, { count: number; revenue: number; byMethod: Map<string, { count: number; revenue: number }> }>();
  for (const t of txs) {
    const key = t.createdAt.toISOString().slice(0, 7); // YYYY-MM
    let m = byMonth.get(key);
    if (!m) {
      m = { count: 0, revenue: 0, byMethod: new Map() };
      byMonth.set(key, m);
    }
    m.count += 1;
    m.revenue += t.amount;
    const mm = m.byMethod.get(t.method) ?? { count: 0, revenue: 0 };
    mm.count += 1;
    mm.revenue += t.amount;
    m.byMethod.set(t.method, mm);
  }

  const rows: SalesReportRow[] = [...byMonth.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, m]) => {
      const [y, mo] = key.split("-");
      const label = new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
      return {
        month: key,
        label,
        count: m.count,
        revenue: m.revenue,
        byMethod: [...m.byMethod.entries()].map(([method, v]) => ({ method, count: v.count, revenue: v.revenue })),
      };
    });

  // Yearly roll-up for the tax summary.
  const byYear = new Map<string, { count: number; revenue: number }>();
  for (const t of txs) {
    const y = t.createdAt.toISOString().slice(0, 4);
    const e = byYear.get(y) ?? { count: 0, revenue: 0 };
    e.count += 1;
    e.revenue += t.amount;
    byYear.set(y, e);
  }
  const years: SalesReportYear[] = [...byYear.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([year, v]) => ({ year, count: v.count, revenue: v.revenue }));

  const now = new Date();
  const curKey = now.toISOString().slice(0, 7);
  const cur = byMonth.get(curKey) ?? { count: 0, revenue: 0 };
  const curLabel = now.toLocaleDateString("en-GB", { month: "short", year: "numeric" });

  const res: SalesReportResponse = {
    rows,
    years,
    totalRevenue: txs.reduce((s, t) => s + t.amount, 0),
    totalSales: txs.length,
    currentMonth: { month: curKey, label: curLabel, count: cur.count, revenue: cur.revenue },
    cashbook,
    monthlyEmailSent: false,
  };

  // Auto-email the monthly summary — fires once, on the first console open of
  // a new month, so the developer gets the previous month's figures without
  // ever opening the console. Uses the developer's own email channel.
  try {
    const lastSent = await getSetting("dev.sales.lastReportSentMonth");
    if (lastSent && lastSent !== curKey) {
      const school = await getSchool();
      const devEmail = school?.developerEmail;
      if (devEmail) {
        // Summary of the just-completed month (the one before the current).
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
        const prevLabel = prev.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
        const prevRow = byMonth.get(prevKey);
        const prevCount = prevRow?.count ?? 0;
        const prevRevenue = prevRow?.revenue ?? 0;
        const methods =
          prevRow && prevRow.byMethod.size > 0
            ? [...prevRow.byMethod.entries()].map(([m, v]) => `${m} (${v.count})`).join(" · ")
            : "—";
        const currency = (await getLicenseConfig()).currency || "GHS";
        const lines = [
          `Sales report for ${prevLabel}`,
          `Sales: ${prevCount}`,
          `Revenue: ${currency} ${prevRevenue.toLocaleString()}`,
          `By method: ${methods}`,
          "",
          "Open the Developer Console → Licensing → Sales report for the full cashbook, CSV and printable PDF.",
        ];
        await notify(
          { email: devEmail },
          lines.join("\n"),
          { subject: `GES School MIS — sales summary for ${prevLabel}`, useDevKeys: true }
        );
        res.monthlyEmailSent = true;
      }
      await setSetting("dev.sales.lastReportSentMonth", curKey);
    } else if (!lastSent) {
      // First-ever open: no previous month to report. Just record the marker.
      await setSetting("dev.sales.lastReportSentMonth", curKey);
    }
  } catch (e) {
    console.error("[sales-report] monthly email failed:", e instanceof Error ? e.message : e);
  }

  // Printable A4 report — brand header, monthly + annual tables, print styles.
  if (new URL(req.url).searchParams.get("format") === "print") {
    const rowsHtml = rows
      .map(
        (r) => `<tr><td>${esc(r.label)}</td><td>${r.count}</td><td>GHS ${r.revenue.toLocaleString()}</td><td>${r.byMethod.map((m) => `${esc(m.method)} (${m.count})`).join(" · ") || "—"}</td></tr>`
      )
      .join("");
    const yearsHtml = years.map((y) => `<div class="year"><strong>${esc(y.year)}</strong> · ${y.count} sale${y.count === 1 ? "" : "s"} · GHS ${y.revenue.toLocaleString()}</div>`).join("");
    const [school, config] = await Promise.all([getSchool(), getLicenseConfig()]);
    const schoolName = school?.name ?? "GES School MIS";
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Sales report — ${esc(schoolName)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Arial, sans-serif; color: #0f172a; margin: 0; padding: 0; }
  .sheet { max-width: 794px; margin: 0 auto; padding: 14mm 12mm; background: #fff; }
  .brand { display: flex; align-items: center; gap: 12px; border-bottom: 3px solid #059669; padding-bottom: 12px; }
  .brand img { height: 44px; width: auto; }
  .brand h1 { font-size: 20px; margin: 0; }
  .brand p { margin: 2px 0 0; font-size: 11px; color: #64748b; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; color: #047857; margin: 22px 0 8px; }
  .stats { display: flex; gap: 10px; margin: 10px 0; }
  .stat { flex: 1; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; }
  .stat b { display: block; font-size: 18px; }
  .stat span { font-size: 10px; text-transform: uppercase; color: #64748b; letter-spacing: 0.06em; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
  th { background: #ecfdf5; color: #065f46; }
  .total td { font-weight: 700; background: #f0fdf4; }
  .years { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
  .year { border: 1px solid #fde68a; background: #fffbeb; border-radius: 8px; padding: 6px 10px; font-size: 12px; }
  .footer { margin-top: 26px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 10px; color: #64748b; display: flex; justify-content: space-between; }
  @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } .no-print { display: none; } }
  .no-print { text-align: center; margin-top: 12px; }
  .no-print button { background: #059669; color: #fff; border: 0; border-radius: 8px; padding: 8px 18px; font-size: 13px; font-weight: 700; cursor: pointer; }
</style>
</head>
<body>
  <div class="sheet">
    <div class="brand">
      <img src="/sms-logo.png" alt="shacomputec" />
      <div>
        <h1>Sales Report — ${esc(schoolName)}</h1>
        <p>GES School MIS · generated ${new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} · developer console</p>
      </div>
    </div>

    <div class="stats">
      <div class="stat"><b>GHS ${res.totalRevenue.toLocaleString()}</b><span>Total revenue</span></div>
      <div class="stat"><b>${res.totalSales}</b><span>Total sales</span></div>
      <div class="stat"><b>GHS ${config.price.toLocaleString()}</b><span>License fee</span></div>
    </div>

    <h2>Monthly breakdown</h2>
    ${res.totalSales === 0 ? "<p style='color:#64748b;font-size:12px'>No settled sales yet.</p>" : `<table><thead><tr><th>Month</th><th>Sales</th><th>Revenue</th><th>By method</th></tr></thead><tbody>${rowsHtml}<tr class="total"><td>Total</td><td>${res.totalSales}</td><td>GHS ${res.totalRevenue.toLocaleString()}</td><td></td></tr></tbody></table>`}

    <h2>Annual summary (tax)</h2>
    <div class="years">${yearsHtml || "<p style='color:#64748b;font-size:12px'>No settled sales yet.</p>"}</div>

    <h2>Cashbook — every settled payment</h2>
    ${res.cashbook.length === 0 ? "<p style='color:#64748b;font-size:12px'>No settled payments yet.</p>" : `<table><thead><tr><th>Date</th><th>Reference</th><th>School / buyer</th><th>Method</th><th>Amount</th></tr></thead><tbody>${res.cashbook.map((c) => `<tr><td>${esc(new Date(c.date).toLocaleDateString("en-GB"))}</td><td>${esc(c.reference)}</td><td>${esc(c.buyer)}</td><td>${esc(c.method)}${c.provider ? ` (${esc(c.provider)})` : ""}</td><td>GHS ${c.amount.toLocaleString()}</td></tr>`).join("")}</tbody></table>`}

    <div class="footer">
      <span>shacomputec · shacomputecgh@gmail.com · +233 530 941 750</span>
      <span>Confidential — vendor records</span>
    </div>
    <div class="no-print"><button onclick="window.print()">🖨 Print / Save as PDF</button></div>
  </div>
</body>
</html>`;
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // CSV export — the developer keeps monthly records / hands to an accountant.
  if (new URL(req.url).searchParams.get("format") === "csv") {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, "\"\"")}"`;
    const csv = [
      ["Month", "Sales", "Revenue (GHS)", "By method"].map(esc).join(","),
      ...rows.map((r) => [r.label, r.count, r.revenue.toFixed(2), r.byMethod.map((m) => `${m.method} (${m.count})`).join(" ")].map(esc).join(",")),
      "",
      ["Total", res.totalSales, res.totalRevenue.toFixed(2), ""].map(esc).join(","),
    ].join("\r\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="sales-report-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return ok(res);
});

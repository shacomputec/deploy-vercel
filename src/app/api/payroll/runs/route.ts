import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok, readJson } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

/** Round money to 2 decimals. */
const money = (n: number) => Math.round(n * 100) / 100;

export const GET = handle(async () => {
  await requirePerm("payroll", "read");
  const runs = await prisma.payrollRun.findMany({
    orderBy: { month: "desc" },
    include: { _count: { select: { entries: true } } },
  });
  return ok(runs);
});

/**
 * Process payroll for a month: creates a run with one entry per active
 * teacher/staff, computing gross, SSF (5.5%), tax and net from the salary
 * scale matched by the employee's salaryGrade.
 */
export const POST = handle(async (req) => {
  const user = await requirePerm("payroll", "create");
  const body = await readJson<{ month: string; label?: string }>(req);
  const month = body.month ?? "";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new ApiError("Month must be in YYYY-MM format");

  const existing = await prisma.payrollRun.findUnique({ where: { month } });
  if (existing) throw new ApiError(`Payroll for ${month} already exists`, 409);

  const [teachers, staffList, scales] = await Promise.all([
    prisma.teacher.findMany({ where: { status: "ACTIVE" } }),
    prisma.staff.findMany({ where: { status: "ACTIVE" } }),
    prisma.salaryScale.findMany(),
  ]);
  const scaleByGrade = new Map(scales.map((s) => [s.grade, s]));
  const fallback = scales.find((s) => s.grade === "G07") ?? scales[0];
  if (!fallback) throw new ApiError("Create at least one salary scale first (Payroll → Salary Scales).", 400);

  const payees = [
    ...teachers.map((t) => ({ type: "TEACHER" as const, name: t.fullName, sid: t.staffId, grade: t.salaryGrade ?? "G07" })),
    ...staffList.map((s) => ({ type: "STAFF" as const, name: s.fullName, sid: s.staffId, grade: s.salaryGrade ?? "G08" })),
  ];
  if (payees.length === 0) throw new ApiError("No active teachers or staff to process.");

  const entries = payees.map((p) => {
    const scale = scaleByGrade.get(p.grade) ?? fallback;
    const basic = money(scale.basic);
    const allowance = money(scale.allowance ?? 0);
    const gross = money(basic + allowance);
    const ssf = money(gross * 0.055); // employee SSF contribution ≈ 5.5%
    const tax = money(gross * ((scale.taxRate ?? 5) / 100));
    const deductions = money(ssf + tax);
    return {
      employeeType: p.type,
      employeeName: p.name,
      staffId: p.sid,
      basic,
      allowance,
      gross,
      ssf,
      tax,
      deductions,
      net: money(gross - deductions),
      status: "PENDING",
    };
  });

  const [year, monthNum] = month.split("-");
  const monthName = new Date(Number(year), Number(monthNum) - 1, 1).toLocaleString("en-GB", { month: "long" });
  let run;
  try {
    run = await prisma.payrollRun.create({
      data: {
        month,
        label: body.label?.trim() || `${monthName} ${year}`,
        status: "PROCESSED",
        totalGross: money(entries.reduce((a, e) => a + e.gross, 0)),
        totalDeductions: money(entries.reduce((a, e) => a + e.deductions, 0)),
        totalNet: money(entries.reduce((a, e) => a + e.net, 0)),
        entriesCount: entries.length,
        processedAt: new Date(),
        entries: { create: entries },
      },
      include: { entries: true },
    });
  } catch (err) {
    // Unique constraint race on month -> treat as an existing run (409).
    if ((err as { code?: string }).code === "P2002") {
      throw new ApiError(`Payroll for ${month} already exists`, 409);
    }
    throw err;
  }
  await auditLog(user.id, "CREATE", "payroll", run.id, { month, employees: entries.length });
  return NextResponse.json({ ok: true, data: run }, { status: 201 });
});

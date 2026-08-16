import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson, ok } from "@/lib/api";
import { paymentSchema } from "@/lib/validators";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { notifyRoleInApp } from "@/lib/notify";
import { nextReceiptNo } from "@/lib/sequences";

export const GET = handle(async (req) => {
  const user = await requirePerm("fees", "read");
  const url = new URL(req.url);
  const studentId = url.searchParams.get("studentId");
  // `take` is used by the Billing tab which aggregates every student's paid
  // totals for accurate arrears — capped to keep the query sane.
  const take = Math.min(5000, Math.max(1, Number(url.searchParams.get("take") || 200)));
  const payments = await prisma.feePayment.findMany({
    where: studentId ? { studentId } : undefined,
    orderBy: { date: "desc" },
    take,
    include: { student: { select: { id: true, fullName: true, admissionNo: true, classId: true } } },
  });
  return ok(payments);
});

export const POST = handle(async (req) => {
  const user = await requirePerm("fees", "create");
  const parsed = paymentSchema.safeParse(await readJson(req));
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]!.message, 422);
  const d = parsed.data;

  const term = await prisma.term.findFirst({ where: { isCurrent: true } });
  const year = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
  const receiptNo = await nextReceiptNo();

  const payment = await prisma.feePayment.create({
    data: {
      receiptNo,
      studentId: d.studentId,
      amount: d.amount,
      method: d.method,
      reference: d.reference || null,
      paidBy: d.paidBy || user.fullName,
      date: d.date ? new Date(d.date) : new Date(),
      academicYearId: year?.id ?? null,
      termId: term?.id ?? null,
      note: d.note || null,
    },
  });
  await auditLog(user.id, "CREATE", "payments", payment.id, { amount: payment.amount, receiptNo: payment.receiptNo });
  await notifyRoleInApp(
    ["admin", "super_admin", "accountant", "headteacher"],
    "New payment received",
    `GHS ${d.amount.toLocaleString()} · ${d.method} · receipt ${receiptNo}`,
    "success",
    "/admin/fees",
  );
  return NextResponse.json({ ok: true, data: payment }, { status: 201 });
});

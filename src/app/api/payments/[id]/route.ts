import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

export const DELETE = handle(async (req, { params }) => {
  const user = await requirePerm("fees", "delete");
  const payment = await prisma.feePayment.findUnique({ where: { id: params.id } });
  if (!payment) throw new ApiError("Payment not found", 404);
  await prisma.feePayment.delete({ where: { id: params.id } });
  await auditLog(user.id, "DELETE", "payments", params.id, { receiptNo: payment.receiptNo });
  return ok({ deleted: true });
});

import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

/** Mark a payroll run as PAID and each entry as PAID. */
export const POST = handle(async (req, { params }) => {
  const user = await requirePerm("payroll", "update");
  const run = await prisma.payrollRun.findUnique({ where: { id: params.id } });
  if (!run) throw new ApiError("Payroll run not found", 404);
  if (run.status === "PAID") throw new ApiError("This run is already marked as paid.");

  const updated = await prisma.$transaction([
    prisma.payrollRun.update({ where: { id: run.id }, data: { status: "PAID" } }),
    prisma.payrollEntry.updateMany({ where: { payrollRunId: run.id }, data: { status: "PAID" } }),
  ]);
  await auditLog(user.id, "UPDATE", "payroll", run.id, { action: "mark_paid", month: run.month });
  return ok({ status: updated[0].status, paidEntries: updated[1].count });
});

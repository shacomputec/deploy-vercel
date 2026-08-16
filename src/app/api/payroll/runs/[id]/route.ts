import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

export const GET = handle(async (_req, { params }) => {
  await requirePerm("payroll", "read");
  const run = await prisma.payrollRun.findUnique({
    where: { id: params.id },
    include: { entries: { orderBy: { employeeName: "asc" } } },
  });
  if (!run) throw new ApiError("Payroll run not found", 404);
  return ok(run);
});

export const DELETE = handle(async (req, { params }) => {
  const user = await requirePerm("payroll", "delete");
  const run = await prisma.payrollRun.findUnique({ where: { id: params.id } });
  if (!run) throw new ApiError("Payroll run not found", 404);
  if (run.status !== "DRAFT" && run.status !== "PROCESSED") {
    throw new ApiError("Only draft or processed runs can be deleted.", 400);
  }
  await prisma.payrollRun.delete({ where: { id: params.id } });
  await auditLog(user.id, "DELETE", "payroll", params.id, { month: run.month });
  return ok({ deleted: true });
});

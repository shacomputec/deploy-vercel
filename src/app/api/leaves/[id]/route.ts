import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok, readJson } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

/** Decide (approve / reject) or delete a leave request. HR module. */
export const PUT = handle(async (req, { params }) => {
  const user = await requirePerm("payroll", "update");
  const body = await readJson<{ status: "APPROVED" | "REJECTED"; note?: string }>(req);
  if (!["APPROVED", "REJECTED"].includes(body.status)) {
    throw new ApiError("Status must be APPROVED or REJECTED");
  }
  const row = await prisma.staffLeave.update({
    where: { id: params.id },
    data: {
      status: body.status,
      decidedById: user.id,
      decidedAt: new Date(),
      adminNote: body.note?.trim() || null,
    },
    include: { staff: { select: { fullName: true, staffId: true } } },
  });
  await auditLog(user.id, "UPDATE", "staffLeaves", params.id, { status: body.status });
  return ok(row);
});

export const DELETE = handle(async (req, { params }) => {
  const user = await requirePerm("payroll", "delete");
  await prisma.staffLeave.delete({ where: { id: params.id } });
  await auditLog(user.id, "DELETE", "staffLeaves", params.id);
  return ok({ deleted: true });
});

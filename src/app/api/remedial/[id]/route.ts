import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

export const DELETE = handle(async (req, { params }) => {
  const user = await requirePerm("remedial", "delete");
  const existing = await prisma.remedialClass.findUnique({ where: { id: params.id } });
  if (!existing) throw new ApiError("Remedial session not found", 404);
  await prisma.remedialClass.delete({ where: { id: params.id } });
  await auditLog(user.id, "DELETE", "remedial", params.id);
  return ok({ deleted: true });
});

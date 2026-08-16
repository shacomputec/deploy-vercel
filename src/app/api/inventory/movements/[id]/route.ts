import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";

export const GET = handle(async (_req, { params }) => {
  await requirePerm("inventory", "read");
  const movement = await prisma.stockMovement.findUnique({
    where: { id: params.id },
    include: { item: { select: { id: true, name: true, sku: true, unit: true } } },
  });
  if (!movement) throw new ApiError("Movement not found", 404);
  return ok(movement);
});

// Movements are an immutable audit trail — stock corrections go through a new ADJUST record.
export const PUT = handle(async () => {
  throw new ApiError("Movements cannot be edited", 403);
});
export const DELETE = handle(async () => {
  throw new ApiError("Movements cannot be deleted — record a correcting ADJUST instead", 403);
});

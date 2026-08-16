import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson, ok } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

/**
 * Stock movements are the single source of truth for quantities:
 *   IN     → adds to the item's quantity
 *   OUT    → deducts (rejected if insufficient stock)
 *   ADJUST → sets the quantity to the absolute value supplied
 * The item status (ACTIVE | LOW | OUT) is recomputed automatically.
 */
function nextStatus(quantity: number, reorderLevel: number) {
  if (quantity <= 0) return "OUT";
  if (quantity <= reorderLevel) return "LOW";
  return "ACTIVE";
}

export const GET = handle(async () => {
  await requirePerm("inventory", "read");
  const movements = await prisma.stockMovement.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
    include: { item: { select: { id: true, name: true, sku: true, unit: true } } },
  });
  return ok(movements);
});

export const POST = handle(async (req) => {
  const user = await requirePerm("inventory", "create");
  const body = await readJson<Record<string, unknown>>(req);

  const itemId = String(body.itemId || "");
  const type = String(body.type || "").toUpperCase();
  const quantity = Math.round(Number(body.quantity));
  if (!["IN", "OUT", "ADJUST"].includes(type)) throw new ApiError("Type must be IN, OUT or ADJUST", 422);
  if (type !== "ADJUST" && (!Number.isFinite(quantity) || quantity <= 0)) {
    throw new ApiError("Quantity must be a positive number", 422);
  }
  if (type === "ADJUST" && (!Number.isFinite(quantity) || quantity < 0)) {
    throw new ApiError("Adjusted quantity must be 0 or more", 422);
  }

  // Read + write inside a single transaction (serialized on SQLite) so concurrent
  // IN/OUT requests can never lose updates or drive the quantity negative.
  const { movement, quantity: newQty, itemName } = await prisma.$transaction(async (p) => {
    const item = await p.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) throw new ApiError("Inventory item not found", 404);

    let qty = item.quantity;
    if (type === "IN") qty = item.quantity + quantity;
    else if (type === "OUT") {
      if (quantity > item.quantity) {
        throw new ApiError(`Insufficient stock — only ${item.quantity} ${item.unit ?? "units"} available`, 422);
      }
      qty = item.quantity - quantity;
    } else qty = quantity; // ADJUST = absolute value

    const unitCost = body.unitCost !== undefined && body.unitCost !== "" ? Number(body.unitCost) : null;

    const movement = await p.stockMovement.create({
      data: {
        itemId,
        type,
        quantity,
        unitCost: unitCost ?? (type === "IN" ? item.unitCost : null),
        note: body.note ? String(body.note) : null,
        recordedById: user.id,
      },
    });
    const updated = await p.inventoryItem.update({
      where: { id: itemId },
      data: { quantity: qty, status: nextStatus(qty, item.reorderLevel) },
    });
    return { movement, quantity: updated.quantity, itemName: item.name };
  });

  await auditLog(user.id, "CREATE", "inventory.movements", movement.id, {
    item: itemName,
    type,
    quantity,
    newQty,
  });
  return NextResponse.json({ ok: true, data: { movement, quantity: newQty } }, { status: 201 });
});

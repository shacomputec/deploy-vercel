import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok, rateLimit, clientIp } from "@/lib/api";
import { verifyAndSettle } from "@/lib/payments";

export const GET = handle(async (req) => {
  rateLimit(`paystatus:${clientIp(req)}`, 60, 60_000);
  const url = new URL(req.url);
  const reference = url.searchParams.get("reference");
  if (!reference) throw new ApiError("Missing reference", 422);

  const tx = await prisma.paymentGatewayTx.findUnique({ where: { reference } });
  if (!tx) throw new ApiError("Transaction not found", 404);

  const result = await verifyAndSettle(tx.id);
  return ok({
    reference,
    status: result.status,
    receiptNo: result.receiptNo ?? null,
    checkoutUrl: tx.checkoutUrl,
    amount: tx.amount,
    method: tx.method,
  });
});

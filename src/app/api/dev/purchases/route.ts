import { handle, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const requireDeveloper = async () => {
  const user = await getCurrentUser();
  if (!user) throw { status: 401, message: "Authentication required" };
  if (user.role.name !== "developer") throw { status: 403, message: "Developer only" };
  return user;
};

export type AbandonedPurchaseRow = {
  id: string;
  reference: string;
  schoolCode: string;
  buyerName: string | null;
  amount: number;
  method: string;
  provider: string | null;
  status: string; // PENDING | FAILED | EXPIRED
  deliveryEmail: string | null;
  deliveryPhone: string | null;
  checkoutUrl: string | null;
  createdAt: string;
};

/**
 * GET /api/dev/purchases — abandoned or unfinished public purchases from the
 * /buy page (purpose LICENSE_PURCHASE that never settled). Lets the developer
 * follow up with buyers who started paying but did not finish.
 */
export const GET = handle(async () => {
  await requireDeveloper();
  const txs = await prisma.paymentGatewayTx.findMany({
    where: {
      purpose: "LICENSE_PURCHASE",
      status: { in: ["PENDING", "FAILED", "EXPIRED"] },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      reference: true,
      schoolId: true,
      buyerName: true,
      amount: true,
      method: true,
      provider: true,
      status: true,
      deliveryEmail: true,
      deliveryPhone: true,
      checkoutUrl: true,
      createdAt: true,
    },
  });
  const rows: AbandonedPurchaseRow[] = txs.map((t) => ({
    id: t.id,
    reference: t.reference,
    schoolCode: t.schoolId,
    buyerName: t.buyerName,
    amount: t.amount,
    method: t.method,
    provider: t.provider,
    status: t.status,
    deliveryEmail: t.deliveryEmail,
    deliveryPhone: t.deliveryPhone,
    checkoutUrl: t.checkoutUrl,
    createdAt: t.createdAt.toISOString(),
  }));
  return ok(rows);
});

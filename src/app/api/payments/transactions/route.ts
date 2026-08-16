import { prisma } from "@/lib/prisma";
import { handle, ok } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";

export const GET = handle(async (req) => {
  await requirePerm("fees", "read");
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const txs = await prisma.paymentGatewayTx.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { student: { select: { id: true, fullName: true, admissionNo: true } } },
  });
  return ok(txs);
});

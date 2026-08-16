import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentSettings, getDevPaymentSettings, momoCheckStatus, settleGatewayTx } from "@/lib/payments";

/**
 * MTN MoMo callback. The payload is not authenticated, so we only use it as a
 * trigger: the real status is re-fetched from the MTN API before settling.
 */
export const POST = async (req: Request) => {
  let body: { referenceId?: string; status?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const referenceId = body.referenceId;
  if (!referenceId) return NextResponse.json({ ok: false, error: "Missing referenceId" }, { status: 400 });

  const tx = await prisma.paymentGatewayTx.findFirst({ where: { providerRef: referenceId } });
  if (!tx) return NextResponse.json({ ok: true }); // unknown ref — ignore silently

  if (body.status === "SUCCESSFUL" || body.status === "PENDING") {
    // License payments settle against the developer's keys; fee payments against the school's.
    const s = tx.purpose === "LICENSE" || tx.purpose === "LICENSE_PURCHASE" ? await getDevPaymentSettings() : await getPaymentSettings();
    const status = await momoCheckStatus(referenceId, s, (tx.provider as "MTN" | "AIRTELTIGO" | "TELECEL") ?? "MTN");
    if (status.status === "SUCCESSFUL") {
      await settleGatewayTx(tx.id);
    }
  }
  return NextResponse.json({ ok: true });
};

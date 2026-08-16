import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentSettings, getDevPaymentSettings, paystackSignatureOk, settleGatewayTx } from "@/lib/payments";

/**
 * Paystack webhook — verify the HMAC-SHA512 signature over the raw body, then
 * settle on charge.success. LICENSE transactions are signed with the
 * DEVELOPER's keys (the developer's business), fee payments with the school's
 * — so the transaction is looked up first and the right settings verify the
 * signature.
 */
export const POST = async (req: Request) => {
  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  let event: { event?: string; data?: { reference?: string } } = {};
  try {
    event = JSON.parse(raw) as typeof event;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  if (event.event !== "charge.success" || !event.data?.reference) {
    return NextResponse.json({ ok: true });
  }

  const tx = await prisma.paymentGatewayTx.findFirst({
    where: { providerRef: event.data.reference },
  });

  // License payments are the developer's business → their keys verify the
  // signature; fee payments use the school's own keys. For an unknown reference
  // we cannot know which keys signed it — reject with the school keys, exactly
  // like the legacy behaviour (unsigned/forged webhooks must never be accepted).
  const s = tx?.purpose === "LICENSE" || tx?.purpose === "LICENSE_PURCHASE" ? await getDevPaymentSettings() : await getPaymentSettings();
  if (!paystackSignatureOk(raw, signature, s)) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }
  if (!tx) return NextResponse.json({ ok: true }); // signed but unknown ref — ignore

  await settleGatewayTx(tx.id);
  return NextResponse.json({ ok: true });
};

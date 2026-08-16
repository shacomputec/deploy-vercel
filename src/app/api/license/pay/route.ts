import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson, ok, rateLimit, clientIp } from "@/lib/api";
import {
  getDevPaymentSettings, gatewayConfigured, gatewayLiveReady, needsSimulation, genPaymentRef,
  momoRequestToPay, paystackInitialize,
} from "@/lib/payments";
import { getLicenseConfig } from "@/lib/license";
import { getCurrentUser } from "@/lib/auth";

/**
 * Pay for a license activation online.
 * Creates a LICENSE-purpose gateway transaction and initiates the payment
 * through the DEVELOPER's MTN Mobile Money or Paystack (their own keys — the
 * school's keys are never used). Settlement (see payments.ts) flips the
 * license to ACTIVE the moment the gateway confirms the charge — the checkout
 * polls /api/payments/status the same way fee payments do.
 *
 * AUTH: any signed-in user of the school may initiate (it charges the
 * DEVELOPER at the fixed license price). Rate-limited per user, and the amount
 * is always the developer's configured license price — never user-supplied.
 * LICENSE payments are NEVER simulated: without the developer's live gateway
 * keys the request fails clearly, so nobody can activate for free.
 */
export const POST = handle(async (req) => {
  const user = await getCurrentUser();
  if (!user) throw new ApiError("Authentication required", 401);
  rateLimit(`licpay:${user.id}`, 10, 60_000);

  const body = await readJson<{ method?: string; phone?: string; email?: string; deliveryPhone?: string }>(req);
  const method = String(body.method || "").toUpperCase();
  if (method !== "MOMO" && method !== "PAYSTACK") throw new ApiError("Payment method must be MOMO or PAYSTACK", 422);

  const config = await getLicenseConfig();
  // License payments are the DEVELOPER's business — they run on the developer's
  // own gateway keys (dev.payments.*), never the school's. Schools configure
  // their own keys for their own fee collections.
  const s = await getDevPaymentSettings();
  // A gateway that is enabled but not fully live-ready (e.g. MTN live without
  // the portal-issued API User ID / API Key) must NOT fall through to a 502 —
  // the buyer gets the same clean "pay the developer directly" guidance.
  const ready =
    gatewayConfigured(s, method) &&
    (method === "PAYSTACK" || gatewayLiveReady(s));
  if (!needsSimulation(s, method) && !ready) {
    throw new ApiError(
      method === "MOMO"
        ? "Mobile money is not enabled for license payments yet. Contact your developer to activate."
        : "Paystack is not enabled for license payments yet. Contact your developer to activate.",
      422
    );
  }

  let phone: string | null = null;
  if (method === "MOMO") {
    phone = String(body.phone || "").trim();
    if (!phone) throw new ApiError("A mobile money number is required to receive the payment prompt", 422);
  }

  // The BUYER's own contact — the license key is delivered here the instant
  // the payment confirms. Never the developer's contact.
  const deliveryEmail = String(body.email || "").trim().toLowerCase();
  const deliveryPhone = String(body.deliveryPhone || body.phone || "").trim();
  if (method === "PAYSTACK" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(deliveryEmail)) {
    throw new ApiError("Your email address is required so we can send your license key after payment.", 422);
  }
  if (!deliveryPhone && !deliveryEmail) {
    throw new ApiError("A phone number or email is required so we can deliver your license key after payment.", 422);
  }

  // Reuse the same reference format so the checkout can poll /api/payments/status
  const reference = genPaymentRef();
  const origin = new URL(req.url).origin;
  const email = deliveryEmail || config.developerEmail || "license@school.local";

  // Stamp the transaction with THIS school's license code so settlement
  // activates the right school's license — never another school's key.
  const currentLicense = await prisma.license.findFirst({ orderBy: { createdAt: "desc" } });

  const tx = await prisma.paymentGatewayTx.create({
    data: {
      reference,
      purpose: "LICENSE",
      amount: config.price,
      method,
      status: "PENDING",
      phone,
      schoolId: currentLicense?.schoolId ?? undefined,
      deliveryEmail: deliveryEmail || null,
      deliveryPhone: deliveryPhone || null,
    },
  });

  // License payments are NEVER simulated — a buyer must not be able to
  // activate for free. If the developer's gateway isn't configured, direct
  // them to the developer (direct mobile money / contact) instead.
  if (needsSimulation(s, method)) {
    await prisma.paymentGatewayTx.update({ where: { id: tx.id }, data: { status: "FAILED" } });
    throw new ApiError(
      `Online license payment is not available yet — pay directly to the developer's mobile money numbers or contact ${config.developerName || "your developer"}.`,
      422
    );
  }

  try {
    if (method === "MOMO") {
      const providerRef = await momoRequestToPay({ reference, amount: config.price, phone: phone!, purpose: "LICENSE" }, s, origin);
      await prisma.paymentGatewayTx.update({ where: { id: tx.id }, data: { providerRef } });
      return ok({
        reference,
        status: "PENDING",
        message: `A payment prompt for GH₵${config.price.toFixed(2)} has been sent to your phone. Dial *170# and confirm to activate instantly.`,
      });
    }
    // PAYSTACK
    const init = await paystackInitialize({ reference, amount: config.price, purpose: "LICENSE" }, s, email, origin);
    await prisma.paymentGatewayTx.update({ where: { id: tx.id }, data: { providerRef: init.providerRef, checkoutUrl: init.checkoutUrl } });
    return ok({
      reference,
      status: "PENDING",
      checkoutUrl: init.checkoutUrl,
      message: `Complete payment of GH₵${config.price.toFixed(2)} on the secure checkout — your license activates instantly.`,
    });
  } catch (e) {
    await prisma.paymentGatewayTx.update({ where: { id: tx.id }, data: { status: "FAILED" } });
    throw e;
  }
});

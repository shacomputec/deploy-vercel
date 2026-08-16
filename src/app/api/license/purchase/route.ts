import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson, ok, rateLimit, clientIp } from "@/lib/api";
import {
  getDevPaymentSettings, gatewayConfigured, gatewayLiveReady, needsSimulation, genPaymentRef,
  momoRequestToPay, paystackInitialize,
} from "@/lib/payments";
import { getLicenseConfig } from "@/lib/license";

/**
 * PUBLIC "Buy this system" checkout — no sign-in required.
 *
 * A school that has NOT bought the system yet pays the DEVELOPER for a
 * license online. This route:
 *   - never touches this deployment's License row (the buyer will run their
 *     own installation),
 *   - mints a fresh key for the BUYER's school code at settlement,
 *   - delivers it instantly to the buyer's own email / WhatsApp / SMS,
 *   - records the sale in the Developer Console (VendorSchool + issuances),
 *     so the developer sees who bought and can lock that school if needed.
 *
 * Payment runs on the DEVELOPER's gateway keys (dev.payments.*) — the school's
 * keys are never used. Rate-limited per IP. The amount is always the
 * developer's configured license price — never user-supplied. LICENSE payments
 * are NEVER simulated.
 */
export const POST = handle(async (req) => {
  const ip = clientIp(req);
  rateLimit(`licpurchase:${ip}`, 5, 60_000);

  const body = await readJson<{ schoolName?: string; tier?: string; method?: string; email?: string; phone?: string }>(req);
  const method = String(body.method || "").toUpperCase();
  if (method !== "MOMO" && method !== "PAYSTACK") throw new ApiError("Payment method must be MOMO or PAYSTACK", 422);
  const tier = body.tier === "shs" ? "shs" : "basic";

  // The BUYER's school name becomes the SCHOOLID embedded in their license key
  // (e.g. "Golden Gate Academy" → GOLDENGATE). It is what the Developer Console
  // shows for this school, and what the developer locks when payment fails.
  const schoolName = String(body.schoolName || "").trim();
  if (schoolName.length < 2) throw new ApiError("Please enter your school's name", 422);
  const code = schoolName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 14) || "NEWSCHOOL";

  const config = await getLicenseConfig();
  const s = await getDevPaymentSettings();
  const amount = tier === "shs" ? config.priceShs : config.priceBasic;
  // An enabled-but-not-live-ready gateway (e.g. MTN live missing the portal
  // API User ID / API Key) must give clean guidance, never a 502 crash.
  const ready =
    gatewayConfigured(s, method) &&
    (method === "PAYSTACK" || gatewayLiveReady(s));
  if (!needsSimulation(s, method) && !ready) {
    throw new ApiError(
      method === "MOMO"
        ? "Mobile money is not enabled for online purchases yet. Contact the developer to arrange direct payment."
        : "Online card payment is not enabled yet. Contact the developer to arrange direct payment.",
      422
    );
  }

  let phone: string | null = null;
  if (method === "MOMO") {
    phone = String(body.phone || "").trim();
    if (!/^(\+?233|0)[0-9]{9}$/.test(phone.replace(/\s/g, "")))
      throw new ApiError("A valid Ghanaian mobile money number is required", 422);
  }
  const deliveryEmail = String(body.email || "").trim().toLowerCase();
  const deliveryPhone = String(body.phone || "").trim();
  if (method === "PAYSTACK" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(deliveryEmail)) {
    throw new ApiError("Your email address is required so we can send your license key after payment.", 422);
  }
  if (!deliveryPhone && !deliveryEmail) {
    throw new ApiError("A phone number or email is required so we can deliver your license key after payment.", 422);
  }

  const reference = genPaymentRef();
  const origin = new URL(req.url).origin;

  const tx = await prisma.paymentGatewayTx.create({
    data: {
      reference,
      purpose: "LICENSE_PURCHASE",
      amount,
      method,
      status: "PENDING",
      phone,
      schoolId: code, // the BUYER's school code — never this deployment's
      buyerName: schoolName,
      deliveryEmail: deliveryEmail || null,
      deliveryPhone: deliveryPhone || null,
      meta: JSON.stringify({ tier }),
    },
  });

  // Never simulated — a buyer must not get a key for free.
  if (needsSimulation(s, method)) {
    await prisma.paymentGatewayTx.update({ where: { id: tx.id }, data: { status: "FAILED" } });
    throw new ApiError(
      `Online purchase is not available yet — contact ${config.developerName || "the developer"} at ${config.developerPhone || config.developerEmail || "directly"} to arrange payment.`,
      422
    );
  }

  try {
    if (method === "MOMO") {
      const providerRef = await momoRequestToPay({ reference, amount, phone: phone!, purpose: "LICENSE" }, s, origin);
      await prisma.paymentGatewayTx.update({ where: { id: tx.id }, data: { providerRef } });
      return ok({
        reference,
        status: "PENDING",
        message: `A payment prompt for GH₵${amount.toFixed(2)} has been sent to ${phone}. Dial *170# and confirm — your license key arrives instantly.`,
      });
    }
    // PAYSTACK
    const init = await paystackInitialize({ reference, amount, purpose: "LICENSE" }, s, deliveryEmail, origin);
    await prisma.paymentGatewayTx.update({ where: { id: tx.id }, data: { providerRef: init.providerRef, checkoutUrl: init.checkoutUrl } });
    return ok({
      reference,
      status: "PENDING",
      checkoutUrl: init.checkoutUrl,
      message: `Complete payment of GH₵${amount.toFixed(2)} on the secure checkout — your license key arrives instantly.`,
    });
  } catch (e) {
    await prisma.paymentGatewayTx.update({ where: { id: tx.id }, data: { status: "FAILED" } });
    throw e;
  }
});

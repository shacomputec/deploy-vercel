import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson, ok, rateLimit, clientIp } from "@/lib/api";
import {
  getDevPaymentSettings, gatewayConfigured, gatewayLiveReady, needsSimulation, genPaymentRef,
  momoRequestToPay, paystackInitialize,
} from "@/lib/payments";
import { getLicenseConfig } from "@/lib/license";
import { requirePerm } from "@/lib/permissions";

/** Normalise a school name into its row id (slug) — mirrors POST /api/schools. */
function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24) || "school";
}

type SchoolProfile = {
  name?: string; shortName?: string; motto?: string; phone?: string; email?: string;
  address?: string; district?: string; region?: string;
  primaryColor?: string; accentColor?: string;
};

const MAX_BATCH = 20;

/**
 * ADDITIONAL-SCHOOL PURCHASE — a signed-in Super Admin / Admin adding another
 * school profile to the SAME installation pays the DEVELOPER for it before the
 * school is created. Supports batches: one checkout covering several schools
 * (total = price × count).
 *
 * The school profile(s) are held PENDING on the transaction (`meta`), and are
 * only turned into real School rows (each with its own ACTIVE license) when the
 * payment settles — so no school is ever created without being paid for.
 *
 * Payment runs on the DEVELOPER's gateway keys (dev.payments.*) — the school's
 * own keys are never used — and is NEVER simulated (a school must not be
 * created for free).
 */
/** Price + payment availability for the "Add another school" popup.
 *  Only the public key / availability flags — never any secret. */
export const GET = handle(async () => {
  await requirePerm("settings", "read");
  const config = await getLicenseConfig();
  const s = await getDevPaymentSettings();
  return ok({
    price: config.price,
    priceBasic: config.priceBasic,
    priceShs: config.priceShs,
    currency: config.currency,
    paystackEnabled: config.paystackEnabled,
    testMode: s.testMode,
    developerName: config.developerName,
    developerPhone: config.developerPhone,
  });
});

export const POST = handle(async (req) => {
  const user = await requirePerm("settings", "update");
  rateLimit(`schoolpurchase:${clientIp(req)}:${user.id}`, 5, 60_000);

  const body = await readJson<{
    schools?: SchoolProfile[];
    tier?: string;
    name?: string; shortName?: string; motto?: string; phone?: string; email?: string;
    address?: string; district?: string; region?: string;
    primaryColor?: string; accentColor?: string;
    method?: string; deliveryEmail?: string; deliveryPhone?: string;
  }>(req);

  const method = String(body.method || "").toUpperCase();
  if (method !== "MOMO" && method !== "PAYSTACK") {
    throw new ApiError("Payment method must be MOMO or PAYSTACK", 422);
  }
  const tier = body.tier === "shs" ? "shs" : "basic";

  // Normalise the batch — either `schools: [...]` or the legacy single profile.
  const raw = Array.isArray(body.schools) && body.schools.length ? body.schools : [body];
  if (raw.length > MAX_BATCH) throw new ApiError(`A batch can have at most ${MAX_BATCH} schools.`, 422);

  const schools: (SchoolProfile & { name: string; slug: string; code: string })[] = [];
  const seen = new Set<string>();
  for (const s of raw) {
    const name = String(s.name || "").trim();
    if (name.length < 2) throw new ApiError("Every school needs a name (min 2 characters).", 422);
    const slug = slugify(name);
    if (seen.has(slug)) throw new ApiError(`Duplicate school in this batch: “${name}”.`, 422);
    seen.add(slug);
    schools.push({
      ...s,
      name,
      slug,
      code: name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 14) || "NEWSCHOOL",
    });
  }

  // None of them may already exist (id conflict would fail settlement).
  const existing = await prisma.school.findMany({ where: { id: { in: schools.map((s) => s.slug) } }, select: { id: true } });
  if (existing.length) {
    const names = schools.filter((s) => existing.some((e) => e.id === s.slug)).map((s) => s.name);
    throw new ApiError(`Already exists — switch to it or rename: ${names.join(", ")}`, 409);
  }

  const config = await getLicenseConfig();
  const s = await getDevPaymentSettings();
  const tierPrice = tier === "shs" ? config.priceShs : config.priceBasic;
  const ready =
    gatewayConfigured(s, method) && (method === "PAYSTACK" || gatewayLiveReady(s));
  if (!needsSimulation(s, method) && !ready) {
    throw new ApiError(
      method === "MOMO"
        ? "Mobile money purchases are not enabled yet. Contact the developer to arrange payment."
        : "Online card payment is not enabled yet. Contact the developer to arrange payment.",
      422,
    );
  }

  let phone: string | null = null;
  if (method === "MOMO") {
    phone = String(body.deliveryPhone || "").trim();
    if (!/^(\+?233|0)[0-9]{9}$/.test(phone.replace(/\s/g, ""))) {
      throw new ApiError("A valid Ghanaian mobile money number is required", 422);
    }
  }
  const deliveryEmail = String(body.deliveryEmail || "").trim().toLowerCase();
  const deliveryPhone = String(body.deliveryPhone || "").trim();
  if (method === "PAYSTACK" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(deliveryEmail)) {
    throw new ApiError("Your email address is required so we can send your receipt and license details.", 422);
  }
  if (!deliveryPhone && !deliveryEmail) {
    throw new ApiError("A phone number or email is required for your receipt.", 422);
  }

  const count = schools.length;
  const total = tierPrice * count;
  const reference = genPaymentRef();
  const origin = new URL(req.url).origin;
  const firstName = schools[0]!.name;

  const tx = await prisma.paymentGatewayTx.create({
    data: {
      reference,
      purpose: "SCHOOL",
      amount: total,
      method,
      status: "PENDING",
      phone,
      schoolId: schools[0]!.code,
      buyerName: count === 1 ? firstName : `${count} schools batch`,
      deliveryEmail: deliveryEmail || null,
      deliveryPhone: deliveryPhone || null,
      // The pending school profile(s) — settled into real School rows on success.
      meta: JSON.stringify({
        batch: count > 1,
        tier,
        schools: schools.map((sc) => ({
          slug: sc.slug,
          name: sc.name,
          shortName: sc.shortName || null,
          motto: sc.motto || null,
          phone: sc.phone || null,
          email: sc.email || null,
          address: sc.address || null,
          district: sc.district || null,
          region: sc.region || null,
          primaryColor: sc.primaryColor || "#047857",
          accentColor: sc.accentColor || "#d97706",
        })),
      }),
    },
  });

  // Never simulated — an additional school must be paid for.
  if (needsSimulation(s, method)) {
    await prisma.paymentGatewayTx.update({ where: { id: tx.id }, data: { status: "FAILED" } });
    throw new ApiError(
      `Online purchase is not available yet — contact ${config.developerName || "the developer"} at ${config.developerPhone || config.developerEmail || "directly"} to arrange payment.`,
      422,
    );
  }

  const label = count === 1 ? `“${firstName}”` : `${count} schools`;
  try {
    if (method === "MOMO") {
      const providerRef = await momoRequestToPay(
        { reference, amount: total, phone: phone!, purpose: "LICENSE" },
        s,
        origin,
      );
      await prisma.paymentGatewayTx.update({ where: { id: tx.id }, data: { providerRef } });
      return ok({
        reference,
        status: "PENDING",
        message: `A payment prompt for GH₵${total.toFixed(2)} has been sent to ${phone}. Dial *170# and confirm — ${label} ${count === 1 ? "is" : "are"} created the instant it settles.`,
      });
    }
    const init = await paystackInitialize(
      { reference, amount: total, purpose: "LICENSE" },
      s,
      deliveryEmail,
      origin,
    );
    await prisma.paymentGatewayTx.update({
      where: { id: tx.id },
      data: { providerRef: init.providerRef, checkoutUrl: init.checkoutUrl },
    });
    return ok({
      reference,
      status: "PENDING",
      checkoutUrl: init.checkoutUrl,
      message: `Complete payment of GH₵${total.toFixed(2)} on the secure checkout — ${label} ${count === 1 ? "is" : "are"} created the instant it settles.`,
    });
  } catch (e) {
    await prisma.paymentGatewayTx.update({ where: { id: tx.id }, data: { status: "FAILED" } });
    throw e;
  }
});

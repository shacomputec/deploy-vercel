import { prisma } from "@/lib/prisma";
import { getSchool } from "@/lib/school";
import { handle, ApiError, readJson, ok, rateLimit, clientIp } from "@/lib/api";
import {
  getPaymentSettings, gatewayConfigured, needsSimulation, genPaymentRef,
  momoRequestToPay, paystackInitialize, MOMO_PROVIDERS, type MomoProvider,
} from "@/lib/payments";

export const POST = handle(async (req) => {
  rateLimit(`pay:${clientIp(req)}`, 10, 60_000); // max 10 initiate calls / min / IP

  const body = await readJson<{ studentId?: string; admissionNo?: string; amount?: number; method?: string; provider?: string; phone?: string }>(req);
  const amount = Number(body.amount);
  const method = String(body.method || "").toUpperCase();
  if (!Number.isFinite(amount) || amount <= 0) throw new ApiError("Enter a valid amount", 422);
  if (method !== "MOMO" && method !== "PAYSTACK") throw new ApiError("Payment method must be MOMO or PAYSTACK", 422);

  // MoMo network: MTN (default) | AIRTELTIGO | TELECEL
  let provider: MomoProvider = "MTN";
  if (method === "MOMO") {
    const raw = String(body.provider || "MTN").toUpperCase();
    if (!(MOMO_PROVIDERS as string[]).includes(raw)) throw new ApiError("provider must be MTN, AIRTELTIGO or TELECEL", 422);
    provider = raw as MomoProvider;
  }

  const student = body.studentId
    ? await prisma.student.findUnique({ where: { id: body.studentId }, include: { parents: { include: { parent: true }, take: 1 } } })
    : body.admissionNo
      ? await prisma.student.findUnique({ where: { admissionNo: body.admissionNo }, include: { parents: { include: { parent: true }, take: 1 } } })
      : null;
  if (!student) throw new ApiError("Student not found. Check the admission number.", 404);

  const s = await getPaymentSettings();
  if (!needsSimulation(s, method, provider) && !gatewayConfigured(s, method, provider)) {
    throw new ApiError(
      method === "MOMO" ? `${provider} Mobile Money is not enabled for online payments yet. Pay at the accounts office.` : "Paystack is not enabled for online payments yet. Pay at the accounts office.",
      422
    );
  }

  let phone: string | null = null;
  if (method === "MOMO") {
    phone = String(body.phone || student.phone || "").trim();
    if (!phone) throw new ApiError("A mobile money number is required", 422);
  }

  const reference = genPaymentRef();
  // Paystack requires a real, deliverable-looking email — never a `.local` TLD.
  // Fall back to the school's own address when the student/parent have none.
  const school = await getSchool();
  const email =
    student.email ||
    student.parents[0]?.parent.email ||
    school?.email ||
    school?.developerEmail ||
    `fees@${(school?.name || "school").toLowerCase().replace(/[^a-z0-9]+/g, "")}.school`;
  const origin = new URL(req.url).origin;

  const tx = await prisma.paymentGatewayTx.create({
    data: { reference, studentId: student.id, amount, method, provider: method === "MOMO" ? provider : null, status: "PENDING", phone },
  });

  // simulate when test mode is on and the gateway has no keys
  if (needsSimulation(s, method, provider)) {
    return ok({
      reference,
      status: "PENDING",
      simulated: true,
      message: `Test mode — no ${provider} keys configured. This payment will be confirmed automatically.`,
    });
  }

  try {
    if (method === "MOMO") {
      const providerRef = await momoRequestToPay({ reference, amount, phone: phone!, provider }, s, origin);
      await prisma.paymentGatewayTx.update({ where: { id: tx.id }, data: { providerRef } });
      return ok({
        reference,
        status: "PENDING",
        message: "A payment prompt has been sent to your phone. Dial *170# and confirm to complete payment.",
      });
    }
    // PAYSTACK
    const init = await paystackInitialize({ reference, amount }, s, email, origin);
    await prisma.paymentGatewayTx.update({ where: { id: tx.id }, data: { providerRef: init.providerRef, checkoutUrl: init.checkoutUrl } });
    return ok({
      reference,
      status: "PENDING",
      checkoutUrl: init.checkoutUrl,
      message: "Complete your payment on the Paystack checkout page.",
    });
  } catch (e) {
    await prisma.paymentGatewayTx.update({ where: { id: tx.id }, data: { status: "FAILED" } });
    throw e;
  }
});

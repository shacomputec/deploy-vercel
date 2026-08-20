import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok, readJson, rateLimit } from "@/lib/api";
import { setSetting } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { getLicenseStatus, getLicenseConfig, validateLicenseKey, generateLicenseKey, isKeyRevoked, getThisSchoolCode } from "@/lib/license";

export const GET = handle(async () => {
  // Any authenticated user may see their license STATUS and the BUYER-SAFE
  // payment options (price, MoMo numbers, developer contact, whether Paystack
  // payment is available). No gateway/API keys are ever returned — even the
  // Paystack public key is stripped for everyone below the Developer role.
  const user = await getCurrentUser();
  if (!user) throw new ApiError("Authentication required", 401);
  const [status, config] = await Promise.all([getLicenseStatus(), getLicenseConfig()]);
  // The buyer's own license-payment history — receipts for their records. This
  // is the buyer's dashboard (status + their payments), never the developer's
  // console: no issuance rows, no keys of other schools, no gateway secrets.
  const history = await prisma.paymentGatewayTx.findMany({
    where: { purpose: { in: ["LICENSE", "LICENSE_PURCHASE"] } },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: {
      reference: true,
      amount: true,
      method: true,
      provider: true,
      status: true,
      createdAt: true,
    },
  });
  if (user.role.name !== "developer") {
    const { paystackPublicKey: _pk, ...safeConfig } = config;
    void _pk;
    return ok({ ...status, config: safeConfig, history });
  }
  return ok({ ...status, config, history });
});

/**
 * Activate the installation with a license key, or start the trial.
 * Activation is strictly developer-only: the `licensing` permission is
 * granted exclusively to the Developer role, so no other account (including
 * administrators) can see or perform activation.
 */
export const POST = handle(async (req) => {
  const user = await requirePerm("licensing", "update");
  rateLimit(`license:${user.id}`, 5, 60_000);

  const body = await readJson<{ licenseKey?: string; action?: string }>(req);

  if (body.action === "start-trial") {
    const existing = await prisma.license.findFirst({ orderBy: { createdAt: "desc" } });
    if (existing) throw new ApiError("A license record already exists");
    const config = await getLicenseConfig();
    const key = generateLicenseKey("main", config.trialDays);
    await prisma.license.create({
      data: {
        licenseKey: key,
        status: "TRIAL",
        trialStartedAt: new Date(),
        trialEndsAt: new Date(Date.now() + config.trialDays * 24 * 60 * 60 * 1000),
        notes: "Started from admin panel",
      },
    });
    await auditLog(user.id, "ACTIVATE", "license", key, { action: "start-trial" });
    return NextResponse.json({ ok: true, data: await getLicenseStatus() }, { status: 201 });
  }

  if (!body.licenseKey) throw new ApiError("licenseKey is required");
  const check = validateLicenseKey(body.licenseKey);
  if (!check.valid) throw new ApiError("Invalid license key — it may be forged or tampered with.", 403);
  if (await isKeyRevoked(body.licenseKey)) {
    throw new ApiError("This license key has been revoked by the developer and can no longer be activated.", 403);
  }

  const existing = await prisma.license.findFirst({ orderBy: { createdAt: "desc" } });
  const key = body.licenseKey.trim().toUpperCase();
  const keySchool = (check.schoolId || "MAIN").toUpperCase();

  // School binding: a key minted for school “ABC” must not activate an
  // installation registered as “XYZ”. The first activation stamps this
  // installation's license code; every key afterwards must match it.
  const thisCode = await getThisSchoolCode();
  if (thisCode !== "MAIN" && thisCode !== keySchool) {
    throw new ApiError(
      `This license key was issued for school “${keySchool}” but this installation is registered as “${thisCode}”. Contact the developer for the correct key.`,
      403
    );
  }

  // The key's DAYS become the subscription period (activatedAt + days).
  // getLicenseStatus() hard-locks the install once this passes — even offline.
  const days = Math.max(1, Math.min(3650, Math.floor(check.days ?? 365)));
  const endsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  if (existing) {
    await prisma.license.update({
      where: { id: existing.id },
      data: { licenseKey: key, schoolId: keySchool, status: "ACTIVE", activatedAt: new Date(), trialEndsAt: endsAt, rollbackSuspected: false, notes: `Activated with key (school ${keySchool}, ${days} days)` },
    });
  } else {
    await prisma.license.create({
      data: {
        licenseKey: key,
        schoolId: keySchool,
        status: "ACTIVE",
        trialStartedAt: new Date(),
        trialEndsAt: endsAt,
        activatedAt: new Date(),
        notes: `Activated with key (school ${keySchool}, ${days} days)`,
      },
    });
  }
  await setSetting("license.schoolCode", keySchool);
  await auditLog(user.id, "ACTIVATE", "license", key, { action: "activate" });
  return NextResponse.json({ ok: true, data: await getLicenseStatus() });
});

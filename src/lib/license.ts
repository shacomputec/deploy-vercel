import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";
import { getSchool } from "@/lib/school";
import { getDevPaymentSettings } from "@/lib/payments";
import {
  getSigningSecret,
  getSigningSecrets,
  generateActivationKey,
  generateActivationKeyWithSecret,
  generateLicenseKey,
  validateLicenseKey,
  validateLicenseKeyWithSecrets,
  encryptLicenseKey,
  decryptLicenseKey,
  hashValue,
} from "@/lib/license-crypto";
export {
  getSigningSecret,
  getSigningSecrets,
  generateActivationKey,
  generateActivationKeyWithSecret,
  generateLicenseKey,
  validateLicenseKey,
  validateLicenseKeyWithSecrets,
  encryptLicenseKey,
  decryptLicenseKey,
  hashValue,
};
export type { IssuedLicenseKey } from "@/lib/license-crypto";

export type LicenseStatus = {
  status: string; // TRIAL | ACTIVE | SUSPENDED | EXPIRED
  trialDaysLeft: number | null;
  activatedAt: Date | null;
  rollbackSuspected: boolean;
  key: string | null;
  message: string;
};

export type LicenseConfig = {
  trialDays: number;
  /** Legacy single price — kept for compatibility; equals priceBasic on save. */
  price: number;
  /** Basic-school (Crèche → JHS) purchase price. */
  priceBasic: number;
  /** Basic + SHS purchase price. */
  priceShs: number;
  currency: string;
  momoPhones: string;
  developerName: string | null;
  developerPhone: string | null;
  developerEmail: string | null;
  paystackEnabled: boolean;
  paystackPublicKey: string;
  testMode: boolean;
  /** School profiles included in the purchase (beyond this, each is paid). */
  freeSchools: number;
};

export type LicenseTier = "basic" | "shs";

const DEFAULT_TRIAL_DAYS = 30;
const DEFAULT_PRICE_BASIC = 3000;
const DEFAULT_PRICE_SHS = 5000;

/**
 * Licensing configuration — all values are editable by the Developer from
 * Admin → Settings → Licensing. Nothing is hardcoded.
 */
export async function getLicenseConfig(): Promise<LicenseConfig> {
  const [trialDays, price, priceBasicRaw, priceShsRaw, currency, momoPhones, freeSchoolsRaw, school] = await Promise.all([
    getSetting("license.trialDays"),
    getSetting("license.price"),
    getSetting("license.priceBasic"),
    getSetting("license.priceShs"),
    getSetting("license.currency"),
    getSetting("license.momoPhones"),
    getSetting("license.freeSchools"),
    getSchool(),
  ]);
  // License payments are the DEVELOPER's business — the "Pay with Paystack"
  // button shows only when the developer has Paystack configured with their
  // own keys (never the school's).
  const pay = await getDevPaymentSettings();
  const parsedTrial = parseInt(trialDays ?? "", 10);
  const parsedPrice = parseFloat(price ?? "");
  const parsedBasic = parseFloat(priceBasicRaw ?? "");
  const parsedShs = parseFloat(priceShsRaw ?? "");
  const priceBasic = Number.isFinite(parsedBasic) && parsedBasic > 0 ? parsedBasic : DEFAULT_PRICE_BASIC;
  const priceShs = Number.isFinite(parsedShs) && parsedShs > 0 ? parsedShs : DEFAULT_PRICE_SHS;
  return {
    trialDays: Number.isFinite(parsedTrial) && parsedTrial > 0 ? parsedTrial : DEFAULT_TRIAL_DAYS,
    price: Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : priceBasic,
    priceBasic,
    priceShs,
    currency: currency || "GHS",
    momoPhones: momoPhones || school?.developerPhone || "",
    freeSchools: (() => {
      const n = parseInt(freeSchoolsRaw ?? "", 10);
      return Number.isFinite(n) && n >= 0 ? n : 3;
    })(),
    developerName: school?.developerName ?? null,
    developerPhone: school?.developerPhone ?? null,
    developerEmail: school?.developerEmail ?? null,
    paystackEnabled: pay.paystackEnabled,
    paystackPublicKey: pay.paystackPublicKey,
    testMode: pay.testMode,
  };
}

// Pure key cryptography (signing, validation, rotation, encrypted storage) lives
// in `license-crypto.ts` — this file keeps the database/status layer.

/**
 * True when the issued key's nonce has been revoked by the developer
 * (Admin → Licensing → Issuance history → Revoke). Legacy v1/trial keys have
 * no nonce and are not tracked, so they are never treated as revoked.
 */
export async function isKeyRevoked(key: string): Promise<boolean> {
  const parts = key.trim().toUpperCase().split("-");
  if (parts.length < 6) return false;
  const nonce = parts[parts.length - 2] ?? "";
  if (!/^[0-9A-F]{8}$/.test(nonce)) return false;
  const row = await prisma.licenseIssuance.findUnique({ where: { nonce } });
  return !!row?.revokedAt;
}

/**
 * Evaluate the current license:
 *  - trial: counts down from trialDays since trialStartedAt
 *  - active: activated, checked against lastSeenAt for clock rollback
 *  - suspended / expired: blocked
 */
export async function getLicenseStatus(): Promise<LicenseStatus> {
  const config = await getLicenseConfig();
  const license = await prisma.license.findFirst({ orderBy: { createdAt: "desc" } });
  if (!license) {
    return {
      status: "TRIAL",
      trialDaysLeft: config.trialDays,
      activatedAt: null,
      rollbackSuspected: false,
      key: null,
      message: `No license found — ${config.trialDays}-day trial starts on first use.`,
    };
  }

  const now = Date.now();

  // Clock rollback detection: lastSeenAt more than 6 hours in the future means
  // the system clock was rolled back to extend the trial/licence.
  if (license.lastSeenAt && license.lastSeenAt.getTime() > now + 6 * 60 * 60 * 1000 && !license.rollbackSuspected) {
    await prisma.license.update({
      where: { id: license.id },
      data: { rollbackSuspected: true, status: "SUSPENDED" },
    });
    return { status: "SUSPENDED", trialDaysLeft: null, activatedAt: license.activatedAt, rollbackSuspected: true, key: license.licenseKey, message: "Clock rollback detected — installation suspended. Contact the developer." };
  }

  await prisma.license.update({ where: { id: license.id }, data: { lastSeenAt: new Date(now) } });

  if (license.status === "SUSPENDED") {
    return { status: "SUSPENDED", trialDaysLeft: null, activatedAt: license.activatedAt, rollbackSuspected: license.rollbackSuspected, key: license.licenseKey, message: "Installation suspended. Contact your system developer." };
  }

  if (license.status === "ACTIVE") {
    if (license.licenseKey && (await isKeyRevoked(license.licenseKey))) {
      await prisma.license.update({ where: { id: license.id }, data: { status: "SUSPENDED" } });
      return { status: "SUSPENDED", trialDaysLeft: null, activatedAt: license.activatedAt, rollbackSuspected: license.rollbackSuspected, key: license.licenseKey, message: "This license key has been revoked. Contact your system developer." };
    }
    return { status: "ACTIVE", trialDaysLeft: null, activatedAt: license.activatedAt, rollbackSuspected: license.rollbackSuspected, key: license.licenseKey, message: "Licensed. Thank you for registering your school." };
  }

  // TRIAL or EXPIRED
  const trialEnd = license.trialEndsAt?.getTime() ?? license.trialStartedAt.getTime() + config.trialDays * 24 * 60 * 60 * 1000;
  const daysLeft = Math.max(0, Math.ceil((trialEnd - now) / (24 * 60 * 60 * 1000)));
  if (license.status === "EXPIRED" || (license.status === "TRIAL" && daysLeft <= 0)) {
    await prisma.license.update({ where: { id: license.id }, data: { status: "EXPIRED" } });
    return { status: "EXPIRED", trialDaysLeft: 0, activatedAt: license.activatedAt, rollbackSuspected: license.rollbackSuspected, key: license.licenseKey, message: "Trial expired. Activate your license to continue." };
  }

  return { status: "TRIAL", trialDaysLeft: daysLeft, activatedAt: license.activatedAt, rollbackSuspected: license.rollbackSuspected, key: license.licenseKey, message: `${daysLeft} trial day${daysLeft === 1 ? "" : "s"} remaining.` };
}



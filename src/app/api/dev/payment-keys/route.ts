import { NextResponse } from "next/server";
import { handle, ok, readJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getSetting, setSetting } from "@/lib/settings";
import { auditLog } from "@/lib/audit";

const requireDeveloper = async () => {
  const user = await getCurrentUser();
  if (!user) throw { status: 401, message: "Authentication required" };
  if (user.role.name !== "developer") throw { status: 403, message: "Developer only" };
  return user;
};

const PAY_KEYS = [
  "dev.payments.momo.enabled",
  "dev.payments.momo.env",
  "dev.payments.momo.subscriptionKey",
  "dev.payments.momo.apiUserId",
  "dev.payments.momo.apiKey",
  "dev.payments.momo.businessPhone",
  "dev.payments.paystack.enabled",
  "dev.payments.paystack.publicKey",
  "dev.payments.paystack.secretKey",
] as const;

const MSG_KEYS = [
  "dev.messaging.smsonlinegh.apiKey",
  "dev.messaging.smsonlinegh.sender",
  "dev.messaging.email.apiKey",
  "dev.messaging.email.from",
  "dev.messaging.whatsapp.sid",
  "dev.messaging.whatsapp.token",
  "dev.messaging.whatsapp.from",
] as const;

/**
 * The DEVELOPER'S OWN payment + messaging credentials — used only for the
 * developer's licensing business (license-activation payments and license
 * notifications). Schools never see these and never use them; every school
 * configures its own keys in Admin → Online Payments / Settings → Notifications.
 */
export const GET = handle(async () => {
  await requireDeveloper();
  const all = [...PAY_KEYS, ...MSG_KEYS];
  const values = await Promise.all(all.map((k) => getSetting(k)));
  const out: Record<string, string> = {};
  all.forEach((k, i) => { out[k] = values[i] ?? ""; });
  return ok(out);
});

export const PUT = handle(async (req) => {
  const user = await requireDeveloper();
  const body = await readJson<Record<string, string>>(req);
  const allowed: Set<string> = new Set([...PAY_KEYS, ...MSG_KEYS]);
  const entries = Object.entries(body).filter(([k]) => allowed.has(k));
  await Promise.all(entries.map(([k, v]) => setSetting(k, String(v ?? ""))));
  if (entries.length) {
    await auditLog(user.id, "UPDATE", "dev.payment-keys", user.id, { keys: entries.map(([k]) => k) });
  }
  return NextResponse.json({ ok: true, data: { saved: entries.length } });
});

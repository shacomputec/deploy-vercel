// ============================================================================
// Online payment gateways — Mobile Money (MTN, AirtelTigo, Telecel) & Paystack
// ----------------------------------------------------------------------------
// - All gateway credentials are stored in the Setting table and configured
//   from Admin → Online Payments (never exposed via GET — masked on read).
// - `payments.testMode` ON + a gateway without keys → simulated payments (for
//   school demos). ON + keys present → real sandbox/live calls.
// - MTN MoMo uses the official Collection API. AirtelTigo and Telecel plug into
//   the same interface (their merchant OpenAPI endpoints) and fall back to
//   simulation until their sandbox credentials are configured.
// - Settlement is idempotent: a gateway transaction can only produce one
//   FeePayment receipt.
// ============================================================================
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { nextReceiptNo } from "@/lib/sequences";
import { ApiError } from "@/lib/api";
import { clearSchoolCache, getSchool } from "@/lib/school";
import { notify } from "@/lib/notify";
import { buildLicenseReceiptPdf } from "@/lib/receipt-pdf";
import { decryptLicenseKey, generateActivationKey, encryptLicenseKey, hashValue } from "@/lib/license-crypto"; // pure crypto — no DB, no circular import

// ── gateway configuration ────────────────────────────────────────────────────

export type MomoProvider = "MTN" | "AIRTELTIGO" | "TELECEL";

/** Per-provider credential block — the settings object keeps flat `momo*`
 * (MTN, legacy), `airtel*` and `telecel*` fields. */
export type ProviderBlock = {
  enabled: boolean;
  env: "sandbox" | "live";
  subscriptionKey: string;
  apiUserId: string;
  apiKey: string;
  businessPhone: string;
};

export type PaymentSettings = {
  testMode: boolean;
  momoEnabled: boolean;
  momoEnv: "sandbox" | "live";
  momoSubscriptionKey: string;
  momoApiUserId: string;
  momoApiKey: string;
  momoBusinessPhone: string;
  airtelEnabled: boolean;
  airtelEnv: "sandbox" | "live";
  airtelSubscriptionKey: string;
  airtelApiUserId: string;
  airtelApiKey: string;
  airtelBusinessPhone: string;
  telecelEnabled: boolean;
  telecelEnv: "sandbox" | "live";
  telecelSubscriptionKey: string;
  telecelApiUserId: string;
  telecelApiKey: string;
  telecelBusinessPhone: string;
  paystackEnabled: boolean;
  paystackPublicKey: string;
  paystackSecretKey: string;
};

const DEFAULTS: PaymentSettings = {
  testMode: true,
  momoEnabled: false,
  momoEnv: "sandbox",
  momoSubscriptionKey: "",
  momoApiUserId: "",
  momoApiKey: "",
  momoBusinessPhone: "",
  airtelEnabled: false,
  airtelEnv: "sandbox",
  airtelSubscriptionKey: "",
  airtelApiUserId: "",
  airtelApiKey: "",
  airtelBusinessPhone: "",
  telecelEnabled: false,
  telecelEnv: "sandbox",
  telecelSubscriptionKey: "",
  telecelApiUserId: "",
  telecelApiKey: "",
  telecelBusinessPhone: "",
  paystackEnabled: false,
  paystackPublicKey: "",
  paystackSecretKey: "",
};

// provider key prefix -> settings field prefix
const PROVIDER_PREFIX: Record<MomoProvider, string> = {
  MTN: "momo",
  AIRTELTIGO: "airtel",
  TELECEL: "telecel",
};

export const MOMO_PROVIDERS: MomoProvider[] = ["MTN", "AIRTELTIGO", "TELECEL"];

export const PROVIDER_LABELS: Record<MomoProvider, string> = {
  MTN: "MTN Mobile Money",
  AIRTELTIGO: "AirtelTigo Money",
  TELECEL: "Telecel Cash (Vodafone)",
};

// Official gateway bases per environment. MTN uses the MoMo Collection API;
// AirtelTigo uses Airtel Africa's OpenAPI merchant money endpoints; Telecel
// (ex-Vodafone) uses the Vodafone Cash merchant API.
const PROVIDER_BASE: Record<MomoProvider, Record<string, string>> = {
  MTN: {
    sandbox: "https://sandbox.momodeveloper.mtn.com",
    live: "https://proxy.momoapi.mtn.com",
  },
  AIRTELTIGO: {
    sandbox: "https://openapi.mo.airtel.africa",
    live: "https://openapi.mo.airtel.africa",
  },
  TELECEL: {
    sandbox: "https://api.myvodafone.com.gh",
    live: "https://api.myvodafone.com.gh",
  },
};

// Ghana mobile number prefixes per network (used to pre-select the provider).
const PROVIDER_PREFIXES: Record<MomoProvider, RegExp> = {
  MTN: /^(024|025|054|055|059)/,
  AIRTELTIGO: /^(026|027|057)/,
  TELECEL: /^(020|050)/,
};

/** Detect the Mobile Money network of a Ghana phone number (null if unknown). */
export function detectMomoProvider(phone: string): MomoProvider | null {
  const digits = phone.replace(/\D/g, "").replace(/^233/, "0");
  for (const p of MOMO_PROVIDERS) {
    if (PROVIDER_PREFIXES[p].test(digits)) return p;
  }
  return null;
}

/** Read one provider's credentials out of the flat settings object. */
export function providerBlock(s: PaymentSettings, provider: MomoProvider): ProviderBlock {
  const pre = PROVIDER_PREFIX[provider];
  return {
    enabled: Boolean((s as unknown as Record<string, boolean>)[`${pre}Enabled`]),
    env: ((s as unknown as Record<string, string>)[`${pre}Env`] === "live" ? "live" : "sandbox") as "sandbox" | "live",
    subscriptionKey: String((s as unknown as Record<string, string>)[`${pre}SubscriptionKey`] ?? ""),
    apiUserId: String((s as unknown as Record<string, string>)[`${pre}ApiUserId`] ?? ""),
    apiKey: String((s as unknown as Record<string, string>)[`${pre}ApiKey`] ?? ""),
    businessPhone: String((s as unknown as Record<string, string>)[`${pre}BusinessPhone`] ?? ""),
  };
}

const KEYS = {
  testMode: "payments.testMode",
  momoEnabled: "payments.momo.enabled",
  momoEnv: "payments.momo.env",
  momoSubscriptionKey: "payments.momo.subscriptionKey",
  momoApiUserId: "payments.momo.apiUserId",
  momoApiKey: "payments.momo.apiKey",
  momoBusinessPhone: "payments.momo.businessPhone",
  airtelEnabled: "payments.airtel.enabled",
  airtelEnv: "payments.airtel.env",
  airtelSubscriptionKey: "payments.airtel.subscriptionKey",
  airtelApiUserId: "payments.airtel.apiUserId",
  airtelApiKey: "payments.airtel.apiKey",
  airtelBusinessPhone: "payments.airtel.businessPhone",
  telecelEnabled: "payments.telecel.enabled",
  telecelEnv: "payments.telecel.env",
  telecelSubscriptionKey: "payments.telecel.subscriptionKey",
  telecelApiUserId: "payments.telecel.apiUserId",
  telecelApiKey: "payments.telecel.apiKey",
  telecelBusinessPhone: "payments.telecel.businessPhone",
  paystackEnabled: "payments.paystack.enabled",
  paystackPublicKey: "payments.paystack.publicKey",
  paystackSecretKey: "payments.paystack.secretKey",
} as const;

/** The developer's OWN gateway keys (their licensing business). Schools never
 * see or use these — `dev.payments.*` rows are developer-only and are used
 * only for LICENSE-purpose transactions (license/pay). */
const DEV_KEYS: Record<string, string> = Object.fromEntries(
  Object.entries(KEYS).map(([k, v]) => [k, v.replace(/^payments\./, "dev.payments.")])
);

export const isDevPaymentKey = (key: string) => key.startsWith("dev.payments.");

export type PaymentContext = "school" | "dev";

export async function readPaymentSettings(map: Record<string, string>): Promise<PaymentSettings> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: Object.values(map) } },
  });
  const rowMap = new Map(rows.map((r) => [r.key, r.value ?? ""]));
  const s = { ...DEFAULTS };
  s.testMode = rowMap.get(map.testMode) !== "false";
  for (const p of MOMO_PROVIDERS) {
    const pre = PROVIDER_PREFIX[p];
    (s as unknown as Record<string, unknown>)[`${pre}Enabled`] = rowMap.get(map[`${pre}Enabled`]) === "true";
    (s as unknown as Record<string, unknown>)[`${pre}Env`] = rowMap.get(map[`${pre}Env`]) === "live" ? "live" : "sandbox";
    for (const field of ["SubscriptionKey", "ApiUserId", "ApiKey", "BusinessPhone"] as const) {
      (s as unknown as Record<string, unknown>)[`${pre}${field}`] = rowMap.get(map[`${pre}${field}`]) ?? "";
    }
  }
  s.paystackEnabled = rowMap.get(map.paystackEnabled) === "true";
  s.paystackPublicKey = rowMap.get(map.paystackPublicKey) ?? "";
  s.paystackSecretKey = rowMap.get(map.paystackSecretKey) ?? "";
  return s;
}

export async function getPaymentSettings(): Promise<PaymentSettings> {
  return readPaymentSettings(KEYS as unknown as Record<string, string>);
}

/** The developer's own gateway keys — used only for license-activation payments. */
export async function getDevPaymentSettings(): Promise<PaymentSettings> {
  const s = await readPaymentSettings(DEV_KEYS);
  // Environment fallback: when the developer hasn't saved keys in the console
  // (fresh install / first boot), the developer's Paystack keys baked into the
  // deployment env keep the buyer's "Pay / Activate" screen fully functional.
  // Without this, `paystackEnabled` stays false and the buyer sees NO online
  // payment option at all. Prefer SEED_PAYSTACK_* (the canonical names used by
  // the seed + sync-payments), then the plain PAYSTACK_* form.
  if (!s.paystackSecretKey) {
    const unquote = (v: string) => v.trim().replace(/^"|"$/g, "");
    const secret = unquote(process.env.SEED_PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY || "");
    if (secret) {
      s.paystackSecretKey = secret;
      s.paystackEnabled = true;
      s.paystackPublicKey = s.paystackPublicKey || unquote(process.env.SEED_PAYSTACK_PUBLIC_KEY || process.env.PAYSTACK_PUBLIC_KEY || "");
    }
  }
  return s;
}

export async function savePaymentSettings(
  patch: Partial<PaymentSettings>,
  map: Record<string, string> = KEYS as unknown as Record<string, string>
): Promise<PaymentSettings> {
  const upserts: Record<string, string> = {};
  for (const [k, v] of Object.entries(patch)) {
    const key = map[k];
    if (!key) continue;
    upserts[key] = typeof v === "boolean" ? String(v) : String(v ?? "");
  }
  await prisma.$transaction(
    Object.entries(upserts).map(([key, value]) =>
      prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } })
    )
  );
  return readPaymentSettings(map);
}

/** Safe view for the admin UI — secrets masked. */
export function maskSettings(s: PaymentSettings) {
  const masked: Record<string, unknown> = { ...s };
  for (const p of MOMO_PROVIDERS) {
    const pre = PROVIDER_PREFIX[p];
    for (const field of ["SubscriptionKey", "ApiKey", "ApiUserId"] as const) {
      const v = String((s as unknown as Record<string, string>)[`${pre}${field}`] ?? "");
      masked[`${pre}${field}`] = v ? maskKey(v) : "";
    }
  }
  masked.paystackSecretKey = s.paystackSecretKey ? maskKey(s.paystackSecretKey) : "";
  return masked as PaymentSettings;
}
function maskKey(v: string) {
  return v.length <= 8 ? "••••" : `${v.slice(0, 4)}••••${v.slice(-4)}`;
}

export function gatewayConfigured(s: PaymentSettings, method: "MOMO" | "PAYSTACK", provider?: MomoProvider): boolean {
  if (method === "PAYSTACK") return Boolean(s.paystackEnabled && s.paystackSecretKey);
  const p = provider ?? "MTN";
  const block = providerBlock(s, p);
  return Boolean(block.enabled && block.subscriptionKey && block.businessPhone);
}

/** Need simulation when test mode is ON and the gateway is not configured. */
export function needsSimulation(s: PaymentSettings, method: "MOMO" | "PAYSTACK", provider?: MomoProvider) {
  return s.testMode && !gatewayConfigured(s, method, provider);
}

/**
 * A live MoMo gateway is only truly ready when the portal-issued API User ID
 * and API Key are present (sandbox auto-provisions them). `gatewayConfigured`
 * alone is not enough — without these, `ensureMomoUser` throws a hard 502.
 */
export function gatewayLiveReady(s: PaymentSettings, provider: MomoProvider = "MTN"): boolean {
  const block = providerBlock(s, provider);
  if (block.env !== "live") return true;
  return Boolean(block.apiUserId && block.apiKey);
}

export function genPaymentRef() {
  return `PMT-${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
}

// ── Mobile Money gateways ─────────────────────────────────────────────────────

// bearer tokens live ~1h; cache per provider+env+subscription key
const momoTokenCache = new Map<string, { token: string; expiresAt: number }>();

function momoBase(s: PaymentSettings, provider: MomoProvider) {
  const block = providerBlock(s, provider);
  return { base: PROVIDER_BASE[provider][block.env], block, env: block.env };
}

/** Normalize a Ghana number to international MSISDN (233XXXXXXXXX) for gateways. */
export function toMsisdn(phone: string): string {
  const d = phone.replace(/\D/g, "").replace(/^233/, "");
  return d.startsWith("0") ? `233${d.slice(1)}` : `233${d}`;
}

/** MTN's production target environment value is `mtnmomo` (not `live`). */
export function momoTargetEnv(provider: MomoProvider, env: "sandbox" | "live"): string {
  return provider === "MTN" && env === "live" ? "mtnmomo" : env;
}

async function ensureMomoUser(s: PaymentSettings, provider: MomoProvider, map: Record<string, string>) {
  const { base, block } = momoBase(s, provider);
  if (block.apiUserId && block.apiKey) return { userId: block.apiUserId, apiKey: block.apiKey };
  // API users can ONLY be provisioned in the sandbox. In live, the provider
  // portal issues the API User ID + API Key — attempting to auto-provision
  // against the live host fails (404) and was the reason live MoMo payments
  // never worked. Give the operator a clear, actionable error instead.
  if (block.env === "live") {
    throw new ApiError(
      `${PROVIDER_LABELS[provider]}: live payments need the API User ID and API Key from the provider's merchant portal. Paste them in Admin → Online Payments (your school's own gateway keys).`,
      502
    );
  }
  const userId = crypto.randomUUID();
  const createRes = await fetch(`${base}/v1_0/apiuser`, {
    method: "POST",
    headers: {
      "X-Reference-Id": userId,
      "Ocp-Apim-Subscription-Key": block.subscriptionKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ providerCallbackHost: "callback.momodeveloper.mtn.com" }),
  });
  if (createRes.status !== 201 && createRes.status !== 200 && createRes.status !== 409) {
    throw new ApiError(`${PROVIDER_LABELS[provider]}: merchant API rejected the request (${createRes.status}). Check your subscription key.`, 502);
  }
  const keyRes = await fetch(`${base}/v1_0/apiuser/${userId}/apikey`, {
    method: "POST",
    headers: { "Ocp-Apim-Subscription-Key": block.subscriptionKey },
  });
  const keyData = (await keyRes.json().catch(() => ({}))) as { apiKey?: string };
  if (!keyRes.ok || !keyData.apiKey) throw new ApiError(`${PROVIDER_LABELS[provider]}: could not obtain an API key from the merchant.`, 502);
  // persist so we only provision once
  const pre = PROVIDER_PREFIX[provider];
  await savePaymentSettings({ [`${pre}ApiUserId`]: userId, [`${pre}ApiKey`]: keyData.apiKey } as Partial<PaymentSettings>, map);
  return { userId, apiKey: keyData.apiKey };
}

async function momoToken(s: PaymentSettings, provider: MomoProvider, map: Record<string, string> = KEYS as unknown as Record<string, string>): Promise<string> {
  const { base, block } = momoBase(s, provider);
  const cacheKey = `${provider}:${block.env}:${block.subscriptionKey}`;
  const cached = momoTokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;
  const { userId, apiKey } = await ensureMomoUser(s, provider, map);
  const basic = Buffer.from(`${userId}:${apiKey}`).toString("base64");
  const res = await fetch(`${base}/collection/token/`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Ocp-Apim-Subscription-Key": block.subscriptionKey,
    },
  });
  const data = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number };
  if (!res.ok || !data.access_token) throw new ApiError(`${PROVIDER_LABELS[provider]}: token request failed.`, 502);
  const expiresIn = Number(data.expires_in ?? 3600);
  momoTokenCache.set(cacheKey, { token: data.access_token, expiresAt: Date.now() + (expiresIn - 60) * 1000 });
  return data.access_token;
}

/** Ask the payer to confirm a MoMo prompt. Returns the gateway reference id. */
export async function momoRequestToPay(
  tx: { reference: string; amount: number; phone: string; purpose?: string; provider?: MomoProvider },
  s: PaymentSettings,
  origin: string
): Promise<string> {
  const provider = tx.provider ?? "MTN";
  const { base, block, env } = momoBase(s, provider);
  const isLicense = tx.purpose === "LICENSE" || tx.purpose === "LICENSE_PURCHASE";
  const label = isLicense ? "License activation" : "School fee payment";
  // License payments run on the DEVELOPER's own gateway keys; fee payments on
  // the school's. The map decides where sandbox-provisioned API users persist.
  const map = isLicense ? DEV_KEYS : (KEYS as unknown as Record<string, string>);

  // AirtelTigo & Telecel use their own merchant endpoints. They share the same
  // user/token provisioning pattern where supported; with sandbox/live keys
  // present this calls the documented endpoint, otherwise the initiate route
  // simulates (test mode) before ever reaching here.
  if (provider !== "MTN") {
    const token = await momoToken(s, provider, map);
    const xRefId = crypto.randomUUID();
    const path = provider === "AIRTELTIGO" ? "/merchant/v2/payments/" : "/collection/v1_0/requesttopay";
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Target-Environment": momoTargetEnv(provider, env),
        "X-Callback-Url": `${origin}/api/payments/webhook/momo`,
        "Ocp-Apim-Subscription-Key": block.subscriptionKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: String(tx.amount),
        currency: "GHS",
        externalId: tx.reference,
        reference: xRefId,
        payer: { partyIdType: "MSISDN", partyId: toMsisdn(tx.phone) },
        payerMessage: `${label} ${tx.reference}`,
        payeeNote: `${label} (${tx.reference})`,
      }),
    });
    if (res.status !== 202 && res.status !== 200 && res.status !== 201) {
      const body = await res.text().catch(() => "");
      throw new ApiError(`${PROVIDER_LABELS[provider]}: request rejected (${res.status}). ${body.slice(0, 160)}`, 502);
    }
    return xRefId;
  }

  // MTN MoMo Collection API
  const token = await momoToken(s, "MTN", map);
  const xRefId = crypto.randomUUID();
  const res = await fetch(`${base}/collection/v1_0/requesttopay`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Reference-Id": xRefId,
      "X-Target-Environment": momoTargetEnv("MTN", env),
      "X-Callback-Url": `${origin}/api/payments/webhook/momo`,
      "Ocp-Apim-Subscription-Key": block.subscriptionKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: String(tx.amount),
      currency: "GHS",
      externalId: tx.reference,
      payer: { partyIdType: "MSISDN", partyId: toMsisdn(tx.phone) },
      payerMessage: `${label} ${tx.reference}`,
      payeeNote: `${label} (${tx.reference})`,
    }),
  });
  if (res.status !== 202 && res.status !== 200) {
    const body = await res.text().catch(() => "");
    throw new ApiError(`MTN MoMo: request rejected (${res.status}). ${body.slice(0, 160)}`, 502);
  }
  return xRefId;
}

export async function momoCheckStatus(
  providerRef: string,
  s: PaymentSettings,
  provider: MomoProvider = "MTN",
  map: Record<string, string> = KEYS as unknown as Record<string, string>
) {
  const { base, block, env } = momoBase(s, provider);
  const token = await momoToken(s, provider, map);
  const path = provider === "AIRTELTIGO" ? `/merchant/v2/payments/${providerRef}` : `/collection/v1_0/requesttopay/${providerRef}`;
  const res = await fetch(`${base}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Target-Environment": momoTargetEnv(provider, env),
      "Ocp-Apim-Subscription-Key": block.subscriptionKey,
    },
  });
  if (res.status === 404) return { status: "UNKNOWN" };
  const data = (await res.json().catch(() => ({}))) as { status?: string; financialTransactionId?: string };
  return { status: data.status ?? "UNKNOWN", financialTransactionId: data.financialTransactionId };
}

// ── Paystack ──────────────────────────────────────────────────────────────────

export async function paystackInitialize(
  tx: { reference: string; amount: number; purpose?: string },
  s: PaymentSettings,
  email: string,
  origin: string
) {
  const purpose = tx.purpose === "LICENSE" || tx.purpose === "LICENSE_PURCHASE" ? "license-activation" : "school-fees";
  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${s.paystackSecretKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: email || "fees@school.local",
      amount: Math.round(tx.amount * 100), // GHS pesewas
      currency: "GHS",
      reference: tx.reference,
      callback_url: `${origin}/pay?ref=${tx.reference}`,
      metadata: { app: "GES School MIS", purpose },
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    status?: boolean; message?: string; data?: { authorization_url?: string; access_code?: string; reference?: string };
  };
  if (!res.ok || !data.status) throw new ApiError(`Paystack: ${data.message ?? "initialize failed"}`, 502);
  return {
    checkoutUrl: data.data?.authorization_url ?? "",
    accessCode: data.data?.access_code ?? "",
    providerRef: data.data?.reference ?? tx.reference,
  };
}

// ── developer-console gateway probe ───────────────────────────────────────────
// Validates the DEVELOPER'S own gateway credentials against the provider (token
// exchange / balance call) without creating a transaction or prompting a payer.
// Sandbox MoMo auto-provisions the API user on success, making the gateway
// truly live-ready, exactly as the real payment path would.

export async function probeGatewayKeys(
  method: "MOMO" | "PAYSTACK",
  provider: MomoProvider = "MTN"
): Promise<{ valid: boolean; message: string }> {
  const s = await getDevPaymentSettings();
  if (method === "PAYSTACK") {
    if (!s.paystackSecretKey) return { valid: false, message: "No Paystack secret key saved yet — paste it above first." };
    const res = await fetch("https://api.paystack.co/balance", {
      headers: { Authorization: `Bearer ${s.paystackSecretKey}` },
    });
    const data = (await res.json().catch(() => ({}))) as { status?: boolean; message?: string };
    if (!res.ok || data.status !== true) {
      return {
        valid: false,
        message: `Paystack rejected the secret key (HTTP ${res.status}) — ${data.message ?? "check the key"}.`,
      };
    }
    return { valid: true, message: "Paystack secret key is valid — the gateway is ready." };
  }

  const block = providerBlock(s, provider);
  if (!block.subscriptionKey) {
    return { valid: false, message: `No ${PROVIDER_LABELS[provider]} subscription key saved yet — paste it above first.` };
  }
  if (block.env === "live" && !(block.apiUserId && block.apiKey)) {
    return {
      valid: false,
      message: `${PROVIDER_LABELS[provider]} live mode needs the API User ID and API Key from the merchant portal (auto-provision is sandbox-only).`,
    };
  }
  try {
    const token = await momoToken(s, provider, DEV_KEYS);
    if (!token) return { valid: false, message: "Token request returned an empty token." };
    const after = await getDevPaymentSettings();
    const provisioned = providerBlock(after, provider);
    const extra =
      block.env === "sandbox" && provisioned.apiUserId
        ? ` API user provisioned (${provisioned.apiUserId.slice(0, 8)}…) — gateway is live-ready.`
        : "";
    return { valid: true, message: `${PROVIDER_LABELS[provider]} subscription key is valid — token obtained (${block.env}).${extra}` };
  } catch (e) {
    const msg = e instanceof ApiError ? e.message : String((e as Error).message ?? e);
    return { valid: false, message: msg };
  }
}

export async function paystackVerify(providerRef: string, s: PaymentSettings) {
  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(providerRef)}`, {
    headers: { Authorization: `Bearer ${s.paystackSecretKey}` },
  });
  const data = (await res.json().catch(() => ({}))) as {
    status?: boolean; data?: { status?: string; paid_at?: string; amount?: number };
  };
  if (!res.ok || !data.status) return { status: "UNKNOWN" };
  return { status: data.data?.status ?? "UNKNOWN", paidAt: data.data?.paid_at };
}

/** Verify an incoming Paystack webhook signature (HMAC-SHA512 of the raw body). */
export function paystackSignatureOk(rawBody: string, signature: string | null, s: PaymentSettings): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac("sha512", s.paystackSecretKey).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ── settlement (idempotent) ───────────────────────────────────────────────────

/** Creates exactly one FeePayment + flips the tx to SUCCESS. No-op if already settled. */
export async function settleGatewayTx(txId: string) {
  // License settlement does crypto + several writes + lookups; keep a generous
  // timeout so a slow disk or provider never aborts a confirmed payment.
  return prisma.$transaction(
    async (p) => {
    const tx = await p.paymentGatewayTx.findUnique({ where: { id: txId } });
    if (!tx) throw new ApiError("Transaction not found", 404);
    if (tx.status === "SUCCESS") return tx;

    // ADDITIONAL-SCHOOL PURCHASE (/api/schools/purchase): a signed-in Super
    // Admin / Admin pays the DEVELOPER to add another school profile to THIS
    // installation. The pending profile lives in tx.meta; settlement turns it
    // into a real School row with its own ACTIVE license — nothing is created
    // before payment. The developer's gateway keys were used, never the school's.
    if (tx.purpose === "SCHOOL") {
      // Batch-capable: meta holds `{ batch: true, schools: [...] }` for a
      // one-checkout purchase of several schools, or a single profile object.
      let meta: Record<string, unknown> = {};
      try { meta = tx.meta ? (JSON.parse(tx.meta) as Record<string, unknown>) : {}; } catch { /* fall back to buyerName */ }
      const rawProfiles = Array.isArray(meta.schools) && (meta.schools as unknown[]).length
        ? (meta.schools as Record<string, unknown>[])
        : [meta];
      if (!rawProfiles.length) throw new ApiError("School purchase is missing its profile.", 422);

      const devUser = await p.user.findFirst({ where: { role: { name: "developer" } }, select: { id: true } });
      const results: { name: string; code: string; key: string; slug: string }[] = [];

      for (const profile of rawProfiles) {
        const name = String(profile.name || "New School").trim();
        const code = String(profile.code || profile.name || "")
          .toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 14) || "NEWSCHOOL";
        const slug =
          String(profile.slug || "").trim() ||
          code.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24) ||
          "school";

        // 1. Create the School row (idempotent — a retried settlement never duplicates).
        const school = await p.school.findUnique({ where: { id: slug } });
        if (!school) {
          await p.school.create({
            data: {
              id: slug,
              name,
              shortName: (profile.shortName as string) || null,
              motto: (profile.motto as string) || null,
              phone: (profile.phone as string) || null,
              email: (profile.email as string) || null,
              address: (profile.address as string) || null,
              district: (profile.district as string) || null,
              region: (profile.region as string) || null,
              primaryColor: (profile.primaryColor as string) || "#047857",
              accentColor: (profile.accentColor as string) || "#d97706",
            },
          });
        }

        // 2. Mint the school's own license key + record the issuance.
        const minted = generateActivationKey(code, 365);
        await p.licenseIssuance.create({
          data: {
            schoolId: minted.schoolId,
            days: minted.days,
            nonce: minted.nonce,
            keyHash: hashValue(minted.key),
            keyEncrypted: encryptLicenseKey(minted.key),
            issuedById: devUser?.id ?? null,
            sentTo: tx.deliveryEmail || tx.deliveryPhone || null,
            sentAt: new Date(),
            notes: `Auto-issued on additional-school purchase (${tx.reference})`,
          },
        });
        await p.license.create({
          data: {
            licenseKey: minted.key,
            schoolId: minted.schoolId,
            status: "ACTIVE",
            activatedAt: new Date(),
            notes: `Activated on additional-school purchase (${tx.method} · ${tx.reference})`,
          },
        });
        await p.auditLog.create({
          data: {
            userId: devUser?.id ?? null,
            action: "SCHOOL_PURCHASED",
            entity: "schools",
            entityId: slug,
            meta: JSON.stringify({ name, code, tx: tx.reference, amount: tx.amount, method: tx.method }),
          },
        });

        // 3. The Developer Console directory — this school paid in FULL.
        await p.vendorSchool.upsert({
          where: { licenseCode: code },
          create: {
            licenseCode: code,
            name,
            district: (profile.district as string) || null,
            region: (profile.region as string) || null,
            contactEmail: tx.deliveryEmail ?? null,
            contactPhone: tx.deliveryPhone ?? null,
            paymentStatus: "FULL",
          },
          update: {
            name,
            contactEmail: tx.deliveryEmail ?? undefined,
            contactPhone: tx.deliveryPhone ?? undefined,
            paymentStatus: "FULL",
          },
        });

        results.push({ name, code, key: minted.key, slug });
      }
      // The active-school cache must not serve a stale list after creates.
      clearSchoolCache();

      const settled = await p.paymentGatewayTx.update({ where: { id: txId }, data: { status: "SUCCESS" } });
      const names = results.map((r) => r.name);
      const label = names.length === 1 ? `“${names[0]}”` : `${names.length} schools`;
      const keys = results.map((r) => `   ${r.name}  →  ${r.key}`).join("\n");
      const support = "Your system developer";

      // 4. Confirm to the buyer's own contact (email / WhatsApp / SMS).
      const message = [
        `Dear Administrator,`,
        ``,
        `Payment confirmed (${tx.method} · ${tx.reference}). ${label} ${names.length === 1 ? "has" : "have"} been created on your system with ACTIVE licenses.`,
        ``,
        keys,
        ``,
        `You can now switch to any of them from Admin → Schools → Set active.`,
        ``,
        `The keys are machine-verifiable and cannot be forged. Keep them private.`,
        ``,
        `For support: ${support}`,
        ``,
        `— GES School MIS`,
      ].join("\n");
      const shortMessage = `Payment received — ${label} ${names.length === 1 ? "is" : "are"} now on your system with ACTIVE licenses. Support: ${support}`;
      if (tx.deliveryEmail) {
        void notify({ email: tx.deliveryEmail }, message, {
          subject: `${label} ${names.length === 1 ? "is" : "are"} ready on your system`, useDevKeys: true,
        });
      }
      if (tx.deliveryPhone) {
        void notify({ phone: tx.deliveryPhone }, shortMessage, { useDevKeys: true });
        void notify({ whatsapp: tx.deliveryPhone }, message, { useDevKeys: true });
      }

      // 5. Persist a PDF receipt for re-download (never throws).
      try {
        const receiptPdfB64 = buildLicenseReceiptPdf({
          schoolName: names.length === 1 ? names[0]! : `${names.length} schools (${names.join(", ")})`,
          reference: tx.reference,
          amount: `GHS ${tx.amount.toFixed(2)}`,
          method: tx.method === "MOMO" ? `Mobile Money${tx.provider ? ` (${tx.provider})` : ""}` : "Paystack (card / mobile money)",
          date: new Date(tx.createdAt).toLocaleString(),
          purpose: names.length === 1 ? "Additional school license (GES School MIS)" : `${names.length} additional school licenses (GES School MIS)`,
          status: "SUCCESS",
        }).toString("base64");
        await p.paymentGatewayTx.update({ where: { id: txId }, data: { receiptPdf: receiptPdfB64 } });
        if (tx.deliveryEmail) {
          void notify(
            { email: tx.deliveryEmail },
            `Receipt ${tx.reference}: ${label} — GHS ${tx.amount.toFixed(2)} via ${tx.method}. Purpose: ${names.length === 1 ? "Additional school license" : `${names.length} additional school licenses`}. Thank you!`,
            {
              subject: `Payment receipt ${tx.reference} — ${label}`,
              useDevKeys: true,
              attachments: [{ filename: `GES-MIS-receipt-${tx.reference}.pdf`, content: receiptPdfB64 }],
            },
          );
        }
      } catch (pdfErr) {
        console.error("[schools] receipt PDF generation failed", pdfErr);
      }
      return settled;
    }

    // License activation payments settle straight into the license record
    // (no fee receipt, no student). "Instantly after payment" by design.
    // The pre-issued key (recorded in the Developer Console at sale time) is
    // activated AND delivered to the buyer's own contact (email/WhatsApp/SMS)
    // the moment the gateway confirms the charge.
    if (tx.purpose === "LICENSE" || tx.purpose === "LICENSE_PURCHASE") {
      // PUBLIC PURCHASE (/api/license/purchase): a school that hasn't bought
      // yet pays the DEVELOPER online. The tx is stamped with the BUYER's
      // school code (never this deployment's) and settles into a fresh key for
      // THAT school — this deployment's own License row is never touched (the
      // buyer runs their own installation).
      //
      // SCHOOL ACTIVATION (/api/license/pay): the tx is stamped with the
      // PAYING school's license code. Legacy transactions default to "main".
      // Everything below is scoped to THAT school — a payment for school X can
      // never activate or deliver another school's key.
      const isPurchase = tx.purpose === "LICENSE_PURCHASE";
      const scope = String(tx.schoolId || "main").toUpperCase();
      // Case-insensitive school match — licenses store "main", "MAIN" and
      // "Main" interchangeably across flows.
      let license = await p.license.findFirst({
        where: { schoolId: { in: [scope, scope.toLowerCase()] } },
        orderBy: { createdAt: "desc" },
      });
      // A PUBLIC PURCHASE is a NEW school — there is no license row for it in
      // this deployment, and we must NOT fall back to this deployment's own
      // license (that would activate the wrong school). School activations
      // still fall back when the school isn't licensed yet.
      if (!isPurchase && !license && scope !== "MAIN") {
        // school not yet licensed — fall back to the most recent license so the
        // schoolId / code used below still matches the paying school when the
        // deployment holds a single license.
        license = await p.license.findFirst({ orderBy: { createdAt: "desc" } });
      }
      const licSchool = (license?.schoolId || scope || "main").toUpperCase();
      // Issuances are STRICTLY school-scoped — never fall back to another
      // school's key, even in single-school deployments.
      let issued: { id: string; schoolId: string; keyEncrypted: string; notes?: string | null } | null =
        await p.licenseIssuance.findFirst({
          where: { schoolId: licSchool, revokedAt: null },
          orderBy: { createdAt: "desc" },
        });

      let realKey: string | null = null;
      if (issued) {
        try {
          realKey = decryptLicenseKey(issued.keyEncrypted);
        } catch {
          realKey = null; // old secret unavailable — activation still proceeds
        }
      }

      // AUTO-ISSUE: payment confirmed but no usable key was pre-issued — mint
      // one for THIS school right now, named after its school code, so the
      // buyer's key is ready the instant payment settles and the developer
      // never has to issue manually. It is recorded in the issuance history,
      // written to the audit log, and the school appears in the Developer
      // Console → Schools directory. If minting is impossible (e.g. no signing
      // secret configured in production), the developer alert below still fires.
      if (!realKey && !issued) {
        const code = scope.replace(/[^A-Z0-9]/g, "") || "MAIN";
        try {
          // Subscription plans fix the subscription length (30/365/730 days) in
          // the tx meta at purchase time; one-time tiers default to 365.
          let metaDays = 365;
          try {
            const parsed = tx.meta ? (JSON.parse(tx.meta) as Record<string, unknown>) : {};
            const d = Number(parsed.days);
            if (Number.isFinite(d) && d > 0 && d <= 3650) metaDays = Math.round(d);
          } catch { /* fall back to 365 */ }
          const minted = generateActivationKey(code, metaDays);
          const devUser = await p.user.findFirst({ where: { role: { name: "developer" } }, select: { id: true } });
          issued = await p.licenseIssuance.create({
            data: {
              schoolId: minted.schoolId,
              days: minted.days,
              nonce: minted.nonce,
              keyHash: hashValue(minted.key),
              keyEncrypted: encryptLicenseKey(minted.key),
              issuedById: devUser?.id ?? null,
              notes: `Auto-issued on license payment confirmation (${metaDays} days)`,
            },
          });
          realKey = minted.key;
          // Write the audit row through the TRANSACTION client — the shared
          // auditLog() helper uses the global client and would block on the
          // write lock this transaction holds.
          await p.auditLog.create({
            data: {
              userId: devUser?.id ?? null,
              action: "ISSUE_KEY_AUTO",
              entity: "license",
              entityId: `license:${minted.nonce}`,
              meta: JSON.stringify({
                schoolId: minted.schoolId,
                days: minted.days,
                nonce: minted.nonce,
                reason: "license payment confirmed without a pre-issued key",
                tx: tx.reference,
              }),
            },
          });
          const sch = await getSchool();
          // Public purchases record the BUYER's own school name (typed on the
          // /buy page) in the Developer Console; school activations use the
          // deployment's own school name.
          const buyerName = isPurchase ? (tx.buyerName ?? `School ${code}`) : (sch?.name ?? `School ${code}`);
          await p.vendorSchool.upsert({
            where: { licenseCode: code },
            create: {
              licenseCode: code,
              name: buyerName,
              district: sch?.district ?? null,
              contactEmail: tx.deliveryEmail ?? null,
              contactPhone: tx.deliveryPhone ?? null,
            },
            update: {
              name: buyerName,
              contactEmail: tx.deliveryEmail ?? undefined,
              contactPhone: tx.deliveryPhone ?? undefined,
            },
          });
        } catch (e) {
          console.error("[license] auto-issue failed, alerting developer", e);
          issued = null;
          realKey = null;
        }
      }

      const key = realKey || (issued ? issued.schoolId : "MAIN");
      // A PUBLIC PURCHASE is a NEW school that will run its OWN installation —
      // it must NOT create or touch this deployment's License row (that would
      // activate the wrong school here). The key is minted + delivered below;
      // the buyer activates it on their own copy.
      if (!isPurchase) {
        const data: Record<string, unknown> = {
          status: "ACTIVE",
          activatedAt: new Date(),
          rollbackSuspected: false,
          notes: realKey
            ? `Activated with issued key (${issued!.schoolId}) after ${tx.method} payment (${tx.reference})`
            : `Activated via ${tx.method} online payment (${tx.reference})`,
        };
        if (realKey) {
          data.licenseKey = realKey;
          data.schoolId = (issued?.schoolId || "MAIN").toUpperCase();
        }
        if (!license) {
          license = await p.license.create({
            data: {
              licenseKey: realKey || `ONLINE-${tx.reference}`,
              schoolId: (issued?.schoolId || "MAIN").toUpperCase(),
              ...data,
              trialStartedAt: new Date(),
            },
          });
        } else {
          try {
            await p.license.update({ where: { id: license.id }, data });
          } catch (err: unknown) {
            // The key already lives on another license row (e.g. a second payment
            // for the same school, or a leftover from a failed settlement).
            // Settlement must NEVER crash — activate without rewriting the key.
            const isCollision =
              err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "P2002";
            if (!isCollision) throw err;
            const { licenseKey: _skip, schoolId: _skip2, ...safe } = data;
            // The key already lives on another license row for this school —
            // activate this row without rewriting the key (the delivered key
            // still validates for the school, so delivery below proceeds).
            await p.license.update({ where: { id: license.id }, data: safe });
          }
        }
      }
      if (issued && realKey) {
        await p.licenseIssuance.update({
          where: { id: issued.id },
          data: { sentTo: tx.deliveryEmail || tx.deliveryPhone || null, sentAt: new Date() },
        });
      }
      const settled = await p.paymentGatewayTx.update({ where: { id: txId }, data: { status: "SUCCESS" } });

      // Deliver the key INSTANTLY to the buyer's own contact (never displayed
      // on screen, never sent to the developer's address). Fire-and-forget so a
      // slow provider never blocks settlement.
      if (realKey) {
        const school = await getSchool();
        // Public purchases greet the BUYER's own school name (typed on /buy);
        // school activations use the deployment's name.
        const schoolName = isPurchase ? (tx.buyerName ?? "your school") : (school?.name ?? "your school");
        const support = `${school?.developerName ?? "Your system developer"}${school?.developerPhone ? ` · ${school.developerPhone}` : ""}`;
        // When the key was minted automatically on payment, the license is
        // ALREADY active — the buyer just keeps the key for reference. When a
        // pre-issued key was used, the standard activation steps apply.
        // A PUBLIC PURCHASE has no deployment yet — the buyer must activate the
        // key on their own new installation, so the standard steps apply.
        const autoActivated = !isPurchase && issued?.notes === "Auto-issued on license payment confirmation";
        const howToActivate = autoActivated
          ? `Your license has been ACTIVATED automatically — you are fully licensed. No further action is needed; keep this key safe as your proof of license.`
          : `To activate:\n   1. Log in to your admin panel.\n   2. Click “Activate now” on the license banner (or wait for the activation prompt when the trial ends).\n   3. Paste the key into the “Already have a license key?” box and click Activate.`;
        const emailMessage = [
          `Dear ${schoolName} Administrator,`,
          ``,
          `Payment confirmed (${tx.method} · ${tx.reference}). Your GES School MIS activation license:`,
          ``,
          `   License key:  ${realKey}`,
          ``,
          howToActivate,
          ``,
          `The key is machine-verifiable and cannot be forged. Keep it private.`,
          ``,
          `For support: ${support}`,
          ``,
          `— GES School MIS`,
        ].join("\n");
        const shortMessage = autoActivated
          ? `Payment received — your ${schoolName} GES School MIS license is now ACTIVE. Your license key: ${realKey}. Keep it safe. Support: ${support}`
          : `Payment received — your ${schoolName} GES School MIS license key: ${realKey}. Paste it into the license activation prompt to activate. Support: ${support}`;
        if (tx.deliveryEmail) {
          void notify({ email: tx.deliveryEmail }, emailMessage, {
            subject: `Your ${schoolName} license key is ready`, useDevKeys: true,
          });
        }
        if (tx.deliveryPhone) {
          // WhatsApp supports long text — send the FULL message (like email);
          // SMS gets the compact version.
          void notify({ phone: tx.deliveryPhone }, shortMessage, { useDevKeys: true });
          void notify({ whatsapp: tx.deliveryPhone }, emailMessage, { useDevKeys: true });
        }

        // Payment receipt — separate from the key delivery, sent to the same
        // buyer contact so they have a clean record of what they paid.
        const receiptMessage = [
          `Dear ${schoolName} Administrator,`,
          ``,
          `Thank you for your payment. Here is your receipt:`,
          ``,
          `   Reference:  ${tx.reference}`,
          `   Amount:     GHS ${tx.amount.toFixed(2)}`,
          `   Method:     ${tx.method}${tx.provider ? ` (${tx.provider})` : ""}`,
          `   Date:       ${new Date().toLocaleString()}`,
          `   Purpose:    License activation`,
          ``,
          `This receipt is for your records. Keep it together with your license key.`,
          ``,
          `For support: ${support}`,
          ``,
          `— GES School MIS`,
        ].join("\n");
        // Generate the PDF receipt (zero-dependency A4 writer) and persist it
        // on the transaction so the buyer can re-download it from the License
        // page any time. Never throws — a PDF failure must not break settlement.
        let receiptPdfB64: string | null = null;
        try {
          receiptPdfB64 = buildLicenseReceiptPdf({
            schoolName,
            reference: tx.reference,
            amount: `GHS ${tx.amount.toFixed(2)}`,
            method: tx.method === "MOMO"
              ? `Mobile Money${tx.provider ? ` (${tx.provider})` : ""}`
              : "Paystack (card / mobile money)",
            date: new Date(tx.createdAt).toLocaleString(),
            purpose: "License activation (GES School MIS)",
            status: "SUCCESS",
            developerName: school?.developerName,
            developerPhone: school?.developerPhone,
            developerEmail: school?.developerEmail,
          }).toString("base64");
          await p.paymentGatewayTx.update({ where: { id: txId }, data: { receiptPdf: receiptPdfB64 } });
        } catch (pdfErr) {
          console.error("[license] receipt PDF generation failed", pdfErr);
          receiptPdfB64 = null;
        }
        const attachment = receiptPdfB64
          ? [{ filename: `GES-MIS-receipt-${tx.reference}.pdf`, content: receiptPdfB64 }]
          : undefined;
        if (tx.deliveryEmail) {
          void notify({ email: tx.deliveryEmail }, receiptMessage, {
            subject: `Payment receipt ${tx.reference} — ${schoolName}`, useDevKeys: true, attachments: attachment,
          });
        }
        if (tx.deliveryPhone) {
          void notify({ whatsapp: tx.deliveryPhone }, receiptMessage, { useDevKeys: true });
        }
        // A copy also goes to the SCHOOL'S OWN channels (its own email/WhatsApp
        // settings, school-owned keys) so the school office keeps a record in
        // its own messaging — the developer copy above uses the vendor's keys.
        if (school?.email || school?.phone || school?.whatsapp) {
          void notify(
            {
              email: school?.email || undefined,
              phone: school?.phone || undefined,
              whatsapp: school?.whatsapp || school?.phone || undefined,
            },
            receiptMessage,
            { subject: `Payment receipt ${tx.reference} — ${schoolName}`, attachments: attachment } // school keys
          );
        }
      } else {
        const school = await getSchool();
        void notify(
          {
            email: school?.developerEmail || undefined,
            phone: school?.developerPhone || undefined,
            whatsapp: school?.developerPhone || undefined,
          },
          `A school just paid ${tx.method} (${tx.reference}) for a license but no key was issued yet. Issue a key in the Developer Console → Licensing and send it to them.`,
          { subject: "License paid — issue & send the key", useDevKeys: true }
        );
      }
      return settled;
    }

    const student = await p.student.findUnique({
      where: { id: tx.studentId ?? undefined },
      include: { parents: { include: { parent: true }, take: 1 } },
    });
    if (!student) throw new ApiError("Student not found", 404);

    const [term, year] = await Promise.all([
      p.term.findFirst({ where: { isCurrent: true } }),
      p.academicYear.findFirst({ where: { isCurrent: true } }),
    ]);
    // Receipt numbers are max-based; retry once if a concurrent settlement won the race.
    let receiptNo = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      receiptNo = await nextReceiptNo();
      try {
        await p.feePayment.create({
          data: {
            receiptNo,
            studentId: tx.studentId ?? student.id,
            amount: tx.amount,
            method: tx.method,
            reference: tx.providerRef ?? tx.reference,
            date: new Date(),
            academicYearId: year?.id ?? null,
            termId: term?.id ?? null,
            note: `Online ${tx.method}${tx.provider ? ` (${tx.provider})` : ""} payment (${tx.reference})`,
          },
        });
        break;
      } catch (err: unknown) {
        const isCollision = err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "P2002";
        if (!isCollision || attempt === 2) throw err;
      }
    }
    const settled = await p.paymentGatewayTx.update({ where: { id: txId }, data: { status: "SUCCESS", receiptNo } });

    // Fire-and-forget receipt notification (email / WhatsApp / SMS per settings).
    const parentEmail = student.parents[0]?.parent.email;
    void notify(
      {
        email: student.email || parentEmail || undefined,
        phone: student.phone || undefined,
        whatsapp: student.phone || undefined,
      },
      `Receipt ${receiptNo}: ${student.fullName} paid GHS ${tx.amount.toFixed(2)} via ${tx.method} (${tx.reference}). Thank you!`,
      { subject: `Fee payment receipt ${receiptNo} — ${student.fullName}` }
    );
    return settled;
    },
    { timeout: 30_000 }
  );
}

/**
 * Re-check a PENDING transaction against its gateway and settle on success.
 * In test mode without gateway keys, PENDING transactions auto-succeed.
 */
export async function verifyAndSettle(txId: string): Promise<{ status: string; receiptNo?: string | null }> {
  const tx = await prisma.paymentGatewayTx.findUnique({ where: { id: txId } });
  if (!tx) throw new ApiError("Transaction not found", 404);
  if (tx.status === "SUCCESS") return { status: tx.status, receiptNo: tx.receiptNo };
  if (tx.status === "FAILED" || tx.status === "EXPIRED") return { status: tx.status };

  // License payments use the DEVELOPER's gateway keys; fee payments the school's.
  const isLicenseTx = tx.purpose === "LICENSE" || tx.purpose === "LICENSE_PURCHASE";
  const s = isLicenseTx ? await getDevPaymentSettings() : await getPaymentSettings();
  const map = isLicenseTx ? DEV_KEYS : (KEYS as unknown as Record<string, string>);

  // expire stale pending transactions (> 1 hour, no confirmation)
  if (Date.now() - tx.createdAt.getTime() > 60 * 60 * 1000) {
    const expired = await prisma.paymentGatewayTx.update({ where: { id: txId }, data: { status: "EXPIRED" } });
    return { status: expired.status };
  }

  const momoProvider = (tx.provider as MomoProvider | null) ?? "MTN";
  if (needsSimulation(s, tx.method as "MOMO" | "PAYSTACK", momoProvider)) {
    // LICENSE / SCHOOL payments are NEVER simulated — a simulated charge must
    // not activate a license or create a school for free. They stay pending
    // until the developer resolves them (or the buyer contacts the developer).
    if (tx.purpose === "LICENSE" || tx.purpose === "LICENSE_PURCHASE" || tx.purpose === "SCHOOL") {
      return { status: tx.status };
    }
    const settled = await settleGatewayTx(txId);
    return { status: settled.status, receiptNo: settled.receiptNo };
  }

  let gatewayStatus = "UNKNOWN";
  try {
    if (tx.method === "MOMO" && tx.providerRef) {
      const r = await momoCheckStatus(tx.providerRef, s, momoProvider, map);
      gatewayStatus = r.status;
      if (r.financialTransactionId && tx.providerRef !== r.financialTransactionId) {
        await prisma.paymentGatewayTx.update({ where: { id: txId }, data: { providerRef: r.financialTransactionId } });
      }
    } else if (tx.method === "PAYSTACK" && tx.providerRef) {
      const r = await paystackVerify(tx.providerRef, s);
      gatewayStatus = r.status === "success" ? "SUCCESSFUL" : r.status === "failed" ? "FAILED" : r.status;
    } else {
      return { status: tx.status };
    }
  } catch {
    // Gateway unreachable or keys removed mid-flight — stay PENDING, keep polling.
    return { status: tx.status };
  }

  if (gatewayStatus === "SUCCESSFUL") {
    const settled = await settleGatewayTx(txId);
    return { status: settled.status, receiptNo: settled.receiptNo };
  }
  if (gatewayStatus === "FAILED") {
    await prisma.paymentGatewayTx.update({ where: { id: txId }, data: { status: "FAILED" } });
    return { status: "FAILED" };
  }
  return { status: tx.status }; // still PENDING
}

import { handle, ApiError, readJson, ok } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { getPaymentSettings, savePaymentSettings, maskSettings } from "@/lib/payments";

export const GET = handle(async () => {
  const user = await requirePerm("fees", "read");
  const settings = await getPaymentSettings();
  // The developer's own gateway keys are visible ONLY to the developer. Every
  // other role gets masked values — but the school can still configure their
  // own keys (masked values are ignored on save; typing a new key replaces it).
  return ok(user.role.name === "developer" ? settings : maskSettings(settings));
});

export const PUT = handle(async (req) => {
  const user = await requirePerm("fees", "manage");
  const body = await readJson<Record<string, unknown>>(req);

  // never accept raw secrets through this path unless they are full new values
  const patch: Record<string, string | boolean> = {};
  const allow = [
    "testMode",
    "momoEnabled", "momoEnv", "momoBusinessPhone",
    "airtelEnabled", "airtelEnv", "airtelBusinessPhone",
    "telecelEnabled", "telecelEnv", "telecelBusinessPhone",
    "paystackEnabled", "paystackPublicKey",
  ] as const;
  for (const k of allow) {
    const v = body[k];
    if (typeof v === "boolean" || typeof v === "string") patch[k] = v;
  }
  for (const k of ["momoSubscriptionKey", "momoApiKey", "momoApiUserId", "airtelSubscriptionKey", "airtelApiKey", "airtelApiUserId", "telecelSubscriptionKey", "telecelApiKey", "telecelApiUserId", "paystackSecretKey"] as const) {
    const v = body[k];
    // masked values are ignored; empty string clears the stored secret
    if (typeof v === "string" && !v.includes("••••")) patch[k] = v;
  }
  for (const envKey of ["momoEnv", "airtelEnv", "telecelEnv"] as const) {
    if (body[envKey] !== undefined && body[envKey] !== "sandbox" && body[envKey] !== "live") {
      throw new ApiError(`${envKey} must be sandbox or live`, 422);
    }
  }

  const saved = await savePaymentSettings(patch);
  return ok(user.role.name === "developer" ? saved : maskSettings(saved));
});

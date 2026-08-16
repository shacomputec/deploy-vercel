import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson, ok } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { clearSettingsCache } from "@/lib/settings";

/** Payment gateway secret keys are only ever visible/editable via the dedicated
 * Admin → Online Payments page (which masks secrets on read), and license pricing
 * (trial days / activation fee / MoMo numbers) is the developer's sales config.
 * Both are excluded from the generic settings API for anyone below the Developer role.
 * The SMSOnlineGH API key follows the same rule: the developer's key is masked
 * for everyone else, and a school can paste its own key (replace-on-write). */
const DEV_ONLY_PREFIXES = ["payments.", "dev.", "license."];
const isDevOnlyKey = (key: string) => DEV_ONLY_PREFIXES.some((p) => key.startsWith(p));

// Secrets the SCHOOL owns (its own providers). They are masked on read for
// everyone below the Developer role and kept unchanged on save when the masked
// value comes back — the school pastes a fresh value to replace its key.
const SECRET_KEYS = [
  "sms.smsonlinegh.apiKey",
  "sms.hubtel.apiKey",
  "sms.twilio.sid",
  "sms.twilio.token",
  "notify.email.apiKey",
  "notify.whatsapp.sid",
  "notify.whatsapp.token",
  "notify.whatsapp.from",
  "sms.twilio.from",
];
const isSecretKey = (key: string) => SECRET_KEYS.includes(key);
const mask = (v: string) => (v ? `••••${v.slice(-4)}` : "");

export const GET = handle(async () => {
  const user = await requirePerm("settings", "read");
  let settings = await prisma.setting.findMany({ orderBy: { key: "asc" } });
  if (user.role.name !== "developer") {
    settings = settings
      .filter((s) => !isDevOnlyKey(s.key))
      .map((s) => (isSecretKey(s.key) ? { ...s, value: mask(s.value ?? "") } : s));
  }
  return ok(settings);
});

export const PUT = handle(async (req) => {
  const user = await requirePerm("settings", "update");
  const body = (await req.json()) as { key: string; value: string }[];
  if (!Array.isArray(body) || !body.length) throw new ApiError("Provide an array of { key, value }");

  if (user.role.name !== "developer") {
    const forbidden = body.some((s) => isDevOnlyKey(s.key));
    if (forbidden) throw new ApiError("Developer keys, payment gateway keys and license pricing are managed by the system developer.", 403);
    // masked secret values are ignored (the stored key is kept); a fresh key replaces it
    for (const entry of body) {
      if (isSecretKey(entry.key) && entry.value.includes("••••")) entry.value = "__KEEP__";
    }
  }
  const toSave = body.filter((s) => !(s.value === "__KEEP__"));

  await prisma.$transaction(
    toSave.map((s) =>
      prisma.setting.upsert({
        where: { key: s.key },
        update: { value: s.value },
        create: { key: s.key, value: s.value },
      })
    )
  );
  clearSettingsCache();
  await auditLog(user.id, "UPDATE", "settings", undefined, { keys: toSave.map((s) => s.key) });
  return ok({ saved: toSave.length });
});

import { handle, ApiError, readJson, ok, rateLimit } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { getSchool } from "@/lib/school";
import { sendSms } from "@/lib/sms";
import { getSetting } from "@/lib/settings";
import { auditLog } from "@/lib/audit";

/**
 * Send a live test notification through the configured channels (email, SMS,
 * WhatsApp) and report per-channel success/failure so admins can verify their
 * provider setup (Resend / Twilio / Hubtel) with one click. Never throws for a
 * channel failure — it returns the detailed results instead.
 */
export const POST = handle(async (req) => {
  const user = await requirePerm("settings", "update");
  rateLimit(`notifytest:${user.id}`, 5, 60_000);

  const body = await readJson<{ to?: string; emailTo?: string }>(req);
  const school = await getSchool();
  const fallbackPhone = school?.developerPhone || school?.phone || "";
  const fallbackEmail = school?.developerEmail || school?.email || "";

  const toPhone = String(body.to || "").trim() || fallbackPhone;
  const toEmail = String(body.emailTo || "").trim() || fallbackEmail;
  if (!toPhone && !toEmail) {
    throw new ApiError("Set a destination phone/email in the school profile first, or pass one in the request.", 422);
  }

  const message = `GES School MIS test message — sent at ${new Date().toLocaleString()}. If you received this, your notification channel is working. ✅`;
  const results: Record<string, { ok: boolean; detail?: string }> = {};

  // Email (Resend)
  const emailMode = (await getSetting("notify.email.mode")) || (process.env.RESEND_API_KEY ? "resend" : "console");
  try {
    if (emailMode === "resend" && toEmail) {
      if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured in .env");
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "GES School MIS <onboarding@resend.dev>",
          to: [toEmail],
          subject: "GES School MIS — notification channel test",
          text: message,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
      if (!res.ok) {
        const hint = res.status === 403
          ? "Resend is in TEST mode — it only delivers to the account's verified address (shacomputec@gmail.com). Verify your domain in Resend (add the DNS records) to send to any recipient."
          : "";
        throw new Error(`Resend returned ${res.status}${j.message ? ` — ${j.message}` : ""}${hint ? ` — ${hint}` : ""}`);
      }
      results.email = { ok: true, detail: `queued id ${j.id ?? ""}`.trim() };
    } else if (toEmail) {
      results.email = { ok: true, detail: `console mode — logged to server output (target ${toEmail})` };
    } else {
      results.email = { ok: false, detail: "no destination email" };
    }
  } catch (e) {
    results.email = { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }

  // WhatsApp (Twilio)
  const waMode = (await getSetting("notify.whatsapp.mode")) || (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_WHATSAPP_FROM ? "twilio" : "off");
  try {
    if (waMode === "twilio" && toPhone) {
      const sid = process.env.TWILIO_ACCOUNT_SID;
      const token = process.env.TWILIO_AUTH_TOKEN;
      const from = process.env.TWILIO_WHATSAPP_FROM;
      if (!sid || !token || !from) throw new Error("Twilio credentials incomplete (SID / AUTH_TOKEN / WHATSAPP_FROM)");
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}` },
        body: new URLSearchParams({ From: `whatsapp:${from.replace(/^whatsapp:/, "")}`, To: `whatsapp:${toPhone.replace(/^whatsapp:/, "")}`, Body: message }),
      });
      const j = (await res.json().catch(() => ({}))) as { sid?: string; message?: string; error_message?: string };
      if (!res.ok) {
        const msg = String(j.message || `Twilio returned ${res.status}`);
        const hint = res.status === 400 && /trial accounts/.test(msg)
          ? "Twilio trial account — WhatsApp only works with the SANDBOX sender (+14155238886). Set TWILIO_WHATSAPP_FROM=whatsapp:+14155238886 and join the sandbox from your phone (Twilio Console → WhatsApp → Sandbox), or provision a WhatsApp Business sender."
          : res.status === 422 && /verified recipient/.test(msg)
            ? "Twilio trial account — add this number as a Verified recipient + use the sandbox sender (+14155238886) in Twilio Console"
            : "";
        throw new Error(`${msg}${hint ? ` — ${hint}` : ""}`);
      }
      results.whatsapp = { ok: true, detail: `queued sid ${j.sid ?? ""}`.trim() };
    } else if (waMode === "off") {
      results.whatsapp = { ok: false, detail: "WhatsApp mode is off (set notify.whatsapp.mode=twilio + TWILIO_WHATSAPP_FROM)" };
    } else {
      results.whatsapp = { ok: false, detail: "no destination phone" };
    }
  } catch (e) {
    results.whatsapp = { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }

  // SMS (SMSOnlineGH / Twilio / Hubtel / console — mode from settings)
  try {
    if (toPhone) {
      const res = await sendSms(toPhone, message);
      results.sms = { ok: true, detail: `${res.provider}${res.messageId ? ` id ${res.messageId}` : ""}` };
    } else {
      results.sms = { ok: false, detail: "no destination phone" };
    }
  } catch (e) {
    results.sms = { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }

  await auditLog(user.id, "TEST", "notifications", undefined, {
    toPhone: toPhone ? toPhone.slice(0, 4) + "****" + toPhone.slice(-2) : "",
    toEmail,
    results: Object.fromEntries(Object.entries(results).map(([k, v]) => [k, v.ok])),
  });

  return ok({ toPhone, toEmail, results });
});

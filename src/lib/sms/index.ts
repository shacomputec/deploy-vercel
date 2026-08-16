// SMS abstraction — the active provider is chosen by the `sms.mode` setting
// (Admin → Settings → Notifications) with `SMS_MODE` as the environment fallback.
// Providers: console (zero-setup dev log) · smsonlinegh (Ghana) · hubtel · twilio.
//
// Every provider's credentials are school-owned settings (admin-configurable):
//   sms.smsonlinegh.apiKey / sms.smsonlinegh.sender
//   sms.hubtel.apiKey
//   sms.twilio.sid / sms.twilio.token / sms.twilio.from
// Environment variables (SMSONLINEGH_API_KEY, HUBTEL_API_KEY, TWILIO_*) remain
// as fallbacks for self-hosted installs.
//
// `useDevKeys: true` resolves the DEVELOPER's own credentials first
// (dev.messaging.*) — used only for license/activation notifications, never for
// school traffic.
import { getSetting } from "@/lib/settings";

export type SmsResult = { provider: string; messageId?: string };

export type SmsOptions = { useDevKeys?: boolean };

async function sendConsole(phone: string, message: string): Promise<SmsResult> {
  console.log(`\n📱 [SMS·console] To ${phone}\n   ${message}\n`);
  return { provider: "console" };
}

/** Settings key for a credential — school-owned, or the developer's when useDevKeys. */
async function cred(schoolKey: string, devKey: string, envName?: string, opts?: SmsOptions): Promise<string | undefined> {
  const primary = opts?.useDevKeys ? devKey : schoolKey;
  const fallback = opts?.useDevKeys ? schoolKey : devKey;
  return (await getSetting(primary)) || (await getSetting(fallback)) || (envName ? process.env[envName] : undefined);
}

async function sendSmsOnlineGh(phone: string, message: string, opts?: SmsOptions): Promise<SmsResult> {
  const apiKey = await cred("sms.smsonlinegh.apiKey", "dev.messaging.smsonlinegh.apiKey", "SMSONLINEGH_API_KEY", opts);
  if (!apiKey) throw new Error("SMSOnlineGH API key not configured (set it in Admin → Settings → Notifications or SMSONLINEGH_API_KEY)");
  const sender = (await getSetting(opts?.useDevKeys ? "dev.messaging.smsonlinegh.sender" : "sms.smsonlinegh.sender")) || process.env.SMSONLINEGH_SENDER || "GESSMIS";
  // SMSOnlineGH HTTP API v5 — https://dev.smsonlinegh.com
  const res = await fetch("https://api.smsonlinegh.com/v5/message/sms/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      key: apiKey,
      text: message,
      type: "0", // plain SMS
      sender,
      to: phone,
    }),
  });
  if (!res.ok) throw new Error(`SMSOnlineGH SMS failed (${res.status})`);
  const json = (await res.json().catch(() => ({}))) as {
    handshake?: { id?: number; label?: string; message?: string };
    data?: { batch?: string; destinations?: { to?: string; status?: { id?: number; label?: string } }[] };
  };
  // The gateway answers 200 even when the message is rejected — the real result
  // lives in handshake + per-destination status labels (e.g. DS_REJECTED_*).
  const handshake = json.handshake?.label ?? "";
  if (handshake && handshake !== "HSHK_OK") {
    throw new Error(`SMSOnlineGH rejected the request: ${handshake}${json.handshake?.message ? ` — ${json.handshake.message}` : ""}`);
  }
  const destinations = json.data?.destinations ?? [];
  const rejected = destinations.find((d) => (d.status?.label ?? "").startsWith("DS_REJECTED"));
  if (rejected) {
    const hint = rejected.status?.label === "DS_REJECTED_SENDER_UNREGISTERED"
      ? "The sender name is not registered on your smsonlinegh.com account — add it under SMS Messaging → Sender Names (or set a registered one in Admin → Settings → Notifications → SMSOnlineGH sender ID)."
      : "";
    throw new Error(`SMSOnlineGH rejected ${rejected.to ?? "the number"}: ${rejected.status?.label ?? "unknown"}${hint ? ` — ${hint}` : ""}`);
  }
  return { provider: "smsonlinegh", messageId: json.data?.batch };
}

async function sendHubtel(phone: string, message: string, opts?: SmsOptions): Promise<SmsResult> {
  const apiKey = await cred("sms.hubtel.apiKey", "dev.messaging.hubtel.apiKey", "HUBTEL_API_KEY", opts);
  if (!apiKey) throw new Error("Hubtel API key not configured (set it in Admin → Settings → Notifications or HUBTEL_API_KEY)");
  // Hubtel SMS v1 (Ghana) — https://developers.hubtel.com
  const res = await fetch("https://api.hubtel.com/v1/messages/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(apiKey).toString("base64")}`,
    },
    body: JSON.stringify({
      From: process.env.HUBTEL_SENDER_ID || "GESSMIS",
      To: phone.replace(/^0/, "+233"),
      Content: message,
    }),
  });
  if (!res.ok) throw new Error(`Hubtel SMS failed (${res.status})`);
  const json = (await res.json()) as { MessageId?: string };
  return { provider: "hubtel", messageId: json.MessageId };
}

async function sendTwilio(phone: string, message: string, opts?: SmsOptions): Promise<SmsResult> {
  const sid = (await cred("sms.twilio.sid", "dev.messaging.twilio.sid", "TWILIO_ACCOUNT_SID", opts)) || process.env.TWILIO_ACCOUNT_SID;
  const token = (await cred("sms.twilio.token", "dev.messaging.twilio.token", "TWILIO_AUTH_TOKEN", opts)) || process.env.TWILIO_AUTH_TOKEN;
  const from = (await getSetting(opts?.useDevKeys ? "dev.messaging.twilio.from" : "sms.twilio.from")) || process.env.TWILIO_FROM;
  if (!sid || !token) throw new Error("Twilio credentials not configured");
  if (!from) throw new Error("Twilio SMS sender number not configured (set it in Admin → Settings → Notifications or TWILIO_FROM)");
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        To: phone.replace(/^0/, "+233"),
        From: from,
        Body: message,
      }),
    }
  );
  if (!res.ok) {
    let detail = `Twilio SMS failed (${res.status})`;
    const body = await res.text().catch(() => "");
    try {
      const j = JSON.parse(body) as { message?: string; error_message?: string };
      detail += ` — ${j.message || j.error_message || ""}`;
    } catch {
      /* non-JSON body */
    }
    throw new Error(detail.trim());
  }
  const json = (await res.json()) as { sid?: string };
  return { provider: "twilio", messageId: json.sid };
}

export async function sendSms(phone: string, message: string, opts?: SmsOptions): Promise<SmsResult> {
  const mode = (await getSetting("sms.mode")) || process.env.SMS_MODE || "console";
  switch (mode) {
    case "smsonlinegh":
      return sendSmsOnlineGh(phone, message, opts);
    case "hubtel":
      return sendHubtel(phone, message, opts);
    case "twilio":
      return sendTwilio(phone, message, opts);
    default:
      return sendConsole(phone, message);
  }
}

export function formatOtpMessage(code: string, schoolName: string) {
  return `Your ${schoolName} result-checker OTP is ${code}. It expires in 5 minutes. Do not share it with anyone.`;
}

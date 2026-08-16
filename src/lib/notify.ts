// ============================================================================
// Unified notification hub — email (Resend) · WhatsApp (Twilio) · SMS (existing)
// ----------------------------------------------------------------------------
// `notify()` fans a message out to every channel that is configured. It never
// throws: failures are logged and the rest of the flow continues. This is the
// single place OTPs, payment receipts and license activation messages travel
// through, so "send anything through email / WhatsApp / SMS" just works.
// ============================================================================
import { sendSms } from "@/lib/sms";
import { getSetting } from "@/lib/settings";
import { prisma } from "@/lib/prisma";

export type NotifyRecipients = {
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
};

export type NotifyAttachment = {
  filename: string;
  /** base64-encoded file content (e.g. a generated PDF). */
  content: string;
};

export type NotifyOptions = {
  subject?: string;
  /** Resolve the DEVELOPER's own channel credentials first (license/activation
   * traffic). Schools always send on their own configured providers. */
  useDevKeys?: boolean;
  /** Files attached to the EMAIL channel (Resend supports base64 attachments).
   * WhatsApp/SMS carry the plain message only. */
  attachments?: NotifyAttachment[];
};

export type Channel = "SMS" | "EMAIL" | "WHATSAPP";

export type BroadcastRecipient = {
  name: string;
  phone?: string | null;
  email?: string | null;
  whatsapp?: string | null; // falls back to `phone` when absent
};

export type BroadcastResult = {
  sent: Record<Channel, number>;
  total: number; // recipients that got at least one channel
  failed: number;
};

export const ALL_CHANNELS: Channel[] = ["SMS", "EMAIL", "WHATSAPP"];

const log = (...args: unknown[]) => console.log("[notify]", ...args);

// ── Email (Resend) ────────────────────────────────────────────────────────────

async function sendEmail(
  to: string,
  subject: string,
  text: string,
  useDevKeys = false,
  attachments: NotifyAttachment[] = []
): Promise<void> {
  // School-owned key (notify.email.apiKey) with env fallback; the developer's
  // own key (dev.messaging.email.apiKey) is used for license notifications.
  const key =
    (await getSetting(useDevKeys ? "dev.messaging.email.apiKey" : "notify.email.apiKey")) ||
    (await getSetting(useDevKeys ? "notify.email.apiKey" : "dev.messaging.email.apiKey")) ||
    process.env.RESEND_API_KEY;
  const fromSetting = await getSetting(useDevKeys ? "dev.messaging.email.from" : "notify.email.from");
  const from = fromSetting || process.env.EMAIL_FROM || "GES School MIS <onboarding@resend.dev>";
  const mode = (await getSetting("notify.email.mode")) || (key ? "resend" : "console");
  if (mode !== "resend" || !key) {
    const attach = attachments.length ? `\n   [attachments: ${attachments.map((a) => a.filename).join(", ")}]` : "";
    log(`[email·console] To ${to}\n   Subject: ${subject}\n   ${text}${attach}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, text, ...(attachments.length ? { attachments } : {}) }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend failed (${res.status}) ${body.slice(0, 160)}`);
  }
}

// ── WhatsApp (Twilio WhatsApp Business API) ───────────────────────────────────

async function sendWhatsApp(to: string, text: string, useDevKeys = false): Promise<void> {
  // School-owned WhatsApp credentials (notify.whatsapp.*) with env fallback;
  // the developer's own (dev.messaging.whatsapp.*) for license notifications.
  const pre = useDevKeys ? "dev.messaging.whatsapp" : "notify.whatsapp";
  const alt = useDevKeys ? "notify.whatsapp" : "dev.messaging.whatsapp";
  const sid =
    (await getSetting(`${pre}.sid`)) || (await getSetting(`${alt}.sid`)) || process.env.TWILIO_ACCOUNT_SID;
  const token =
    (await getSetting(`${pre}.token`)) || (await getSetting(`${alt}.token`)) || process.env.TWILIO_AUTH_TOKEN;
  const from =
    (await getSetting(`${pre}.from`)) || (await getSetting(`${alt}.from`)) || process.env.TWILIO_WHATSAPP_FROM;
  const mode = (await getSetting("notify.whatsapp.mode")) || (sid && token && from ? "twilio" : "off");
  if (mode !== "twilio" || !sid || !token || !from) {
    log(`[whatsapp·off] To ${to}\n   ${text}`);
    return;
  }
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        From: `whatsapp:${from.replace(/^whatsapp:/, "")}`,
        To: `whatsapp:${to.replace(/^whatsapp:/, "")}`,
        Body: text,
      }),
    }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Twilio WhatsApp failed (${res.status}) ${body.slice(0, 160)}`);
  }
}

// ── Fan-out ───────────────────────────────────────────────────────────────────

/**
 * Send `message` to every configured channel. Individual channel failures are
 * swallowed so a broken provider never breaks a payment or login flow.
 */
export async function notify(recipients: NotifyRecipients, message: string, opts: NotifyOptions = {}): Promise<void> {
  const subject = opts.subject || "GES School MIS notification";
  const tasks: Promise<void>[] = [];
  if (recipients.email) tasks.push(sendEmail(recipients.email, subject, message, opts.useDevKeys, opts.attachments));
  if (recipients.whatsapp) tasks.push(sendWhatsApp(recipients.whatsapp, message, opts.useDevKeys));
  if (recipients.phone) {
    tasks.push(
      sendSms(recipients.phone, message, { useDevKeys: opts.useDevKeys }).then(() => undefined).catch((err) => {
        log("SMS failed:", err instanceof Error ? err.message : err);
      })
    );
  }
  if (tasks.length === 0) return;
  const settled = await Promise.allSettled(tasks);
  for (const r of settled) {
    if (r.status === "rejected") log("channel failed:", r.reason instanceof Error ? r.reason.message : r.reason);
  }
}

function isDeliverable(r: BroadcastRecipient, channels: Channel[]): boolean {
  return (
    (channels.includes("EMAIL") && !!r.email) ||
    (channels.includes("WHATSAPP") && !!(r.whatsapp || r.phone)) ||
    (channels.includes("SMS") && !!r.phone)
  );
}

/**
 * Broadcast `message` to many recipients over explicitly chosen channels
 * (SMS / Email / WhatsApp). Every recipient/channel pair is attempted
 * independently; failures are counted, not thrown, so a partial outage never
 * aborts the rest of the broadcast.
 *
 * Recipients are processed in bounded batches (default 10) so a large school
 * never fires hundreds of simultaneous provider requests at once — which
 * would trip Twilio/Hubtel/Resend rate limits.
 */
export async function sendBroadcast(
  recipients: BroadcastRecipient[],
  message: string,
  channels: Channel[],
  opts: NotifyOptions = {},
  batchSize = 10
): Promise<BroadcastResult> {
  const subject = opts.subject || "GES School MIS notification";
  const sent: BroadcastResult["sent"] = { SMS: 0, EMAIL: 0, WHATSAPP: 0 };
  let failed = 0;

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (r) => {
        const tasks: Promise<void>[] = [];
        if (channels.includes("EMAIL") && r.email) {
          tasks.push(sendEmail(r.email, subject, message, opts.useDevKeys).then(() => { sent.EMAIL++; }));
        }
        if (channels.includes("WHATSAPP") && (r.whatsapp || r.phone)) {
          tasks.push(sendWhatsApp((r.whatsapp || r.phone)!, message, opts.useDevKeys).then(() => { sent.WHATSAPP++; }));
        }
        if (channels.includes("SMS") && r.phone) {
          tasks.push(sendSms(r.phone, message, { useDevKeys: opts.useDevKeys }).then(() => { sent.SMS++; }));
        }
        if (!tasks.length) return;
        const settled = await Promise.allSettled(tasks);
        for (const s of settled) {
          if (s.status === "rejected") {
            failed++;
            log(`[broadcast] ${r.name} failed:`, s.reason instanceof Error ? s.reason.message : s.reason);
          }
        }
      })
    );
  }

  const total = recipients.filter((r) => isDeliverable(r, channels)).length;
  return { sent, total, failed };
}


/* ── In-app notifications (bell in the admin header) ───────────────────────
   Unlike the messaging `notify()` above — which pushes to SMS/email/WhatsApp —
   these create rows in the Notification table so the recipient sees an alert
   in the app's notification bell. Best-effort: never break the main flow. */

type InAppType = "info" | "success" | "warning" | "alert";

export async function notifyUserInApp(
  userId: string,
  title: string,
  message: string,
  type: InAppType = "info",
  link?: string,
) {
  try {
    await prisma.notification.create({ data: { userId, title, message, type, link } });
  } catch {
    /* best-effort */
  }
}

/** Notify every active user holding any of the given role names. */
export async function notifyRoleInApp(
  roleNames: string | string[],
  title: string,
  message: string,
  type: InAppType = "info",
  link?: string,
) {
  try {
    const roles = Array.isArray(roleNames) ? roleNames : [roleNames];
    const users = await prisma.user.findMany({
      where: { role: { name: { in: roles } }, status: "ACTIVE" },
      select: { id: true },
    });
    if (!users.length) return;
    await prisma.notification.createMany({
      data: users.map((u) => ({ userId: u.id, title, message, type, link })),
    });
  } catch {
    /* best-effort */
  }
}

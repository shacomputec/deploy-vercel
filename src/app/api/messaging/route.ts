import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok, readJson, rateLimit } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { sendBroadcast, type Channel, type BroadcastRecipient } from "@/lib/notify";

const VALID_CHANNELS: Channel[] = ["SMS", "EMAIL", "WHATSAPP"];
const AUDIENCES = ["ALL_STUDENTS", "PARENTS", "CLASS", "STAFF", "LIST"];

const normalizePhone = (p: string) => p.trim().replace(/[\s-]/g, "");

export const GET = handle(async (req) => {
  await requirePerm("messaging", "read");
  const rows = await prisma.messageLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return ok(rows);
});

/**
 * Send a broadcast. Body: { audience, classId?, phones?, emails?, message, channels? }
 * audiences: ALL_STUDENTS | PARENTS | CLASS | STAFF | LIST
 * channels:  subset of ["SMS","EMAIL","WHATSAPP"] (default ["SMS"])
 *
 * - Students' phone/email fall back to the primary parent's when missing.
 * - STAFF covers the Teacher and Staff records (active employees).
 * - LIST accepts explicit phone numbers AND email addresses.
 */
export const POST = handle(async (req) => {
  const user = await requirePerm("messaging", "create");
  rateLimit(`sms:${user.id}`, 20, 60_000); // max 20 broadcasts/min per user

  const body = await readJson<{
    audience: string;
    classId?: string;
    phones?: string[];
    emails?: string[];
    message: string;
    channels?: Channel[];
  }>(req);

  if (!body.audience || !body.message?.trim()) throw new ApiError("Audience and message are required");
  if (!AUDIENCES.includes(body.audience)) throw new ApiError(`Unknown audience: ${body.audience}`);
  if (body.message.length > 480) throw new ApiError("Message too long (max 480 characters)");

  const channels: Channel[] = (body.channels ?? ["SMS"]).filter((c): c is Channel => VALID_CHANNELS.includes(c as Channel));
  if (!channels.length) throw new ApiError("At least one channel (SMS, EMAIL or WHATSAPP) is required");

  let recipients: BroadcastRecipient[] = [];

  if (body.audience === "LIST") {
    recipients = (body.phones ?? [])
      .map((p) => ({ phone: normalizePhone(p), name: "Contact" }))
      .filter((r) => /^(\+233|0)\d{9}$/.test(r.phone));
    for (const e of body.emails ?? []) {
      const email = e.trim().toLowerCase();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) recipients.push({ phone: null, email, name: "Contact" });
    }
  } else if (body.audience === "STAFF") {
    const [teachers, staff] = await Promise.all([
      prisma.teacher.findMany({ where: { status: "ACTIVE" }, select: { fullName: true, phone: true, email: true } }),
      prisma.staff.findMany({ where: { status: "ACTIVE" }, select: { fullName: true, phone: true, email: true } }),
    ]);
    const seen = new Set<string>();
    for (const t of [...teachers, ...staff]) {
      const key = (t.email ?? t.phone ?? "").toLowerCase();
      if (key && seen.has(key)) continue;
      if (key) seen.add(key);
      recipients.push({ name: t.fullName, phone: t.phone ? normalizePhone(t.phone) : null, email: t.email });
    }
  } else {
    const students = await prisma.student.findMany({
      where: {
        status: "ACTIVE",
        ...(body.audience === "CLASS" && body.classId ? { classId: body.classId } : {}),
      },
      include: { parents: { include: { parent: true }, where: { isPrimary: true } } },
    });

    const seen = new Set<string>();
    if (body.audience === "PARENTS") {
      for (const s of students) {
        for (const sp of s.parents) {
          const key = (sp.parent.email ?? sp.parent.phone ?? "").toLowerCase();
          if (key && seen.has(key)) continue;
          if (key) seen.add(key);
          recipients.push({ name: sp.parent.fullName, phone: sp.parent.phone ? normalizePhone(sp.parent.phone) : null, email: sp.parent.email });
        }
      }
    } else {
      for (const s of students) {
        const primary = s.parents[0];
        const phone = s.phone ?? primary?.parent.phone ?? null;
        const email = s.email ?? primary?.parent.email ?? null;
        const key = `${phone ?? ""}${email?.toLowerCase() ?? ""}`;
        if (key && seen.has(key)) continue; // siblings share a contact — send once
        if (key) seen.add(key);
        recipients.push({ name: s.fullName, phone: phone ? normalizePhone(phone) : null, email });
      }
    }
  }

  if (!recipients.length) throw new ApiError("No valid contacts found for this audience");

  const message = body.message.trim();
  const result = await sendBroadcast(recipients, message, channels);
  if (result.total === 0) throw new ApiError("No deliverable contacts for the selected channels");

  const log = await prisma.messageLog.create({
    data: {
      audience: body.audience,
      classId: body.classId || null,
      recipientCount: result.total,
      message,
      provider: channels.join(" + "),
      sentBy: user.id,
    },
  });

  await auditLog(user.id, "SMS", "messaging", log.id, { audience: body.audience, channels, total: result.total });
  return NextResponse.json({ ok: true, data: { ...result, log } }, { status: 201 });
});

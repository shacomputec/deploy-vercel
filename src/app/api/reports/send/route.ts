import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson, rateLimit } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { sendBroadcast, type Channel, type BroadcastRecipient } from "@/lib/notify";
import { getSchool } from "@/lib/school";

const VALID_CHANNELS: Channel[] = ["EMAIL", "WHATSAPP"];

/**
 * Distribute report cards to parents/students.
 * Body: { reportIds?, classId?, termId?, channels, subject?, note? }
 *   - reportIds: specific report cards to send.
 *   - classId + termId: every published report card for that class/term.
 *   - channels: subset of ["EMAIL","WHATSAPP"] (must be non-empty).
 * The message includes the student's summary and the secure result-checker
 * portal link (OTP-gated) — no scores are ever placed in plain text.
 */
export const POST = handle(async (req) => {
  const user = await requirePerm("reports", "publish");
  rateLimit(`report-send:${user.id}`, 20, 60_000);

  const body = await readJson<{
    reportIds?: string[];
    classId?: string;
    termId?: string;
    channels?: Channel[];
    note?: string;
  }>(req);

  const channels: Channel[] = (body.channels ?? []).filter((c): c is Channel => VALID_CHANNELS.includes(c as Channel));
  if (!channels.length) throw new ApiError("Choose at least one channel (EMAIL or WHATSAPP)");
  if (!body.reportIds?.length && (!body.classId || !body.termId)) {
    throw new ApiError("Provide reportIds or a classId + termId");
  }

  const reports = body.reportIds?.length
    ? await prisma.reportCard.findMany({ where: { id: { in: body.reportIds }, published: true }, include: { student: { include: { parents: { include: { parent: true }, where: { isPrimary: true } } } }, term: true, class: true } })
    : await prisma.reportCard.findMany({ where: { classId: body.classId, termId: body.termId, published: true }, include: { student: { include: { parents: { include: { parent: true }, where: { isPrimary: true } } } }, term: true, class: true } });

  if (!reports.length) throw new ApiError("No published report cards found for the selection");

  const school = await getSchool();
  const origin = new URL(req.url).origin;
  const portalUrl = `${origin}/result-checker`;
  const schoolName = school?.name || "the school";

  // Deduplicate by contact: a parent with two children in the same class/term
  // receives ONE message instead of two identical ones.
  const recipients: BroadcastRecipient[] = [];
  const seen = new Set<string>();
  for (const r of reports) {
    const parent = r.student.parents[0]?.parent;
    const email = parent?.email || r.student.email;
    const whatsapp = parent?.phone || r.student.phone; // WhatsApp falls back to the student's phone
    const key = `${email?.toLowerCase() ?? ""}|${whatsapp ?? ""}`;
    if (key !== "|" && seen.has(key)) continue;
    if (key !== "|") seen.add(key);
    recipients.push({
      name: parent?.fullName || r.student.fullName,
      email,
      whatsapp,
    });
  }

  const termName = reports[0]?.term?.name || "this term";
  const className = reports[0]?.class?.name;
  const note = body.note?.trim();
  const message = [
    `Dear Parent, ${schoolName} has published the ${termName} report card for ${className ?? "your ward"}.`,
    `Check it securely on the result-checker portal: ${portalUrl}`,
    `You will need the student's admission number and registered phone number.`,
    note ? `Message from school: ${note}` : "",
  ].filter(Boolean).join(" ");

  const result = await sendBroadcast(recipients, message, channels, {
    subject: `${schoolName} — ${termName} Report Card Published`,
  });
  if (result.total === 0) throw new ApiError("No email/WhatsApp contacts found for these students");

  const log = await prisma.messageLog.create({
    data: {
      audience: "REPORTS",
      classId: body.classId || null,
      recipientCount: result.total,
      message: message.slice(0, 400),
      provider: channels.join(" + "),
      sentBy: user.id,
    },
  });

  await auditLog(user.id, "SEND", "reports", log.id, { reports: reports.length, channels, total: result.total });
  return NextResponse.json({ ok: true, data: { ...result, reports: reports.length, log } }, { status: 201 });
});

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson, rateLimit } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { getSchool } from "@/lib/school";
import { sendBroadcast, type Channel, type BroadcastRecipient } from "@/lib/notify";

const normalizePhone = (p: string) => p.trim().replace(/[\s-]/g, "");

/**
 * Send fee-arrears reminders to the parents of students with an outstanding
 * balance in a class. Body: { classId, channels? } — channels default to SMS +
 * WhatsApp + email. One personalised reminder per unique parent contact (each
 * names the ward and the exact amount owing). Uses the SCHOOL's own messaging
 * keys (never the developer's).
 */
export const POST = handle(async (req) => {
  const user = await requirePerm("fees", "read");
  await requirePerm("messaging", "create"); // sending parent messages is a messaging action
  rateLimit(`fees-remind:${user.id}`, 10, 60_000);

  const body = await readJson<{ classId?: string; channels?: Channel[] }>(req);
  if (!body.classId) throw new ApiError("classId is required");

  const [klass, feeItems, school] = await Promise.all([
    prisma.class.findUnique({ where: { id: body.classId }, include: { level: true } }),
    prisma.feeItem.findMany({ where: { mandatory: true } }),
    getSchool(),
  ]);
  if (!klass) throw new ApiError("Class not found", 404);

  const students = await prisma.student.findMany({
    where: { classId: body.classId, status: "ACTIVE" },
    include: { payments: true, parents: { include: { parent: true } } },
  });

  const levelId = klass.levelId ?? null;
  const expectedByStudent = new Map(
    students.map((s) => [
      s.id,
      feeItems.filter((f) => f.levelId === null || f.levelId === levelId).reduce((a, f) => a + f.amount, 0),
    ])
  );

  const channels: Channel[] = (body.channels ?? ["SMS", "WHATSAPP", "EMAIL"]).filter(
    (c): c is Channel => ["SMS", "EMAIL", "WHATSAPP"].includes(c as Channel)
  );
  if (!channels.length) throw new ApiError("At least one channel is required");

  const ghs = (n: number) => `GHS ${n.toLocaleString("en-GH", { minimumFractionDigits: 2 })}`;
  const contacts: { recipient: BroadcastRecipient; message: string }[] = [];
  const unreachable: { student: string; balance: number }[] = [];
  const seen = new Set<string>();

  for (const s of students) {
    const expected = expectedByStudent.get(s.id) ?? 0;
    const paid = s.payments.reduce((a, p) => a + p.amount, 0);
    const balance = Math.max(0, expected - paid);
    if (balance <= 0) continue;

    const primary = s.parents.find((sp) => sp.isPrimary) ?? s.parents[0];
    const phone = normalizePhone(primary?.parent.phone ?? s.phone ?? "") || null;
    const email = primary?.parent.email ?? s.email ?? null;
    const key = `${phone ?? ""}|${email?.toLowerCase() ?? ""}`;
    if (key === "|") {
      unreachable.push({ student: s.fullName, balance });
      continue;
    }
    if (seen.has(key)) continue; // siblings share a contact — one reminder
    seen.add(key);

    contacts.push({
      recipient: { name: primary?.parent.fullName ?? s.fullName, phone, email },
      message:
        `Dear parent/guardian of ${s.fullName}, this is a friendly reminder from ${school?.name ?? "the school"} ` +
        `that ${ghs(balance)} is still outstanding for school fees. Kindly settle at the office or pay online ` +
        `to avoid interruption of classes. Thank you.`,
    });
  }

  if (!contacts.length) {
    const code = unreachable.length ? 422 : 404;
    throw new ApiError(
      unreachable.length
        ? "No parents with contact details were found for the students in arrears — add parent phone/email in Students → Parents first."
        : "No students in this class have an outstanding balance.",
      code
    );
  }

  // One personalised broadcast per unique contact (the school's own keys).
  const sent = { SMS: 0, EMAIL: 0, WHATSAPP: 0 } as Record<Channel, number>;
  let total = 0;
  let failed = 0;
  for (const { recipient, message } of contacts) {
    const r = await sendBroadcast([recipient], message, channels, { subject: "School fees reminder" });
    total += r.total;
    failed += r.failed;
    for (const c of channels) sent[c] += r.sent[c];
  }

  const log = await prisma.messageLog.create({
    data: {
      audience: "CLASS",
      classId: body.classId,
      recipientCount: total,
      message: "School fees arrears reminder",
      provider: channels.join(" + "),
      sentBy: user.id,
    },
  });

  await auditLog(user.id, "SMS", "fees", log.id, {
    action: "arrears_reminder",
    classId: body.classId,
    reminded: contacts.length,
    unreachable: unreachable.length,
    channels,
  });

  return NextResponse.json(
    { ok: true, data: { sent, total, failed, reminded: contacts.length, unreachable, log } },
    { status: 201 }
  );
});

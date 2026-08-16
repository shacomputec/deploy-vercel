import { handle, ok, readJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import { notify } from "@/lib/notify";

const requireDeveloper = async () => {
  const user = await getCurrentUser();
  if (!user) throw { status: 401, message: "Authentication required" };
  if (user.role.name !== "developer") throw { status: 403, message: "Developer only" };
  return user;
};

/**
 * POST /api/dev/followup — send a follow-up about an abandoned purchase to the
 * buyer's own contact, using the DEVELOPER's messaging keys (dev.messaging.*).
 * Body: { id, channels: ("SMS" | "WHATSAPP" | "EMAIL")[] }
 * The message is composed here (school name, reference, amount, developer
 * contact) so the developer never hand-types it.
 */
export const POST = handle(async (req) => {
  const user = await requireDeveloper();
  const body = await readJson<{ id: string; channels?: string[] }>(req);
  const tx = await prisma.paymentGatewayTx.findUnique({ where: { id: body.id } });
  if (!tx || tx.purpose !== "LICENSE_PURCHASE") throw { status: 404, message: "Purchase not found" };

  const channels = Array.isArray(body.channels) && body.channels.length ? body.channels : ["WHATSAPP"];
  const buyer = tx.buyerName ?? `School ${tx.schoolId}`;
  const message = [
    `Hello ${buyer},`,
    ``,
    `You started purchasing GES School MIS (reference ${tx.reference}, GHS ${tx.amount.toLocaleString()}) but the payment was not completed.`,
    `Would you like to finish your purchase now? Reply to this message or call shacomputec on +233 530 941 750.`,
    ``,
    `— GES School MIS`,
  ].join("\n");

  const results: Record<string, string> = {};
  if (channels.includes("EMAIL") && tx.deliveryEmail) {
    await notify({ email: tx.deliveryEmail }, message, { subject: `Finish your ${buyer} purchase — GES School MIS`, useDevKeys: true });
    results.EMAIL = "queued";
  }
  if (channels.includes("WHATSAPP") && tx.deliveryPhone) {
    await notify({ whatsapp: tx.deliveryPhone }, message, { useDevKeys: true });
    results.WHATSAPP = "queued";
  }
  if (channels.includes("SMS") && tx.deliveryPhone) {
    await notify({ phone: tx.deliveryPhone }, message, { useDevKeys: true });
    results.SMS = "queued";
  }

  await auditLog(user.id, "FOLLOWUP_SEND", "vendor", tx.id, {
    reference: tx.reference,
    schoolId: tx.schoolId,
    channels: Object.keys(results),
  });
  return ok({ reference: tx.reference, channels: results });
});

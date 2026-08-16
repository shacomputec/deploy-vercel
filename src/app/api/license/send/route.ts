import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok, readJson, rateLimit } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { validateLicenseKey, decryptLicenseKey, encryptLicenseKey, hashValue } from "@/lib/license";
import { notify, type Channel } from "@/lib/notify";
import { getSchool } from "@/lib/school";

const VALID_CHANNELS: Channel[] = ["EMAIL", "WHATSAPP", "SMS"];

/**
 * POST /api/license/send — deliver a license key to a school.
 *
 * Body:
 *   { issuanceId, email?, phone?, channels? }   → re-send from history (key decrypted server-side)
 *   { key, email?, phone?, channels? }          → a freshly issued / offline-minted key (matched or recorded by nonce)
 *
 * channels: subset of ["EMAIL","WHATSAPP","SMS"], default ["EMAIL"].
 * Email carries the full activation instructions; WhatsApp/SMS get a compact
 * message. Delivery goes through the notify() hub (Resend / Twilio / SMS
 * providers in production, console logs in development).
 */
export const POST = handle(async (req) => {
  const user = await requirePerm("licensing", "update");
  if (user.role.name !== "developer") {
    throw new ApiError("Only the system developer can send license keys.", 403);
  }
  rateLimit(`license:send:${user.id}`, 10, 60_000);

  const body = await readJson<{ issuanceId?: string; key?: string; email?: string; phone?: string; channels?: Channel[] }>(req);
  const email = (body.email ?? "").trim().toLowerCase();
  const phone = (body.phone ?? "").trim();
  const channels: Channel[] = [...new Set<Channel>((body.channels ?? ["EMAIL"]) as Channel[])].filter((c) => VALID_CHANNELS.includes(c));
  if (!channels.length) throw new ApiError("At least one delivery channel is required.", 422);
  if (channels.includes("EMAIL") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError("A valid school email address is required for the Email channel.", 422);
  }
  if ((channels.includes("WHATSAPP") || channels.includes("SMS")) && !phone) {
    throw new ApiError("A phone number is required for the WhatsApp / SMS channels.", 422);
  }

  let issuanceId = body.issuanceId ?? null;
  const key = body.key?.trim().toUpperCase() ?? "";

  if (issuanceId) {
    const stored = await prisma.licenseIssuance.findUnique({ where: { id: issuanceId } });
    if (!stored) throw new ApiError("Issuance not found.", 404);
    if (stored.revokedAt) throw new ApiError("This key has been revoked and cannot be sent.", 409);
    issuanceId = stored.id;
  } else if (key) {
    const parts = key.split("-");
    const nonce = parts.length >= 6 ? parts[parts.length - 2] : "";
    if (nonce) {
      const match = await prisma.licenseIssuance.findUnique({ where: { nonce } });
      if (match) {
        if (match.revokedAt) throw new ApiError("This key has been revoked and cannot be sent.", 409);
        issuanceId = match.id;
      } else {
        const check = validateLicenseKey(key);
        if (!check.valid || !check.days) throw new ApiError("The key could not be verified.", 422);
        const created = await prisma.licenseIssuance.create({
          data: {
            schoolId: check.schoolId ?? "MAIN",
            days: check.days,
            nonce,
            keyHash: hashValue(key),
            keyEncrypted: encryptLicenseKey(key),
            issuedById: user.id,
          },
        });
        issuanceId = created.id;
      }
    } else {
      // v1 / trial keys have no nonce — verify only, deliver without recording
      if (!validateLicenseKey(key).valid) throw new ApiError("The key could not be verified.", 422);
    }
  } else {
    throw new ApiError("Provide either issuanceId or the license key.", 422);
  }

  const school = await getSchool();
  const schoolName = school?.name ?? "your school";

  // Auto-register this school in the developer's directory (Developer Console →
  // Schools) so every key issued/sent appears in the district-style list the
  // developer locks from. The school code comes from the key itself.
  if (issuanceId) {
    const stored = await prisma.licenseIssuance.findUnique({ where: { id: issuanceId }, select: { schoolId: true } });
    if (stored?.schoolId) {
      const code = (stored.schoolId || "main").toUpperCase().replace(/[^A-Z0-9]/g, "") || "MAIN";
      await prisma.vendorSchool.upsert({
        where: { licenseCode: code },
        create: {
          licenseCode: code,
          name: school?.name ?? `School ${code}`,
          district: school?.district ?? null,
          contactEmail: email || school?.email || null,
          contactPhone: phone || school?.phone || null,
        },
        update: {
          name: school?.name ?? `School ${code}`,
          contactEmail: email || undefined,
          contactPhone: phone || undefined,
        },
      });
    }
  }
  const support = `${school?.developerName ?? "Your system developer"}${school?.developerPhone ? ` · ${school.developerPhone}` : ""}${school?.developerEmail ? ` · ${school.developerEmail}` : ""}`;

  const emailMessage = [
    `Dear ${schoolName} Administrator,`,
    ``,
    `Your GES School MIS activation license has been issued:`,
    ``,
    `   License key:  ${key}`,
    ``,
    `To activate:`,
    `   1. Log in to your admin panel.`,
    `   2. Click “Activate now” on the license banner (or wait for the activation prompt that appears when the trial ends).`,
    `   3. Paste the key into the “Already have a license key?” box and click Activate.`,
    ``,
    `The key is machine-verifiable and cannot be forged. Keep it private.`,
    ``,
    `For support: ${support}`,
    ``,
    `— GES School MIS`,
  ].join("\n");

  // Compact for WhatsApp / SMS (SMS providers have tight length limits)
  const shortMessage = `Your ${schoolName} GES School MIS license key: ${key}. Paste it into the license activation prompt (banner/modal) to activate. Support: ${support}`;

  // Each message type goes to its own recipients so no channel is double-delivered:
  // Email gets the full instructions; WhatsApp/SMS get the compact key message.
  if (channels.includes("EMAIL")) {
    await notify({ email }, emailMessage, { subject: `Your ${schoolName} license key is ready` });
  }
  if (channels.includes("WHATSAPP") || channels.includes("SMS")) {
    await notify(
      { phone: channels.includes("SMS") ? phone : null, whatsapp: channels.includes("WHATSAPP") ? phone : null },
      shortMessage
    );
  }

  if (issuanceId) {
    await prisma.licenseIssuance.update({
      where: { id: issuanceId },
      data: { sentTo: email || phone, sentAt: new Date() },
    });
    await auditLog(user.id, "SEND_KEY", "license", issuanceId, { to: email || phone, channels });
    return ok({ sent: true, to: email || phone, channels, issuanceId });
  }
  await auditLog(user.id, "SEND_KEY", "license", `license:${hashValue(key)}`, { to: email || phone, channels, legacyV1: true });
  return ok({ sent: true, to: email || phone, channels, issuanceId: null });
});

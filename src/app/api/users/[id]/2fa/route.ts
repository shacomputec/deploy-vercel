import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { handle, ApiError } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { generateTotpSecret, otpauthUri, verifyTotp } from "@/lib/totp";

/**
 * Only the Developer may manage the Developer account; everyone else can only
 * manage accounts strictly BELOW their own role level (matches the create/
 * update/delete guards — prevents e.g. an admin disabling another admin's 2FA).
 */
async function guardTargetLevel(actor: { id: string; role: { name: string; level: number } }, target: { role: { name: string; level: number } }) {
  if (target.role.name === "developer" && actor.role.name !== "developer") {
    throw new ApiError("Only the Developer can manage the Developer account.", 403);
  }
  if (actor.role.name !== "developer" && target.role.level >= actor.role.level) {
    throw new ApiError("You cannot manage an account at or above your own role level.", 403);
  }
}

export const GET = handle(async (req, { params }) => {
  const user = await requirePerm("users", "update");
  const target = await prisma.user.findUnique({
    where: { id: params.id },
    include: { role: true },
  });
  if (!target) throw new ApiError("User not found", 404);
  await guardTargetLevel(user, target);
  if (target.twoFactorSecret) {
    return NextResponse.json({ ok: true, data: { enabled: true } });
  }
  // Generate a fresh secret (not persisted until confirmed with a valid code)
  const secret = generateTotpSecret();
  const uri = otpauthUri(secret, target.email);
  const qrDataUrl = await QRCode.toDataURL(uri, { width: 220, margin: 1 });
  return NextResponse.json({ ok: true, data: { enabled: false, secret, uri, qrDataUrl, account: target.email } });
});

export const POST = handle(async (req, { params }) => {
  const actor = await requirePerm("users", "update");
  const target = await prisma.user.findUnique({
    where: { id: params.id },
    include: { role: true },
  });
  if (!target) throw new ApiError("User not found", 404);
  await guardTargetLevel(actor, target);

  const body = (await req.json()) as { action?: string; secret?: string; code?: string };
  if (body.action === "disable") {
    await prisma.user.update({ where: { id: params.id }, data: { twoFactorSecret: null } });
    await auditLog(actor.id, "UPDATE", "users.2fa", params.id, { action: "disable" });
    return NextResponse.json({ ok: true, data: { enabled: false } });
  }

  if (!body.secret || !body.code) throw new ApiError("Secret and confirmation code are required.");
  if (!verifyTotp(body.secret, body.code)) {
    throw new ApiError("Incorrect authentication code. The secret has not been saved.", 401);
  }
  await prisma.user.update({ where: { id: params.id }, data: { twoFactorSecret: body.secret } });
  await auditLog(actor.id, "UPDATE", "users.2fa", params.id, { action: "enable" });
  return NextResponse.json({ ok: true, data: { enabled: true } });
});

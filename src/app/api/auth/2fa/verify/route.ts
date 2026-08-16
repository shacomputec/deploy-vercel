import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, rateLimit, clientIp } from "@/lib/api";
import { verifyTwoFactorToken, signSession, setSessionCookie } from "@/lib/auth";
import { verifyTotp } from "@/lib/totp";
import { auditLog } from "@/lib/audit";

export const POST = handle(async (req) => {
  rateLimit(`2fa:${clientIp(req)}`, 15, 60_000);
  const body = (await req.json()) as { tempToken?: string; code?: string };
  if (!body.tempToken || !body.code) throw new ApiError("Missing code.");

  const sub = await verifyTwoFactorToken(body.tempToken);
  if (!sub) throw new ApiError("This verification session has expired. Please sign in again.", 401);

  const user = await prisma.user.findUnique({ where: { id: sub }, include: { role: true } });
  if (!user || user.status !== "ACTIVE") throw new ApiError("Account unavailable.", 403);
  if (!user.twoFactorSecret) throw new ApiError("Two-factor authentication is not enabled.", 400);

  if (!verifyTotp(user.twoFactorSecret, body.code)) {
    throw new ApiError("Incorrect authentication code.", 401);
  }

  const token = await signSession({
    sub: user.id,
    email: user.email,
    name: user.fullName,
    role: user.role.name,
    roleLevel: user.role.level,
  });
  await setSessionCookie(token);
  await auditLog(user.id, "LOGIN_2FA", "auth", user.id, { email: user.email });
  const isNative = req.headers.get("x-native-client") === "1";
  return NextResponse.json({
    ok: true,
    data: {
      ...(isNative ? { token } : {}),
      role: user.role.name,
      roleLevel: user.role.level,
    },
  });
});

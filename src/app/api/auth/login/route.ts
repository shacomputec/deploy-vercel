import { NextResponse } from "next/server";
import { handle, ApiError } from "@/lib/api";
import { loginSchema } from "@/lib/validators";
import { loginUser, setSessionCookie } from "@/lib/auth";
import { auditLog } from "@/lib/audit";

export const POST = handle(async (req) => {
  const body = await req.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]!.message, 422);

  const result = await loginUser(parsed.data.email, parsed.data.password);
  if (!result.ok) throw new ApiError(result.error, 401);

  if (result.tempToken) {
    // Two-factor step: return a short-lived temp token; the code is verified next.
    return NextResponse.json({
      ok: true,
      data: { requiresTwoFactor: true, tempToken: result.tempToken, email: result.user.email },
    });
  }

  await setSessionCookie(result.token!);
  await auditLog(result.user.id, "LOGIN", "auth", result.user.id, { email: result.user.email });
  // The JWT is only returned to native/mobile clients (which cannot read the
  // httpOnly cookie). Browser clients stay cookie-only.
  const isNative = req.headers.get("x-native-client") === "1";
  return NextResponse.json({
    ok: true,
    data: {
      ...(isNative ? { token: result.token } : {}),
      email: result.user.email,
      name: result.user.fullName,
      role: result.user.role.name,
      roleLevel: result.user.role.level,
    },
  });
});

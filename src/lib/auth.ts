import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requestStore } from "@/lib/api";

const SESSION_COOKIE = "smis_session";
const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret-change-me");

export type SessionUser = {
  sub: string;
  email: string;
  name: string;
  role: string;
  roleLevel: number;
};

export async function signSession(payload: {
  sub: string;
  email: string;
  name: string;
  role: string;
  roleLevel: number;
}): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL}s`)
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  // Native/mobile clients authenticate with `Authorization: Bearer <jwt>`
  // (relayed per-request via the api request store); web uses the cookie.
  const storeToken = requestStore.getStore()?.token;
  const token = storeToken ?? cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

/** Fetch the full user record (with role) for the current session, if any. */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    include: { role: true },
  });
  if (!user || user.status !== "ACTIVE") return null;
  return user;
}

/** Server-side guard for pages — redirects to /login when unauthenticated. */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Server-side guard for pages — redirects when the role level is too low. */
export async function requireRoleLevel(minLevel: number) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role.level < minLevel) redirect("/login?denied=1");
  return user;
}

export async function setSessionCookie(token: string) {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

export function clearSessionCookie() {
  cookies().set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

const TWO_FA_TTL = 60 * 5; // temp tokens valid 5 minutes

export type LoginResult =
  | {
      ok: true;
      token?: string;
      tempToken?: string;
      user: { id: string; email: string; fullName: string; role: { name: string; level: number; displayName: string }; twoFactor: boolean };
    }
  | { ok: false; error: string };

export async function loginUser(identifier: string, password: string): Promise<LoginResult> {
  const id = identifier.trim();
  // Sign in with the friendly username (e.g. "shacomputec”) OR the email.
  // SQLite has no case-insensitive string matching — compare in JS.
  let user: Awaited<ReturnType<typeof prisma.user.findFirst>> & { role: { name: string; level: number; displayName: string } } | null = null;
  if (id.includes("@")) {
    user = await prisma.user.findUnique({ where: { email: id.toLowerCase() }, include: { role: true } });
  } else {
    const candidates = await prisma.user.findMany({
      where: { username: { not: null } },
      select: { id: true, email: true, username: true, passwordHash: true, fullName: true, status: true, twoFactorSecret: true, role: { select: { name: true, level: true, displayName: true } } },
    });
    const match = candidates.find((c) => c.username?.toLowerCase() === id.toLowerCase());
    user = match
      ? await prisma.user.findUnique({ where: { id: match.id }, include: { role: true } })
      : null;
  }
  if (!user) return { ok: false, error: "Invalid username or password" };
  if (user.status !== "ACTIVE") {
    return { ok: false, error: "This account is not active. Contact your administrator." };
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return { ok: false, error: "Invalid username or password" };

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const base = { id: user.id, email: user.email, fullName: user.fullName, role: user.role };
  if (user.twoFactorSecret) {
    // Password verified — now require the TOTP code before issuing a session.
    return { ok: true, user: { ...base, twoFactor: true }, tempToken: await signTwoFactorToken(user.id) };
  }
  return {
    ok: true,
    user: { ...base, twoFactor: false },
    token: await signSession({
      sub: user.id,
      email: user.email,
      name: user.fullName,
      role: user.role.name,
      roleLevel: user.role.level,
    }),
  };
}

export async function signTwoFactorToken(sub: string): Promise<string> {
  return new SignJWT({ type: "twofa" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime(`${TWO_FA_TTL}s`)
    .sign(secret());
}

export async function verifyTwoFactorToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.type !== "twofa" || !payload.sub) return null;
    return payload.sub;
  } catch {
    return null;
  }
}

/** HMAC signature used to make QR-coded report links unforgeable. */
export function signValue(value: string) {
  const crypto = require("crypto") as typeof import("crypto");
  return crypto.createHmac("sha256", process.env.JWT_SECRET || "dev-secret-change-me").update(value).digest("base64url");
}

export function verifySignature(value: string, sig: string) {
  const expected = signValue(value);
  return expected.length === sig.length && expected === sig;
}

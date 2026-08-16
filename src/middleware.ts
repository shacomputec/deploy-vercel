import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret-change-me");
const SESSION_COOKIE = "smis_session";

// API routes that are intentionally public
const PUBLIC_API = new Set([
  "/api/auth/login",
  "/api/auth/staff-login", // staff-ID sign-in (POST public)
  "/api/auth/2fa/verify",
  "/api/auth/setup",
  "/api/results/request-otp",
  "/api/results/verify",
  "/api/ai/chat",
  "/api/admissions", // POST public (GET requires auth — method checked below)
  "/api/contact", // POST public (GET requires auth)
  // Public payment & checkout endpoints (own rate limiting + webhook HMAC)
  "/api/staff/public", // public staff directory
  "/api/students/lookup",
  "/api/payments/initiate",
  "/api/payments/status",
  "/api/license/purchase", // public 'Buy this system' checkout (own rate limiting)
  "/api/payments/webhook/paystack",
  "/api/payments/webhook/momo",
  "/api/desktop/update", // desktop auto-update manifest
  "/api/mobile/update", // Android app update checker (public, like desktop)
]);

function isPublicApi(pathname: string, method: string) {
  if (PUBLIC_API.has(pathname)) {
    // /api/admissions & /api/contact: only POST is public
    if (pathname === "/api/admissions" || pathname === "/api/contact") {
      return method === "POST";
    }
    return true;
  }
  return false;
}

// Session token from `Authorization: Bearer <jwt>` (mobile/desktop clients)
// or the httpOnly session cookie (web).
function sessionToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return req.cookies.get(SESSION_COOKIE)?.value ?? null;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public pages & public APIs pass through
  if (!pathname.startsWith("/admin") && !pathname.startsWith("/portal") && !pathname.startsWith("/api")) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/api") && isPublicApi(pathname, req.method)) {
    return NextResponse.next();
  }
  if (pathname === "/api/auth/logout" || pathname === "/api/auth/me" || pathname === "/api/portal/overview") {
    // require valid token
    const token = sessionToken(req);
    if (!token) {
      return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
    }
    try {
      await jwtVerify(token, secret);
      return NextResponse.next();
    } catch {
      return NextResponse.json({ ok: false, error: "Session expired" }, { status: 401 });
    }
  }

  const token = sessionToken(req);
  if (!token) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
    }
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  try {
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ ok: false, error: "Session expired" }, { status: 401 });
    }
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/admin/:path*", "/dev/:path*", "/portal/:path*", "/api/:path*", "/reports/print/:path*", "/admissions/print/:path*"],
};

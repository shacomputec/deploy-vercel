import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";

const SESSION_COOKIE = "smis_session";
const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days — matches signSession

/**
 * Mobile/desktop bridge: the native app logs in with a Bearer token (it
 * cannot read the httpOnly cookie). To open the full responsive web system
 * in its WebView or default browser — exactly like the desktop app — the app
 * loads /api/auth/bridge?token=…&next=…, which verifies the token and sets
 * the same session cookie, then redirects into the management console.
 *
 * All subsequent requests carry the cookie, so every module (dashboard,
 * students, report cards, fees, settings) works exactly as on the desktop.
 *
 * IMPORTANT: We return a 200 HTML page instead of using NextResponse.redirect
 * because browsers do not reliably process Set-Cookie headers on redirect
 * responses (the cookie must be stored BEFORE the browser navigates). The
 * HTML page includes both a JS redirect and a <meta http-equiv="refresh">
 * fallback so the cookie is guaranteed to be set before navigation.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const next = url.searchParams.get("next") || "/admin";
  if (!token) return NextResponse.redirect(new URL("/login", url.origin));

  const session = await verifySession(token);
  if (!session) return NextResponse.redirect(new URL("/login", url.origin));

  // Build the absolute target URL
  const targetUrl = new URL(next, url.origin).toString();
  // Escape for safe embedding in HTML/JS
  const safeTarget = targetUrl
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Return an HTML page that:
  // 1. Carries the Set-Cookie header (browser processes it on the 200 response)
  // 2. Immediately navigates to the target via meta refresh + JS fallback
  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="0;url=${safeTarget}">
<title>Redirecting…</title>
<script>location.replace("${safeTarget}");</script>
</head><body>
<p>Redirecting to <a href="${safeTarget}">${safeTarget}</a>…</p>
</body></html>`;

  const res = new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });

  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // Secure only over real https — over http (the desktop app's localhost
    // server) the cookie must be stored too, or the redirected page 401s.
    secure: req.url.startsWith("https://"),
    path: "/",
    maxAge: SESSION_TTL,
  });

  return res;
}

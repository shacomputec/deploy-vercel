import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Per-request storage for the session token. Native/mobile clients cannot read
 * the httpOnly cookie (React Native's fetch has no cookie jar), so they send
 * `Authorization: Bearer <jwt>`. The handle() wrapper records it here so
 * getSession()/getCurrentUser() pick it up — no per-route changes needed.
 *
 * NOTE: AsyncLocalStorage is Node-runtime only. Keep every API route on the
 * default Node runtime — do NOT add `export const runtime = "edge"`.
 */
export const requestStore = new AsyncLocalStorage<{ token: string | null }>();

function bearerToken(req: Request): string | null {
  const auth = req.headers.get("authorization");
  return auth?.startsWith("Bearer ") ? auth.slice(7) : null;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

type Handler = (req: Request, ctx: { params: Record<string, string> }) => Promise<Response>;

/**
 * Wraps a route handler with unified error handling:
 *  - ApiError / { status, message } thrown by guards → clean JSON error
 *  - ZodError → 422 with field issues
 *  - anything else → 500 (details logged server-side only)
 */
// ── enforcement gate (web + desktop + mobile at once) ────────────────────────
// Locking is enforced HERE, in the shared API wrapper, because the desktop and
// mobile apps call the same /api/* endpoints (with the session cookie or a
// Bearer token). When the developer locks a school, every authenticated request
// from every client is stopped with the same 403 + lock message — one switch,
// all three platforms, at the same time. Public routes (no session) and the
// routes the lock/payment screens themselves need are exempt.
const GATE_EXEMPT_PREFIXES = [
  "/api/auth/", // login / me / logout — the lock screen itself needs these
  "/api/system/gate", // gate status
  "/api/license", // license status + pay (buyer pays while locked)
  "/api/payments/status", // checkout polls this
  "/api/payments/webhook/", // gateway callbacks (no session)
  "/api/terms/accept", // terms acceptance screen
  "/api/desktop/update", // desktop auto-update check (no session)
];

async function apiGateBlock(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  if (!url.pathname.startsWith("/api/")) return null;
  if (GATE_EXEMPT_PREFIXES.some((p) => url.pathname.startsWith(p))) return null;
  // No session token at all → public route (result-checker OTP, admissions,
  // content) — the lock only blocks authenticated school staff.
  if (!req.headers.get("authorization") && !req.headers.get("cookie")) return null;

  // Dynamic imports keep this module free of import cycles (auth ↔ api).
  const [{ getCurrentUser }, { getApiGateBlock }] = await Promise.all([
    import("@/lib/auth"),
    import("@/lib/system-gate"),
  ]);
  const user = await getCurrentUser();
  if (!user || user.role.name === "developer") return null; // developer always bypasses
  const gate = await getApiGateBlock();
  if (gate.blocked) {
    return NextResponse.json(
      { ok: false, error: gate.message, locked: true, lockMessage: gate.message },
      { status: 403 }
    );
  }
  return null;
}

/**
 * CSRF defence for cookie-authenticated state changes: reject requests whose
 * Origin header does not match the server host (same-origin policy). Requests
 * without an Origin header (curl, native apps, same-origin GETs) pass through.
 */
function checkOrigin(req: Request) {
  const method = req.method;
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("host");
  if (!host) return;
  try {
    if (new URL(origin).host !== host) {
      throw new ApiError("Cross-origin request rejected.", 403);
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError("Invalid Origin header.", 403);
  }
}

export function handle(handler: Handler): Handler {
  return (req, ctx) =>
    requestStore.run({ token: bearerToken(req) }, async () => {
      try {
        checkOrigin(req);
        const block = await apiGateBlock(req);
        if (block) return block;
        return await handler(req, ctx);
      } catch (err) {
        if (err instanceof ApiError) return fail(err.message, err.status);
        if (err && typeof err === "object" && "status" in err && "message" in err) {
          const { status, message } = err as { status: number; message: string };
          return fail(message, status);
        }
        if (err instanceof ZodError) {
          return NextResponse.json(
            { ok: false, error: "Validation failed", issues: err.issues.map((i) => i.message) },
            { status: 422 }
          );
        }
        console.error("[api]", err);
        return fail("An unexpected error occurred", 500);
      }
    });
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ApiError("Invalid JSON body");
  }
}

// ── minimal in-memory sliding-window rate limiter ───────────────────────────
const buckets = new Map<string, { count: number; resetAt: number }>();

/** Throws ApiError 429 when the key exceeds `limit` requests per `windowMs`. */
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  b.count++;
  if (b.count > limit) throw new ApiError("Too many requests. Please try again later.", 429);
}

export function clientIp(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") || "unknown";
}

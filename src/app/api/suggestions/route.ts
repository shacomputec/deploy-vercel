import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok, readJson, rateLimit } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { auditLog } from "@/lib/audit";

const CATEGORIES = ["FEATURE", "BUG", "IMPROVEMENT", "OTHER"] as const;

/**
 * The in-app suggestion box. Every signed-in user (admins, teachers, staff —
 * especially during the trial) can send feedback to the developer. The list is
 * developer-only; users never see each other's suggestions.
 */
export const POST = handle(async (req) => {
  const user = await getCurrentUser();
  if (!user) throw new ApiError("Authentication required", 401);
  rateLimit(`suggest:${user.id}`, 5, 60_000); // max 5 suggestions/min per user

  const body = await readJson<{ category?: string; message?: string; contact?: string }>(req);
  const category = String(body.category || "FEATURE").toUpperCase();
  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    throw new ApiError("Category must be FEATURE, BUG, IMPROVEMENT or OTHER", 422);
  }
  const message = String(body.message || "").trim();
  if (message.length < 5) throw new ApiError("Please write at least a few words — that helps the developer understand your idea.", 422);
  if (message.length > 2000) throw new ApiError("Keep your suggestion under 2000 characters.", 422);
  const contact = String(body.contact || "").trim().slice(0, 120) || null;

  const row = await prisma.suggestion.create({
    data: { userId: user.id, category, message, contact },
  });
  await auditLog(user.id, "CREATE", "suggestion", row.id, { category });
  return NextResponse.json({ ok: true, data: row }, { status: 201 });
});

/** Developer sees every suggestion; any other role sees only their own. */
export const GET = handle(async () => {
  const user = await getCurrentUser();
  if (!user) throw new ApiError("Authentication required", 401);
  const rows = await prisma.suggestion.findMany({
    where: user.role.name === "developer" ? {} : { userId: user.id },
    include: { user: { select: { id: true, fullName: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return ok(rows);
});

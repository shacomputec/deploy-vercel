import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok, readJson } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/auth";
import { auditLog } from "@/lib/audit";

const LEAVE_TYPES = ["ANNUAL", "SICK", "MATERNITY", "PATERNITY", "STUDY", "UNPAID", "OTHER"] as const;

/**
 * Staff leave — HR module.
 * GET:  admins/HR see every request; staff see only their own (via the
 *       staff-profile link on their login account).
 * POST: staff request leave for themselves; admins may request on behalf
 *       of any staff member.
 */
export const GET = handle(async (req) => {
  const user = await getCurrentUser();
  if (!user) throw new ApiError("Authentication required", 401);

  // HR management (see every request) needs the payroll *update* right — plain
  // readers (e.g. teachers) only ever see their own requests via self-service.
  let isManager = false;
  try {
    await requirePerm("payroll", "update");
    isManager = true;
  } catch {
    /* fall back to self-service view */
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const staffId = url.searchParams.get("staffId");

  let selfStaffId: string | undefined;
  if (!isManager) {
    const profile = await prisma.staff.findUnique({ where: { userId: user.id } });
    if (!profile) throw new ApiError("No staff profile is linked to this account", 403);
    selfStaffId = profile.id;
  }

  const rows = await prisma.staffLeave.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(selfStaffId ? { staffId: selfStaffId } : {}),
      ...(!selfStaffId && staffId ? { staffId } : {}),
    },
    include: {
      staff: { select: { id: true, fullName: true, staffId: true, department: true, designation: true } },
      decidedBy: { select: { fullName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return ok(rows);
});

export const POST = handle(async (req) => {
  const user = await getCurrentUser();
  if (!user) throw new ApiError("Authentication required", 401);

  const body = await readJson<{
    staffId?: string;
    type: string;
    from: string;
    to: string;
    days?: number;
    reason?: string;
  }>(req);

  if (!body.type || !body.from || !body.to) {
    throw new ApiError("Leave type, start date and end date are required");
  }
  if (!(LEAVE_TYPES as readonly string[]).includes(body.type)) {
    throw new ApiError(`Leave type must be one of: ${LEAVE_TYPES.join(", ")}`);
  }

  // Resolve the staff member: self-service via linked profile, or admin on
  // behalf of another member of staff.
  let staffId = body.staffId;
  if (!staffId) {
    const profile = await prisma.staff.findUnique({ where: { userId: user.id } });
    if (!profile) throw new ApiError("No staff profile is linked to this account", 403);
    staffId = profile.id;
  } else {
    try {
      await requirePerm("payroll", "update");
    } catch {
      throw new ApiError("Only administrators can request leave for other staff", 403);
    }
  }

  const from = new Date(body.from);
  const to = new Date(body.to);
  if (isNaN(from.getTime()) || isNaN(to.getTime())) throw new ApiError("Invalid dates");
  if (to.getTime() < from.getTime()) throw new ApiError("End date cannot be before start date");
  const days = body.days ?? Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1);

  const row = await prisma.staffLeave.create({
    data: {
      staffId,
      type: body.type,
      from,
      to,
      days,
      reason: body.reason?.trim() || "—",
    },
  });
  await auditLog(user.id, "CREATE", "staffLeaves", row.id, { type: body.type, days });
  return NextResponse.json({ ok: true, data: row }, { status: 201 });
});

import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok, readJson } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { notifyRoleInApp, notifyUserInApp } from "@/lib/notify";

const STATUSES = ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"];

export const PUT = handle(async (req, { params }) => {
  const user = await requirePerm("lessons", "update");
  const existing = await prisma.lessonNote.findUnique({ where: { id: params.id } });
  if (!existing) throw new ApiError("Lesson note not found", 404);
  if (existing.status === "APPROVED" || existing.status === "SUBMITTED") {
    throw new ApiError("This lesson note is already submitted/approved — request the headteacher to return it before editing.", 409);
  }
  const body = await readJson<{
    topic?: string;
    week?: number;
    objectives?: string;
    content?: string;
    duration?: string;
    resources?: string;
    activityIntro?: string;
    activityMain?: string;
    activityPlenary?: string;
    homework?: string;
  }>(req);
  const data: Record<string, unknown> = {};
  if (body.topic !== undefined) data.topic = body.topic;
  if (body.week !== undefined) data.week = Number(body.week);
  for (const k of ["objectives", "content", "duration", "resources", "activityIntro", "activityMain", "activityPlenary", "homework"] as const) {
    if (body[k] !== undefined) data[k] = (body[k] as string | null) ?? null;
  }
  // Editing after a rejection resets it to a draft so it can be resubmitted.
  if (existing.status === "REJECTED") data.status = "DRAFT";
  const row = await prisma.lessonNote.update({ where: { id: params.id }, data });
  await auditLog(user.id, "UPDATE", "lessons", row.id);
  return ok(row);
});

export const DELETE = handle(async (req, { params }) => {
  const user = await requirePerm("lessons", "delete");
  const existing = await prisma.lessonNote.findUnique({ where: { id: params.id } });
  if (!existing) throw new ApiError("Lesson note not found", 404);
  if (existing.status === "APPROVED") {
    throw new ApiError("Approved lesson notes are kept for the headteacher's records and cannot be deleted.", 409);
  }
  await prisma.lessonNote.delete({ where: { id: params.id } });
  await auditLog(user.id, "DELETE", "lessons", params.id);
  return ok({ deleted: true });
});

/** POST /api/lessons/[id] — actions: submit | review */
export const POST = handle(async (req, { params }) => {
  const user = await requirePerm("lessons", "update");
  const body = await readJson<{ action: string; verdict?: string; comment?: string; rating?: number }>(req);
  const existing = await prisma.lessonNote.findUnique({ where: { id: params.id } });
  if (!existing) throw new ApiError("Lesson note not found", 404);

  if (body.action === "submit") {
    if (existing.status === "APPROVED") throw new ApiError("This note is already approved.", 409);
    const row = await prisma.lessonNote.update({
      where: { id: params.id },
      data: { status: "SUBMITTED", submittedAt: new Date() },
    });
    await auditLog(user.id, "UPDATE", "lessons", row.id, { action: "submit" });
    // Alert the headteacher / admins so the vetting queue is never missed.
    await notifyRoleInApp(
      ["headteacher", "assistant_headteacher", "admin", "super_admin"],
      "Lesson note submitted for vetting",
      `"${existing.topic}" is awaiting your review.`,
      "info",
      "/admin/teacher-tools"
    );
    return ok(row);
  }

  if (body.action === "review") {
    const verdict = body.verdict === "APPROVED" ? "APPROVED" : "REJECTED";
    const rating = body.rating != null ? Math.min(5, Math.max(1, Math.round(Number(body.rating)))) : null;
    if (verdict === "APPROVED" && !rating) throw new ApiError("Give a rating (1–5) when approving a lesson note.");
    const row = await prisma.lessonNote.update({
      where: { id: params.id },
      data: {
        status: verdict,
        reviewedById: user.id,
        reviewedAt: new Date(),
        reviewComment: body.comment?.trim() || null,
        rating,
      },
    });
    await auditLog(user.id, "UPDATE", "lessons", row.id, { action: "review", verdict, rating });
    // Tell the teacher the outcome.
    if (existing.teacherId) {
      const teacher = await prisma.teacher.findUnique({
        where: { id: existing.teacherId },
        select: { userId: true },
      });
      if (teacher?.userId) {
        await notifyUserInApp(
          teacher.userId,
          verdict === "APPROVED" ? "Lesson note approved ✓" : "Lesson note needs revision",
          `"${existing.topic}" was ${verdict === "APPROVED" ? "approved" : "rejected"}${rating ? ` with ${rating}/5 stars` : ""}. ${body.comment ? `"${body.comment}"` : ""}`,
          verdict === "APPROVED" ? "success" : "warning",
          "/admin/teacher-tools"
        );
      }
    }
    return ok(row);
  }

  if (body.action === "return") {
    // Headteacher sends an approved note back for revision.
    const row = await prisma.lessonNote.update({
      where: { id: params.id },
      data: { status: "DRAFT", reviewComment: body.comment?.trim() || null, reviewedById: user.id, reviewedAt: new Date() },
    });
    await auditLog(user.id, "UPDATE", "lessons", row.id, { action: "return" });
    return ok(row);
  }

  throw new ApiError(`Unknown action: ${body.action}`);
});


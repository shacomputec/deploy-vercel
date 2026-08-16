import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok, readJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { auditLog } from "@/lib/audit";

const STATUSES = ["NEW", "REVIEWED", "DONE", "DECLINED"] as const;

/** PATCH — the developer updates the suggestion status. */
export const PATCH = handle(async (req, { params }) => {
  const user = await getCurrentUser();
  if (!user) throw new ApiError("Authentication required", 401);
  if (user.role.name !== "developer") throw new ApiError("Developer only", 403);

  const body = await readJson<{ status?: string }>(req);
  const status = String(body.status || "").toUpperCase();
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) {
    throw new ApiError("Status must be NEW, REVIEWED, DONE or DECLINED", 422);
  }
  const row = await prisma.suggestion.update({ where: { id: params.id }, data: { status } });
  await auditLog(user.id, "UPDATE", "suggestion", row.id, { status });
  return ok(row);
});

/** DELETE — the sender may remove their own suggestion; the developer any. */
export const DELETE = handle(async (_req, { params }) => {
  const user = await getCurrentUser();
  if (!user) throw new ApiError("Authentication required", 401);
  const row = await prisma.suggestion.findUnique({ where: { id: params.id } });
  if (!row) throw new ApiError("Suggestion not found", 404);
  if (user.role.name !== "developer" && row.userId !== user.id) {
    throw new ApiError("You can only delete your own suggestions", 403);
  }
  await prisma.suggestion.delete({ where: { id: params.id } });
  await auditLog(user.id, "DELETE", "suggestion", params.id);
  return ok({ deleted: true });
});

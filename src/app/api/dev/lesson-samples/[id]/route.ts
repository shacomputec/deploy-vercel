import { handle, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const requireDeveloper = async () => {
  const user = await getCurrentUser();
  if (!user) throw { status: 401, message: "Authentication required" };
  if (user.role.name !== "developer") throw { status: 403, message: "Developer only" };
  return user;
};

/** DELETE /api/dev/lesson-samples/[id] — remove a developer-uploaded sample. */
export const DELETE = handle(async (_req, { params }: { params: Record<string, string> }) => {
  const user = await requireDeveloper();
  const row = await prisma.lessonNote.findFirst({ where: { id: params.id, isSample: true } });
  if (!row) throw { status: 404, message: "Sample not found" };
  await prisma.lessonNote.delete({ where: { id: row.id } });
  return ok({ deleted: row.id });
});

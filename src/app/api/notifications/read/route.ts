import { handle, ok, readJson } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const POST = handle(async (req) => {
  const user = await requireAuth();
  const body = (await readJson(req)) as { id?: string };
  if (body.id) {
    await prisma.notification.updateMany({
      where: { id: body.id, userId: user.id },
      data: { readAt: new Date() },
    });
  } else {
    await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
  }
  return ok({ ok: true });
});

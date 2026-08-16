import { handle, ok } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const GET = handle(async () => {
  const user = await requireAuth();
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: [{ readAt: "asc" }, { createdAt: "desc" }],
      take: 30,
    }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);
  return ok({ items, unread });
});

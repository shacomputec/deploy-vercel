import { prisma } from "@/lib/prisma";

export async function auditLog(
  userId: string | undefined,
  action: string,
  entity: string,
  entityId?: string,
  meta?: unknown,
  ip?: string
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        meta: meta ? JSON.stringify(meta) : undefined,
        ip,
      },
    });
  } catch (err) {
    console.error("[audit] failed to write log", err);
  }
}

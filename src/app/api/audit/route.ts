import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ok } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";

export const GET = handle(async (req) => {
  const user = await requirePerm("audit", "read");
  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const scope = url.searchParams.get("scope");

  let where: { action?: string; entity?: string; OR?: object[] } = {};
  if (action) where.action = action;
  if (scope === "security") {
    // The Developer's security trail: license lifecycle (issue/activate/send/
    // revoke/rotate) and role changes. Developer-only — never visible to admins.
    if (user.role.name !== "developer") throw { status: 403, message: "Forbidden" };
    where.OR = [
      { entity: "license" },
      { entity: "roles" },
      { entity: "users", meta: { contains: "roleId" } },
    ];
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 300,
    include: { user: { select: { email: true, fullName: true } } },
  });
  return ok(logs);
});

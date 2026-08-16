import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ok } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";

export const GET = handle(async () => {
  const user = await requirePerm("roles", "read");
  let roles = await prisma.role.findMany({
    orderBy: { level: "desc" },
    include: {
      _count: { select: { users: true } },
      permissions: { include: { permission: true } },
    },
  });
  let permissions = await prisma.permission.findMany({ orderBy: [{ module: "asc" }, { action: "asc" }] });

  if (user.role.name !== "developer") {
    // The developer role and the licensing module are developer-only concerns —
    // hide both from admins so the developer's functions are never visible.
    roles = roles.filter((r) => r.name !== "developer");
    permissions = permissions.filter((p) => p.module !== "licensing");
    for (const role of roles) {
      role.permissions = role.permissions.filter((rp) => rp.permission.module !== "licensing");
    }
  }
  return ok({ roles, permissions });
});

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getRolePerms } from "@/lib/permissions";
import { handle } from "@/lib/api";

// handle() populates the per-request token store, so this endpoint works with
// both the httpOnly cookie (web) and `Authorization: Bearer <jwt>` (native).
export const GET = handle(async () => {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const perms = await getRolePerms(user.roleId);
  return NextResponse.json({
    ok: true,
    data: {
      id: user.id,
      email: user.email,
      name: user.fullName,
      role: user.role.name,
      roleDisplay: user.role.displayName,
      roleLevel: user.role.level,
      perms: Object.fromEntries(Object.entries(perms).map(([k, v]) => [k, [...v]])),
    },
  });
});

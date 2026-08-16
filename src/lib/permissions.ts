import { prisma } from "@/lib/prisma";

type PermMap = Record<string, Set<string>>;

// roleId -> { module: Set<actions> } with a short TTL so admin edits apply quickly.
const cache = new Map<string, { perms: PermMap; expiresAt: number }>();
const TTL = 30_000;

export async function getRolePerms(roleId: string): Promise<PermMap> {
  const hit = cache.get(roleId);
  if (hit && hit.expiresAt > Date.now()) return hit.perms;

  const rows = await prisma.rolePermission.findMany({
    where: { roleId },
    include: { permission: true },
  });
  const perms: PermMap = {};
  for (const r of rows) {
    (perms[r.permission.module] ??= new Set()).add(r.permission.action);
  }
  cache.set(roleId, { perms, expiresAt: Date.now() + TTL });
  return perms;
}

export function clearPermsCache() {
  cache.clear();
}

export function hasPerm(perms: PermMap, module: string, action: string): boolean {
  const actions = perms[module];
  if (!actions) return false;
  return actions.has("*") || actions.has(action);
}

/**
 * Guard for API route handlers. Returns the user or throws an ApiError-style
 * response object. Throws { status, message } — catch in the route wrapper.
 */
export async function requirePerm(module: string, action: string) {
  const { getCurrentUser } = await import("@/lib/auth");
  const user = await getCurrentUser();
  if (!user) throw { status: 401, message: "Authentication required" };
  const perms = await getRolePerms(user.roleId);
  if (!hasPerm(perms, module, action)) {
    throw { status: 403, message: `You do not have permission to ${action} ${module}` };
  }
  return user;
}

/** True if `actor` outranks or equals `target` by role level. */
export function outranks(actorLevel: number, targetLevel: number) {
  return actorLevel >= targetLevel;
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson, ok } from "@/lib/api";
import { requirePerm, clearPermsCache } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

const PROTECTED = new Set(["developer", "super_admin", "student", "parent", "guest"]);

export const PUT = handle(async (req, { params }) => {
  const actor = await requirePerm("roles", "update");
  const role = await prisma.role.findUnique({ where: { id: params.id } });
  if (!role) throw new ApiError("Role not found", 404);
  if (role.isSystem) throw new ApiError("System roles cannot be edited.", 403);
  // developer / super_admin / student / parent / guest are untouchable by
  // everyone except the developer account itself.
  if (PROTECTED.has(role.name) && actor.role.name !== "developer") {
    throw new ApiError("That role is protected and cannot be modified.", 403);
  }

  const body = (await req.json()) as { displayName?: string; level?: number; permissions?: string[] };
  if (body.permissions) {
    // permissions may arrive as IDs (cuids) or "module:action" keys — resolve
    // every entry to its module first. Licensing grants are strictly
    // developer-only and are stripped from anyone else's edits, no matter the
    // input format.
    const keys = body.permissions.filter(Boolean);
    const pairs = keys.filter((k) => k.includes(":")).map((k) => ({ module: k.split(":")[0], action: k.split(":")[1] }));
    const [byId, byKey] = await Promise.all([
      prisma.permission.findMany({ where: { id: { in: keys } }, select: { id: true, module: true } }),
      pairs.length
        ? prisma.permission.findMany({
            where: { OR: pairs.map((pair) => ({ module: pair.module, action: pair.action })) },
            select: { id: true, module: true },
          })
        : Promise.resolve([]),
    ]);
    const merged = [...byId, ...byKey].filter((x, i, arr) => arr.findIndex((y) => y.id === x.id) === i);
    const allowed = actor.role.name === "developer" ? merged : merged.filter((x) => x.module !== "licensing");
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: allowed.map((p) => ({ roleId: role.id, permissionId: p.id })),
    });
  }
  const updated = await prisma.role.update({
    where: { id: role.id },
    data: { displayName: body.displayName ?? role.displayName, level: body.level ?? role.level },
  });
  clearPermsCache();
  await auditLog(actor.id, "UPDATE", "roles", role.id, { name: role.name });
  return ok(updated);
});

export const DELETE = handle(async (req, { params }) => {
  const actor = await requirePerm("roles", "delete");
  const role = await prisma.role.findUnique({ where: { id: params.id } });
  if (!role) throw new ApiError("Role not found", 404);
  if (role.isSystem || PROTECTED.has(role.name)) throw new ApiError("System roles cannot be deleted.", 403);
  const userCount = await prisma.user.count({ where: { roleId: role.id } });
  if (userCount > 0) throw new ApiError("This role still has users assigned.", 409);
  await prisma.role.delete({ where: { id: role.id } });
  await auditLog(actor.id, "DELETE", "roles", role.id, { name: role.name });
  return ok({ deleted: true });
});

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson, ok } from "@/lib/api";
import { parentSchema } from "@/lib/validators";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

export const GET = handle(async (req) => {
  const user = await requirePerm("parents", "read");
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const parents = await prisma.parent.findMany({
    where: q ? { OR: [{ fullName: { contains: q } }, { phone: { contains: q } }] } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { children: { include: { student: { include: { class: true } } } } },
  });
  return ok(parents);
});

export const POST = handle(async (req) => {
  const user = await requirePerm("parents", "create");
  const parsed = parentSchema.safeParse(await readJson(req));
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]!.message, 422);
  const d = parsed.data;
  const existing = await prisma.parent.findUnique({ where: { phone: d.phone } });
  if (existing) throw new ApiError("A parent with this phone number already exists.", 409);

  const parent = await prisma.parent.create({
    data: { ...d, relationship: d.relationship || "GUARDIAN" },
  });
  await auditLog(user.id, "CREATE", "parents", parent.id, { name: parent.fullName });
  return NextResponse.json({ ok: true, data: parent }, { status: 201 });
});

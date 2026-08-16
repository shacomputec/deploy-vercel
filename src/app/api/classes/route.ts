import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson, ok } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

export const GET = handle(async () => {
  await requirePerm("classes", "read");
  const classes = await prisma.class.findMany({
    orderBy: { name: "asc" },
    include: {
      level: true,
      classTeacher: true,
      _count: { select: { students: true } },
      subjects: { include: { subject: true, teacher: true } },
    },
  });
  return ok(classes);
});

export const POST = handle(async (req) => {
  const user = await requirePerm("classes", "create");
  const body = (await req.json()) as { name?: string; levelId?: string; stream?: string; classTeacherId?: string };
  if (!body.name?.trim() || !body.levelId) throw new ApiError("Class name and level are required");

  const exists = await prisma.class.findFirst({ where: { name: body.name.trim(), levelId: body.levelId } });
  if (exists) throw new ApiError("This class already exists in that level.", 409);

  const klass = await prisma.class.create({
    data: {
      name: body.name.trim(),
      levelId: body.levelId,
      stream: body.stream || null,
      classTeacherId: body.classTeacherId || null,
    },
  });
  await auditLog(user.id, "CREATE", "classes", klass.id, { name: klass.name });
  return NextResponse.json({ ok: true, data: klass }, { status: 201 });
});

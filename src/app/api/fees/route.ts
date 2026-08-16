import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson, ok } from "@/lib/api";
import { feeSchema } from "@/lib/validators";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

export const GET = handle(async () => {
  await requirePerm("fees", "read");
  const fees = await prisma.feeItem.findMany({
    orderBy: { name: "asc" },
    include: { level: true },
  });
  return ok(fees);
});

export const POST = handle(async (req) => {
  const user = await requirePerm("fees", "create");
  const parsed = feeSchema.safeParse(await readJson(req));
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]!.message, 422);
  const d = parsed.data;
  const fee = await prisma.feeItem.create({
    data: {
      name: d.name,
      levelId: d.levelId || null,
      classId: d.classId || null,
      amount: d.amount,
      mandatory: d.mandatory ?? true,
      description: d.description || null,
    },
  });
  await auditLog(user.id, "CREATE", "fees", fee.id, { name: fee.name, amount: fee.amount });
  return NextResponse.json({ ok: true, data: fee }, { status: 201 });
});

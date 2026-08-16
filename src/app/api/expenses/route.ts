import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok, readJson } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

export const GET = handle(async (req) => {
  await requirePerm("expenses", "read");
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const month = url.searchParams.get("month"); // YYYY-MM
  const where = {
    ...(q ? { OR: [{ title: { contains: q } }, { category: { contains: q } }] } : {}),
    ...(month
      ? {
          date: {
            gte: new Date(`${month}-01`),
            lt: new Date(new Date(`${month}-01`).setMonth(new Date(`${month}-01`).getMonth() + 1)),
          },
        }
      : {}),
  };
  const rows = await prisma.expense.findMany({ where, orderBy: { date: "desc" }, take: 500 });
  const total = rows.reduce((a, r) => a + r.amount, 0);
  return ok({ rows, total });
});

export const POST = handle(async (req) => {
  const user = await requirePerm("expenses", "create");
  const body = await readJson<{ title: string; amount: number; category?: string; date?: string; note?: string }>(req);
  if (!body.title?.trim()) throw new ApiError("Title is required");
  if (!body.amount || body.amount <= 0) throw new ApiError("Amount must be greater than zero");
  const row = await prisma.expense.create({
    data: {
      title: body.title.trim(),
      amount: Number(body.amount),
      category: body.category?.trim() || null,
      date: body.date ? new Date(body.date) : new Date(),
      note: body.note?.trim() || null,
      recordedById: user.id,
    },
  });
  await auditLog(user.id, "CREATE", "expenses", row.id, { amount: row.amount });
  return NextResponse.json({ ok: true, data: row }, { status: 201 });
});

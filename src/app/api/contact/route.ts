import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson, rateLimit, clientIp, ok } from "@/lib/api";
import { contactSchema } from "@/lib/validators";
import { requirePerm } from "@/lib/permissions";

export const POST = handle(async (req) => {
  rateLimit(`contact:${clientIp(req)}`, 5, 600_000);
  const parsed = contactSchema.safeParse(await readJson(req));
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]!.message, 422);
  const msg = await prisma.contactMessage.create({ data: parsed.data });
  return NextResponse.json({ ok: true, data: { id: msg.id } }, { status: 201 });
});

export const GET = handle(async (req) => {
  await requirePerm("messaging", "read");
  const messages = await prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return ok(messages);
});

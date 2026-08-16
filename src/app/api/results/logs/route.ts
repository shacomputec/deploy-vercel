import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ok } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";

export const GET = handle(async (req) => {
  const user = await requirePerm("results", "read");
  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "otp"; // otp | access

  if (type === "access") {
    const logs = await prisma.resultAccessLog.findMany({
      orderBy: { accessedAt: "desc" },
      take: 200,
      include: { student: { select: { id: true, fullName: true, admissionNo: true } }, reportCard: true },
    });
    return ok(logs);
  }

  const logs = await prisma.otpRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { student: { select: { id: true, fullName: true, admissionNo: true, phone: true } } },
  });
  return ok(logs);
});

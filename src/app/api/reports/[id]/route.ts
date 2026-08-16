import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson, ok } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { getSchool } from "@/lib/school";

export const GET = handle(async (req, { params }) => {
  const user = await requirePerm("reports", "read");
  const report = await prisma.reportCard.findUnique({
    where: { id: params.id },
    include: { student: true, term: true, academicYear: true, class: true },
  });
  if (!report) throw new ApiError("Report not found", 404);
  const school = await getSchool();
  return ok({ ...report, data: report.data ? JSON.parse(report.data) : null, school });
});

export const POST = handle(async (req, { params }) => {
  const user = await requirePerm("reports", "publish");
  const body = (await req.json()) as { published?: boolean; teacherComment?: string; headComment?: string; conduct?: string };
  const report = await prisma.reportCard.update({
    where: { id: params.id },
    data: {
      published: body.published ?? undefined,
      teacherComment: body.teacherComment ?? undefined,
      headComment: body.headComment ?? undefined,
      conduct: body.conduct ?? undefined,
    },
  });
  await auditLog(user.id, body.published ? "PUBLISH" : "UNPUBLISH", "reports", report.id, { comments: body.teacherComment !== undefined || body.headComment !== undefined || body.conduct !== undefined });
  return ok(report);
});

export const DELETE = handle(async (req, { params }) => {
  const user = await requirePerm("reports", "delete");
  await prisma.reportCard.delete({ where: { id: params.id } });
  await auditLog(user.id, "DELETE", "reports", params.id);
  return ok({ deleted: true });
});

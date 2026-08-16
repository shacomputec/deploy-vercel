import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson } from "@/lib/api";
import { scoresSchema } from "@/lib/validators";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

export const POST = handle(async (req, { params }) => {
  const user = await requirePerm("assessments", "update");
  const parsed = scoresSchema.safeParse(await readJson(req));
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]!.message, 422);

  const assessment = await prisma.assessment.findUnique({ where: { id: params.id } });
  if (!assessment) throw new ApiError("Assessment not found", 404);

  const ops = parsed.data.records.map((r) =>
    prisma.assessmentRecord.upsert({
      where: {
        assessmentId_studentId: { assessmentId: params.id, studentId: r.studentId },
      },
      update: { score: Math.min(r.score, assessment.maxScore) },
      create: {
        assessmentId: params.id,
        studentId: r.studentId,
        score: Math.min(r.score, assessment.maxScore),
      },
    })
  );
  await prisma.$transaction(ops);
  await auditLog(user.id, "UPDATE", "assessments", params.id, { records: parsed.data.records.length });
  return NextResponse.json({ ok: true, data: { saved: parsed.data.records.length } });
});

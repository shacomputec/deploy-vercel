import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { readSpreadsheet, csvCell } from "@/lib/io";

export const POST = handle(async (req) => {
  const user = await requirePerm("results", "update");
  const form = await req.formData();
  const file = form.get("file");
  const assessmentId = String(form.get("assessmentId") || "");
  if (!(file instanceof File)) throw new ApiError("CSV/XLSX file is required");

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { class: { include: { students: true } } },
  });
  if (!assessment) throw new ApiError("Assessment not found", 404);

  const { rows } = await readSpreadsheet(file);
  if (rows.length < 2) throw new ApiError("File must contain a header row and at least one data row");

  const header = rows[0]!.map((h) => h.trim().toLowerCase());
  const idxNo = header.indexOf("admissionno") >= 0 ? header.indexOf("admissionno") : header.indexOf("admission number");
  const idxScore = header.indexOf("score");
  if (idxNo < 0 || idxScore < 0) {
    throw new ApiError('File must have "AdmissionNo" and "Score" columns.');
  }

  const byAdmission = new Map(assessment.class.students.map((s) => [s.admissionNo.toUpperCase(), s]));
  const ops: { admissionNo: string; score: number }[] = [];
  const skipped: string[] = [];

  for (const row of rows.slice(1)) {
    const admissionNo = (row[idxNo] ?? "").trim().toUpperCase();
    const score = Number(row[idxScore]);
    if (!admissionNo || Number.isNaN(score)) continue;
    if (!byAdmission.has(admissionNo)) {
      skipped.push(admissionNo);
      continue;
    }
    ops.push({ admissionNo, score: Math.min(Math.max(score, 0), assessment.maxScore) });
  }

  if (!ops.length) throw new ApiError("No valid rows found. Check that admission numbers match students in this class.");

  await prisma.$transaction(
    ops.map((o) =>
      prisma.assessmentRecord.upsert({
        where: {
          assessmentId_studentId: { assessmentId, studentId: byAdmission.get(o.admissionNo)!.id },
        },
        update: { score: o.score },
        create: { assessmentId, studentId: byAdmission.get(o.admissionNo)!.id, score: o.score },
      })
    )
  );

  await auditLog(user.id, "UPLOAD", "results", assessmentId, { rows: ops.length, skipped: skipped.length, file: file.name });
  return NextResponse.json({
    ok: true,
    data: { imported: ops.length, skipped, file: file.name },
  });
});

/** Download a CSV template pre-filled with the class roll for an assessment. */
export const GET = handle(async (req) => {
  await requirePerm("results", "read");
  const url = new URL(req.url);
  const assessmentId = url.searchParams.get("assessmentId") || "";
  if (!assessmentId) throw new ApiError("assessmentId is required");
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { class: { include: { students: true } } },
  });
  if (!assessment) throw new ApiError("Assessment not found", 404);

  const lines = ["AdmissionNo,Score"];
  for (const s of assessment.class.students) {
    lines.push(`${s.admissionNo},`);
  }
  const csv = lines.join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="scores-${assessment.title.replace(/\W+/g, "-").toLowerCase()}.csv"`,
    },
  });
});

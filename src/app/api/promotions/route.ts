import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok, readJson } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

/**
 * The class a promoted student moves into: the first class of the NEXT LEVEL
 * (e.g. Basic 8A/B/C → the first class at the JHS… no — Basic 7 → Basic 8's
 * first class; SHS 1 → SHS 2's first class). Returns null when the student is
 * already in the final level (they graduate instead).
 */
async function nextClassFor(classId: string) {
  const classes = await prisma.class.findMany({ include: { level: true } });
  const cls = classes.find((c) => c.id === classId);
  if (!cls) return null;
  const next = classes
    .filter((c) => c.level.sortOrder > cls.level.sortOrder)
    .sort(
      (a, b) =>
        a.level.sortOrder - b.level.sortOrder ||
        a.name.localeCompare(b.name, undefined, { numeric: true })
    )[0];
  return next ?? null;
}

export const GET = handle(async (req) => {
  const user = await requirePerm("promotions", "read");
  const url = new URL(req.url);
  const classId = url.searchParams.get("classId");
  const where = classId ? { fromClassId: classId } : {};
  const rows = await prisma.promotion.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      student: { select: { id: true, fullName: true, admissionNo: true } },
      fromClass: { select: { name: true } },
      toClass: { select: { name: true } },
    },
  });
  void user;
  return ok(rows);
});

/**
 * Bulk-promote a whole class at year end.
 * Body: { classId, termId, academicYearId, onlyPromoted?: boolean }
 * Students whose report-card promotionStatus is PROMOTED (or CONDITIONAL when
 * onlyPromoted is false) are moved to the next class; final-level students graduate.
 */
export const POST = handle(async (req) => {
  const actor = await requirePerm("promotions", "create");
  const body = await readJson<{ classId: string; termId: string; academicYearId: string; onlyPromoted?: boolean }>(req);
  if (!body.classId || !body.termId || !body.academicYearId) {
    throw new ApiError("classId, termId and academicYearId are required");
  }

  const cls = await prisma.class.findUnique({ where: { id: body.classId }, include: { level: true } });
  if (!cls) throw new ApiError("Class not found", 404);

  const reportCards = await prisma.reportCard.findMany({
    where: { classId: body.classId, termId: body.termId, academicYearId: body.academicYearId },
    include: { student: true },
  });
  if (!reportCards.length) throw new ApiError("No report cards found for this class/term/year. Generate report cards first.");

  const next = await nextClassFor(body.classId);
  const results: { student: string; status: string; toClass: string | null }[] = [];

  await prisma.$transaction(async (tx) => {
    for (const rc of reportCards) {
      const status = rc.promotionStatus ?? "REPEAT";
      const shouldPromote = status === "PROMOTED" || (!body.onlyPromoted && status === "CONDITIONAL");
      let toClassId: string | null = null;

      if (shouldPromote) {
        if (next) {
          toClassId = next.id;
          await tx.student.update({ where: { id: rc.studentId }, data: { classId: toClassId } });
          // Keep the enrollment record in sync so report/attendance lookups agree
          await tx.enrollment.upsert({
            where: { studentId_academicYearId_classId: { studentId: rc.studentId, academicYearId: body.academicYearId, classId: toClassId } },
            update: { status: "ACTIVE" },
            create: { studentId: rc.studentId, classId: toClassId, academicYearId: body.academicYearId, status: "ACTIVE" },
          });
        } else {
          // Final level (e.g. SHS 3) — graduate
          await tx.student.update({ where: { id: rc.studentId }, data: { status: "GRADUATED" } });
        }
      }

      await tx.promotion.upsert({
        where: { id: `${rc.studentId}_${body.academicYearId}` },
        update: { toClassId, status: shouldPromote ? "PROMOTED" : status === "CONDITIONAL" ? "CONDITIONAL" : "REPEATED", remark: `Year-end ${body.academicYearId}` },
        create: {
          id: `${rc.studentId}_${body.academicYearId}`,
          studentId: rc.studentId,
          fromClassId: body.classId,
          toClassId,
          academicYearId: body.academicYearId,
          status: shouldPromote ? "PROMOTED" : status === "CONDITIONAL" ? "CONDITIONAL" : "REPEATED",
          remark: `Year-end ${body.academicYearId}`,
        },
      });

      results.push({
        student: rc.student.fullName,
        status: shouldPromote ? "PROMOTED" : "REPEATED",
        toClass: toClassId ? next?.name ?? null : !next ? "GRADUATED" : null,
      });
    }
  });

  await auditLog(actor.id, "PROMOTE", "promotions", body.classId, { students: results.length, year: body.academicYearId });
  return NextResponse.json({ ok: true, data: { promoted: results.filter((r) => r.status === "PROMOTED").length, repeated: results.filter((r) => r.status === "REPEATED").length, results } }, { status: 201 });
});

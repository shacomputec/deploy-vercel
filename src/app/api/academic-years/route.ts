import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok, readJson } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

/**
 * Academic-year management for the Year-End page.
 *
 * GET                → { years, terms } (years newest-first, each with its terms)
 * POST { action }    → create | set-current | start-next
 * DELETE { yearId }  → remove an empty year (no scores/reports/payments yet)
 */
export const GET = handle(async () => {
  await requirePerm("yearEnd", "read");
  const [years, terms] = await Promise.all([
    prisma.academicYear.findMany({
      orderBy: { startDate: "desc" },
      include: { terms: { orderBy: { startDate: "asc" } } },
    }),
    prisma.term.findMany({ orderBy: { startDate: "asc" }, include: { academicYear: true } }),
  ]);
  return ok({ years, terms });
});

export const POST = handle(async (req) => {
  const user = await requirePerm("yearEnd", "update");
  const body = await readJson<{
    action: "create" | "set-current" | "start-next";
    name?: string;
    startDate?: string;
    endDate?: string;
    isCurrent?: boolean;
    yearId?: string;
    terms?: { name: string; startDate: string; endDate: string }[];
  }>(req);

  if (body.action === "create") {
    const name = (body.name ?? "").trim();
    if (!/^\d{4}\/\d{4}$/.test(name)) throw new ApiError("Year name must look like 2026/2027", 422);
    const start = body.startDate ? new Date(body.startDate) : null;
    const end = body.endDate ? new Date(body.endDate) : null;
    if (!start || Number.isNaN(start.getTime()) || !end || Number.isNaN(end.getTime())) {
      throw new ApiError("A start and end date are required.", 422);
    }
    if (end <= start) throw new ApiError("The end date must be after the start date.", 422);
    if (await prisma.academicYear.findUnique({ where: { name } })) {
      throw new ApiError(`Academic year ${name} already exists — pick a different name.`, 409);
    }

    const termDefs = (body.terms ?? []).slice(0, 6).map((t) => {
      const s = new Date(t.startDate);
      const e = new Date(t.endDate);
      if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) throw new ApiError(`Term "${t.name}" needs valid dates.`, 422);
      if (e <= s) throw new ApiError(`Term "${t.name}" end must be after its start.`, 422);
      return { name: t.name.trim(), startDate: s, endDate: e };
    });
    if (!termDefs.length) throw new ApiError("Add at least one term.", 422);

    const year = await prisma.$transaction(async (tx) => {
      const created = await tx.academicYear.create({
        data: {
          name,
          startDate: start,
          endDate: end,
          isCurrent: body.isCurrent ? true : false,
          terms: { create: termDefs },
        },
      });
      if (body.isCurrent) {
        await tx.academicYear.updateMany({ where: { NOT: { id: created.id }, isCurrent: true }, data: { isCurrent: false } });
      }
      return created;
    });

    await auditLog(user.id, "CREATE", "academicYear", year.id, { name, terms: termDefs.length, isCurrent: !!body.isCurrent });
    return ok({ year }, { status: 201 });
  }

  if (body.action === "set-current") {
    if (!body.yearId) throw new ApiError("yearId is required", 422);
    const year = await prisma.academicYear.findUnique({ where: { id: body.yearId } });
    if (!year) throw new ApiError("Academic year not found", 404);
    await prisma.$transaction([
      prisma.academicYear.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } }),
      prisma.academicYear.update({ where: { id: body.yearId }, data: { isCurrent: true } }),
    ]);
    await auditLog(user.id, "UPDATE", "academicYear", body.yearId, { action: "set-current", name: year.name });
    return ok({ year: { ...year, isCurrent: true } });
  }

  if (body.action === "start-next") {
    const now = new Date();
    const [years, current] = await Promise.all([
      prisma.academicYear.findMany({ orderBy: { startDate: "asc" } }),
      prisma.academicYear.findFirst({ where: { isCurrent: true } }),
    ]);
    // Next = the first year that starts after today; fall back to the year
    // after the current one; finally the latest year (already current).
    let next = years.find((y) => y.startDate > now);
    if (!next && current) next = years.find((y) => y.startDate > current.startDate);
    if (!next) throw new ApiError("No upcoming academic year to start — create one first.", 400);
    if (next.isCurrent) throw new ApiError(`${next.name} is already the current academic year.`, 400);

    await prisma.$transaction([
      prisma.academicYear.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } }),
      prisma.academicYear.update({ where: { id: next.id }, data: { isCurrent: true } }),
    ]);
    await auditLog(user.id, "UPDATE", "academicYear", next.id, { action: "start-next", name: next.name });
    return ok({ year: next, currentName: next.name });
  }

  throw new ApiError(`Unknown action "${body.action}"`, 422);
});

export const DELETE = handle(async (req) => {
  const user = await requirePerm("yearEnd", "delete");
  const body = await readJson<{ yearId?: string }>(req);
  if (!body.yearId) throw new ApiError("yearId is required", 422);

  const year = await prisma.academicYear.findUnique({
    where: { id: body.yearId },
    include: { reportCards: true, enrollments: true, feeItems: true, assessments: true, mockExams: true, remedialClasses: true, sbaRecords: true },
  });
  if (!year) throw new ApiError("Academic year not found", 404);
  if (year.isCurrent) throw new ApiError("The current academic year cannot be deleted — make another year current first.", 409);

  const used =
    year.reportCards.length + year.enrollments.length + year.feeItems.length +
    year.assessments.length + year.mockExams.length + year.remedialClasses.length + year.sbaRecords.length;
  if (used > 0) throw new ApiError(`This year has ${used} record(s) — it can only be removed while completely empty.`, 409);

  await prisma.academicYear.delete({ where: { id: body.yearId } });
  await auditLog(user.id, "DELETE", "academicYear", body.yearId, { name: year.name });
  return ok({ deleted: year.name });
});

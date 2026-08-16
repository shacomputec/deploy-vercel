import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok, readJson } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

/**
 * PUT  /api/programmes/:id  → { name?, code?, description?, subjectIds?,
 *                              coreSubjectIds? } — updates the programme and
 *                              replaces its subject set.
 * DELETE /api/programmes/:id → removes the programme (classes keep their
 *                              subjects but lose the programme link).
 */
export const PUT = handle(async (req, { params }) => {
  const user = await requirePerm("subjects", "manage");
  const body = await readJson<{
    name?: string;
    code?: string;
    description?: string;
    subjectIds?: string[];
    coreSubjectIds?: string[];
  }>(req);

  const existing = await prisma.programme.findUnique({ where: { id: params.id } });
  if (!existing) throw new ApiError("Programme not found", 404);

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) {
    if (!body.name.trim()) throw new ApiError("Programme name cannot be empty");
    data.name = body.name.trim();
  }
  if (body.code !== undefined) data.code = body.code?.trim() || null;
  if (body.description !== undefined) data.description = body.description?.trim() || null;

  await prisma.$transaction(async (tx) => {
    if (Object.keys(data).length) {
      await tx.programme.update({ where: { id: params.id }, data });
    }
    if (Array.isArray(body.subjectIds)) {
      const subjectIds = [...new Set(body.subjectIds)];
      const valid = await tx.subject.findMany({ where: { id: { in: subjectIds } }, select: { id: true } });
      if (valid.length !== subjectIds.length) throw new ApiError("Some subject ids are invalid");
      const core = new Set(body.coreSubjectIds ?? []);
      await tx.programmeSubject.deleteMany({ where: { programmeId: params.id } });
      if (subjectIds.length) {
        await tx.programmeSubject.createMany({
          data: subjectIds.map((sid) => ({ programmeId: params.id, subjectId: sid, isCore: core.has(sid) })),
        });
      }
    }
  });

  const programme = await prisma.programme.findUnique({
    where: { id: params.id },
    include: { subjects: { include: { subject: true }, orderBy: { isCore: "desc" } } },
  });
  await auditLog(user.id, "UPDATE", "subjects", params.id, { programme: programme?.name });
  return ok(programme);
});

export const DELETE = handle(async (req, { params }) => {
  const user = await requirePerm("subjects", "manage");
  const existing = await prisma.programme.findUnique({ where: { id: params.id } });
  if (!existing) throw new ApiError("Programme not found", 404);
  await prisma.programme.delete({ where: { id: params.id } });
  await auditLog(user.id, "DELETE", "subjects", params.id, { programme: existing.name });
  return ok({ deleted: true });
});

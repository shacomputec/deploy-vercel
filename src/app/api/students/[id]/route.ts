import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson, ok } from "@/lib/api";
import { studentSchema } from "@/lib/validators";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

export const GET = handle(async (req, { params }) => {
  await requirePerm("students", "read");
  const student = await prisma.student.findUnique({
    where: { id: params.id },
    include: {
      class: { include: { level: true } },
      parents: { include: { parent: true } },
      reportCards: { include: { term: true, academicYear: true } },
      payments: { orderBy: { date: "desc" } },
    },
  });
  if (!student) throw new ApiError("Student not found", 404);
  return ok(student);
});

export const PUT = handle(async (req, { params }) => {
  const user = await requirePerm("students", "update");
  const body = await readJson<Record<string, unknown>>(req);

  // Optimistic lock: if the client sends the version it loaded (updatedAt) and
  // the record changed since, someone else edited it — reject with 409 so two
  // people can never silently overwrite each other's changes.
  const expected = typeof body.expectedUpdatedAt === "string" ? new Date(body.expectedUpdatedAt) : null;
  if (expected && !Number.isNaN(expected.getTime())) {
    const current = await prisma.student.findUnique({ where: { id: params.id }, select: { updatedAt: true } });
    if (!current) throw new ApiError("Student not found", 404);
    if (current.updatedAt.getTime() !== expected.getTime()) {
      throw new ApiError("This student's record was changed by someone else. Refresh and try again.", 409);
    }
  }

  const parsed = studentSchema.partial().safeParse(body);
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]!.message, 422);
  const d = parsed.data;

  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(d)) {
    if (v !== undefined) {
      data[k] = k === "dateOfBirth" && v ? new Date(v as string) : v;
    }
  }
  const student = await prisma.student.update({ where: { id: params.id }, data });
  await auditLog(user.id, "UPDATE", "students", student.id, { changes: data });
  return ok(student);
});

export const DELETE = handle(async (req, { params }) => {
  const user = await requirePerm("students", "delete");
  await prisma.student.delete({ where: { id: params.id } });
  await auditLog(user.id, "DELETE", "students", params.id);
  return ok({ deleted: true });
});

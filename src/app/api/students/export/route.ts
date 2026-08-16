import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const GET = handle(async (req) => {
  const user = await requirePerm("students", "read");
  const url = new URL(req.url);
  const classId = url.searchParams.get("classId") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;

  const students = await prisma.student.findMany({
    where: {
      ...(classId ? { classId } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: [{ class: { level: { sortOrder: "asc" } } }, { fullName: "asc" }],
    include: { class: { include: { level: true } } },
    take: 5000,
  });

  const headers = ["AdmissionNo", "FullName", "Gender", "DateOfBirth", "Class", "Level", "Status", "Phone", "Email", "NHISNumber", "GhanaCard", "Hometown", "District", "Region", "Religion"];
  const lines = [headers.join(",")];
  for (const s of students) {
    lines.push(
      [
        s.admissionNo,
        s.fullName,
        s.gender,
        s.dateOfBirth?.toISOString().slice(0, 10) ?? "",
        s.class?.name ?? "",
        s.class?.level.name ?? "",
        s.status,
        s.phone ?? "",
        s.email ?? "",
        s.nhisNumber ?? "",
        s.ghanaCard ?? "",
        s.hometown ?? "",
        s.district ?? "",
        s.region ?? "",
        s.religion ?? "",
      ]
        .map(csvCell)
        .join(",")
    );
  }

  await auditLog(user.id, "EXPORT", "students", undefined, { rows: students.length });
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse("\uFEFF" + lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="students-${stamp}.csv"`,
    },
  });
});

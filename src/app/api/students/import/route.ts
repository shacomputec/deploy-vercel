import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handle, ApiError } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { readSpreadsheet } from "@/lib/io";
import { nextAdmissionNo } from "@/lib/sequences";
import { ghPhone, ghanaCard, nhisNumber } from "@/lib/validators";

/** Per-cell validation shared with the entry forms (src/lib/validators.ts). */
function cellError(value: string, schema: typeof ghPhone | typeof ghanaCard | typeof nhisNumber): string | null {
  if (!value) return null;
  const r = schema.safeParse(value);
  return r.success ? null : r.error.issues[0]!.message;
}

/**
 * Students import — the exact round-trip of GET /api/students/export.
 *
 * POST /api/students/import  (multipart: file)
 *
 * Columns: AdmissionNo, FullName, Gender, DateOfBirth, Class, Level, Status,
 * Phone, Email, NHISNumber, GhanaCard, Hometown, District, Region, Religion.
 *
 * - A row with an existing AdmissionNo UPDATES that student (blank cells keep
 *   the stored value).
 * - A row with a blank AdmissionNo but a FullName CREATES a student (a new
 *   admission number is generated automatically).
 * - "Class" is matched by class name (e.g. "Basic 8"); unknown classes and
 *   blank-name rows are skipped and reported.
 */
export const POST = handle(async (req) => {
  const user = await requirePerm("students", "create");
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError("CSV/XLSX file is required");

  const { rows, format } = await readSpreadsheet(file);
  if (rows.length < 2) throw new ApiError("File must contain a header row and at least one data row");

  const header = rows[0]!.map((h) => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ""));
  const idx = (names: string[]) => header.findIndex((h) => names.includes(h));
  const iNo = idx(["admissionno", "admissionnumber", "indexno"]);
  const iName = idx(["fullname", "name", "studentname"]);
  if (iName < 0) throw new ApiError('File must have a "FullName" column (use the Students export CSV).');

  const [students, classes] = await Promise.all([
    prisma.student.findMany({ select: { id: true, admissionNo: true } }),
    prisma.class.findMany({ select: { id: true, name: true } }),
  ]);
  const byAdmission = new Map(students.map((s) => [s.admissionNo.toUpperCase(), s.id]));
  const byClassName = new Map(classes.map((c) => [c.name.trim().toLowerCase(), c.id]));

  const pick = (row: string[], i: number) => (i >= 0 ? (row[i] ?? "").toString().trim() : "");

  let created = 0;
  let updated = 0;
  const skipped: string[] = [];

  await prisma.$transaction(async (tx) => {
    for (const row of rows.slice(1)) {
      const admissionNo = pick(row, iNo);
      const fullName = pick(row, iName);
      if (!fullName) {
        skipped.push(admissionNo || "<no name>");
        continue;
      }
      const classId = (() => {
        const cn = pick(row, idx(["class", "classname"])).toLowerCase();
        return cn ? (byClassName.get(cn) ?? null) : undefined;
      })();
      const data: Record<string, unknown> = {
        fullName,
        gender: pick(row, idx(["gender"])).toUpperCase() === "FEMALE" ? "FEMALE" : "MALE",
        status: pick(row, idx(["status"])).toUpperCase() || "ACTIVE",
      };
      if (classId !== undefined) data.classId = classId;
      const dob = pick(row, idx(["dateofbirth", "dob"]));
      if (dob) {
        const d = new Date(dob);
        if (!Number.isNaN(d.getTime())) data.dateOfBirth = d;
      }
      const phone = pick(row, idx(["phone", "telephone", "mobile"]));
      const phoneErr = cellError(phone, ghPhone);
      if (phoneErr) {
        skipped.push(`${fullName} (phone: ${phoneErr})`);
        continue;
      }
      if (phone) data.phone = phone;
      const email = pick(row, idx(["email"]));
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        skipped.push(`${fullName} (email: invalid email address)`);
        continue;
      }
      if (email) data.email = email;
      const nhis = pick(row, idx(["nhisnumber", "nhis", "nhisno"]));
      const nhisErr = cellError(nhis, nhisNumber);
      if (nhisErr) {
        skipped.push(`${fullName} (NHIS: ${nhisErr})`);
        continue;
      }
      if (nhis) data.nhisNumber = nhis;
      const gCard = pick(row, idx(["ghanacard", "ghanacardno", "ghcard"]));
      const cardErr = cellError(gCard, ghanaCard);
      if (cardErr) {
        skipped.push(`${fullName} (Ghana Card: ${cardErr})`);
        continue;
      }
      if (gCard) data.ghanaCard = gCard;
      const hometown = pick(row, idx(["hometown", "town"]));
      if (hometown) data.hometown = hometown;
      const district = pick(row, idx(["district"]));
      if (district) data.district = district;
      const region = pick(row, idx(["region"]));
      if (region) data.region = region;
      const religion = pick(row, idx(["religion"]));
      if (religion) data.religion = religion;

      const existingId = admissionNo ? byAdmission.get(admissionNo.toUpperCase()) : undefined;
      if (existingId) {
        await tx.student.update({ where: { id: existingId }, data });
        updated++;
      } else {
        const newNo = admissionNo && !byAdmission.has(admissionNo.toUpperCase()) ? admissionNo : await nextAdmissionNo();
        if (byAdmission.has(newNo.toUpperCase())) {
          skipped.push(fullName);
          continue;
        }
        await tx.student.create({ data: { admissionNo: newNo, ...data } as Prisma.StudentUncheckedCreateInput });
        byAdmission.set(newNo.toUpperCase(), "new");
        created++;
      }
    }
  });

  await auditLog(user.id, "UPLOAD", "students", undefined, {
    action: "students-import", format, rows: rows.length - 1, created, updated, skipped: skipped.length,
  });
  return NextResponse.json({
    ok: true,
    data: { created, updated, skipped: skipped.slice(0, 20), total: created + updated },
  });
});

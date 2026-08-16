import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, rateLimit, clientIp, ok } from "@/lib/api";
import { admissionSchema } from "@/lib/validators";
import { requirePerm } from "@/lib/permissions";
import { encryptBuffer } from "@/lib/crypto";
import { notifyRoleInApp } from "@/lib/notify";

const MAX_FILE = 8_000_000; // 8MB per document
const ALLOWED = /\.(pdf|png|jpe?g|webp)$/i;
// multipart field name -> stored category
const FILE_FIELDS: Record<string, string> = {
  birthCertificate: "BIRTH_CERTIFICATE",
  passportPhoto: "PASSPORT_PHOTO",
  weighingCard: "WEIGHING_CARD",
  previousReport: "PREVIOUS_REPORT",
};

export const POST = handle(async (req) => {
  rateLimit(`admission:${clientIp(req)}`, 10, 600_000);

  const form = await req.formData();
  const str = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  const classIdInput = str("classId");
  // The server is authoritative: if only a specific class was chosen (and the
  // level was left blank by a non-JS client), derive the level from the class.
  let levelIdInput = str("levelId");
  if (classIdInput && !levelIdInput) {
    const clsLvl = await prisma.class.findUnique({
      where: { id: classIdInput },
      select: { levelId: true },
    });
    if (!clsLvl) throw new ApiError("The selected class is no longer available. Please pick another class.", 422);
    levelIdInput = clsLvl.levelId;
  }
  const parsed = admissionSchema.safeParse({
    fullName: str("fullName"),
    dateOfBirth: str("dateOfBirth"),
    gender: str("gender") || undefined,
    classId: classIdInput,
    levelId: levelIdInput,
    nhisNumber: str("nhisNumber"),
    weighingCardNumber: str("weighingCardNumber"),
    previousSchool: str("previousSchool"),
    previousSchoolClass: str("previousSchoolClass"),
    parentName: str("parentName"),
    parentPhone: str("parentPhone"),
    parentEmail: str("parentEmail"),
    parentOccupation: str("parentOccupation"),
    address: str("address"),
    digitalAddress: str("digitalAddress"),
    message: str("message"),
  });
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]!.message, 422);
  const d = parsed.data;

  // Collect and validate uploads (birth certificate + passport picture required)
  const files: Record<string, File> = {};
  for (const [field, cat] of Object.entries(FILE_FIELDS)) {
    const f = form.get(field);
    if (f instanceof File && f.size > 0) files[cat] = f;
  }
  if (!files["BIRTH_CERTIFICATE"]) throw new ApiError("The birth certificate is required.", 422);
  if (!files["PASSPORT_PHOTO"]) throw new ApiError("The passport picture is required.", 422);
  for (const f of Object.values(files)) {
    if (!f) continue;
    if (f.size > MAX_FILE) throw new ApiError("One of the uploaded files is too large (max 8MB per file)");
    if (!ALLOWED.test(f.name)) throw new ApiError("Only PDF, PNG or JPG files are supported for uploads");
  }

  // The applicant picks a SPECIFIC class (e.g. "Basic 4"). When a class is
  // chosen, verify it exists and derive the level from it (authoritative — the
  // stored level always matches the chosen class). Bare-level fallback remains
  // for schools that haven't created their classes yet.
  let classId = d.classId ?? null;
  let levelId = d.levelId;
  if (classId) {
    const cls = await prisma.class.findUnique({ where: { id: classId }, select: { id: true, levelId: true } });
    if (!cls) throw new ApiError("The selected class is no longer available. Please pick another class.", 422);
    levelId = cls.levelId;
  }

  const referenceNo = `ADM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const app = await prisma.admissionApplication.create({
    data: {
      referenceNo,
      fullName: d.fullName,
      dateOfBirth: d.dateOfBirth ? new Date(d.dateOfBirth) : null,
      gender: d.gender ?? null,
      classId,
      levelId,
      nhisNumber: d.nhisNumber ?? null,
      weighingCardNumber: d.weighingCardNumber ?? null,
      previousSchool: d.previousSchool ?? null,
      previousSchoolClass: d.previousSchoolClass ?? null,
      parentName: d.parentName,
      parentPhone: d.parentPhone,
      parentEmail: d.parentEmail ?? null,
      parentOccupation: d.parentOccupation ?? null,
      address: d.address ?? null,
      digitalAddress: d.digitalAddress ?? null,
      message: d.message ?? null,
    },
  });

  // Documents are AES-256-GCM encrypted before storage (same at-rest protection as teacher records)
  for (const [cat, file] of Object.entries(files)) {
    if (!file) continue;
    const plaintext = Buffer.from(await file.arrayBuffer());
    const { iv, data } = encryptBuffer(plaintext);
    await prisma.admissionDocument.create({
      data: {
        applicationId: app.id,
        category: cat,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        size: plaintext.length,
        iv,
        data,
      },
    });
  }

  // Alert the school office about the new application.
  await notifyRoleInApp(
    ["admin", "super_admin", "headteacher", "admissions_officer"],
    "New admission application",
    `${d.fullName} submitted an application — ${app.referenceNo}`,
    "info",
    "/admin/admissions",
  );

  return NextResponse.json({ ok: true, data: { referenceNo: app.referenceNo } }, { status: 201 });
});

export const GET = handle(async (req) => {
  await requirePerm("admissions", "read");
  const apps = await prisma.admissionApplication.findMany({
    orderBy: { submittedAt: "desc" },
    include: {
      level: true,
      class: true,
      student: { select: { id: true, admissionNo: true, fullName: true } },
      documents: { select: { id: true, category: true, fileName: true, size: true } },
    },
  });
  return ok(apps);
});

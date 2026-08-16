import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok, rateLimit } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { encryptBuffer, decryptBuffer } from "@/lib/crypto";

const MAX_FILE = 8_000_000; // 8MB
const ALLOWED = /\.(pdf|docx?|xlsx?|png|jpe?g|webp)$/i;
const CATEGORIES = [
  "HIGHEST_PROF_QUAL", "FIRST_APPOINTMENT", "NTC_RED", "SPECIALIZATION",
  "INSTITUTION", "COLLEGE_COMPLETION", "LAST_PROMOTION", "GHANA_CARD", "OTHER",
] as const;

export const GET = handle(async (req, { params }) => {
  await requirePerm("teachers", "read");
  const teacher = await prisma.teacher.findUnique({ where: { id: params.id } });
  if (!teacher) throw new ApiError("Teacher not found", 404);
  const docs = await prisma.teacherDocument.findMany({
    where: { teacherId: params.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, category: true, fileName: true, mimeType: true, size: true, createdAt: true },
  });
  return ok(docs);
});

/** Upload a confidential document — encrypted with AES-256-GCM before storage. */
export const POST = handle(async (req, { params }) => {
  const user = await requirePerm("teachers", "update");
  rateLimit(`doc-upload:${user.id}`, 20, 60_000);

  const teacher = await prisma.teacher.findUnique({ where: { id: params.id } });
  if (!teacher) throw new ApiError("Teacher not found", 404);

  const form = await req.formData();
  const file = form.get("file");
  const rawCategory = form.get("category");
  const category = typeof rawCategory === "string" && (CATEGORIES as readonly string[]).includes(rawCategory) ? rawCategory : "OTHER";
  if (!(file instanceof File)) throw new ApiError("File is required");
  if (file.size > MAX_FILE) throw new ApiError("File too large (max 8MB)");
  if (!ALLOWED.test(file.name)) throw new ApiError("Only PDF, Word, Excel, PNG/JPG files are supported");

  const plaintext = Buffer.from(await file.arrayBuffer());
  const { iv, data } = encryptBuffer(plaintext);

  const doc = await prisma.teacherDocument.create({
    data: {
      teacherId: params.id,
      category,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      size: plaintext.length,
      iv,
      data,
      uploadedById: user.id,
    },
  });

  await auditLog(user.id, "UPLOAD", "teacher.documents", doc.id, { fileName: file.name, teacher: teacher.fullName });
  return NextResponse.json(
    { ok: true, data: { id: doc.id, fileName: doc.fileName, size: doc.size } },
    { status: 201 }
  );
});

/** Download a document — decrypted in memory, never written to disk. */
export const PUT = handle(async (req, { params }) => {
  await requirePerm("teachers", "read");
  const url = new URL(req.url);
  const docId = url.searchParams.get("docId");
  if (!docId) throw new ApiError("docId is required");

  const doc = await prisma.teacherDocument.findUnique({ where: { id: docId } });
  if (!doc) throw new ApiError("Document not found", 404);

  const plaintext = decryptBuffer(doc.iv, doc.data);
  const name = doc.fileName.replace(/[^\w.\- ]/g, "_");
  return new NextResponse(new Uint8Array(plaintext), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `attachment; filename="${name}"`,
      "Content-Length": String(plaintext.length),
      "X-Content-Type-Options": "nosniff",
    },
  });
});

export const DELETE = handle(async (req, { params }) => {
  const user = await requirePerm("teachers", "update");
  const url = new URL(req.url);
  const docId = url.searchParams.get("docId");
  if (!docId) throw new ApiError("docId is required");
  const doc = await prisma.teacherDocument.findUnique({ where: { id: docId } });
  if (!doc) throw new ApiError("Document not found", 404);
  await prisma.teacherDocument.delete({ where: { id: docId } });
  await auditLog(user.id, "DELETE", "teacher.documents", docId, { fileName: doc.fileName });
  return ok({ deleted: true });
});

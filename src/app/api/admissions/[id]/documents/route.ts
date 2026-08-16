import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { decryptBuffer } from "@/lib/crypto";

/**
 * Download an admission document — decrypted in memory, never written to disk.
 * Access is restricted to authenticated staff with admissions:read.
 */
export const GET = handle(async (req, { params }) => {
  await requirePerm("admissions", "read");
  const url = new URL(req.url);
  const docId = url.searchParams.get("docId");
  if (!docId) throw new ApiError("docId is required");

  const doc = await prisma.admissionDocument.findUnique({ where: { id: docId } });
  if (!doc || doc.applicationId !== params.id) throw new ApiError("Document not found", 404);

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

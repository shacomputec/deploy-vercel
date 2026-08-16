import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getSchool } from "@/lib/school";
import { buildLicenseReceiptPdf } from "@/lib/receipt-pdf";

/**
 * Download a license-payment receipt as a real PDF file. The PDF was generated
 * and persisted at settlement; if a legacy transaction predates that, it is
 * regenerated on the fly (and persisted) so every receipt is downloadable.
 */
export const GET = handle(async (_req: Request, ctx: { params: Record<string, string> }) => {
  const reference = ctx.params.reference;
  const user = await getCurrentUser();
  if (!user) throw new ApiError("Authentication required", 401);

  const tx = await prisma.paymentGatewayTx.findUnique({
    where: { reference },
  });
  if (!tx || (tx.purpose !== "LICENSE" && tx.purpose !== "LICENSE_PURCHASE")) throw new ApiError("Receipt not found", 404);

  let pdfB64 = tx.receiptPdf;
  if (!pdfB64) {
    const school = await getSchool();
    pdfB64 = buildLicenseReceiptPdf({
      schoolName: school?.name ?? "School",
      reference: tx.reference,
      amount: `GHS ${tx.amount.toFixed(2)}`,
      method:
        tx.method === "MOMO"
          ? `Mobile Money${tx.provider ? ` (${tx.provider})` : ""}`
          : "Paystack (card / mobile money)",
      date: new Date(tx.createdAt).toLocaleString(),
      purpose: "License activation (GES School MIS)",
      status: tx.status,
      developerName: school?.developerName,
      developerPhone: school?.developerPhone,
      developerEmail: school?.developerEmail,
    }).toString("base64");
    try {
      await prisma.paymentGatewayTx.update({ where: { id: tx.id }, data: { receiptPdf: pdfB64 } });
    } catch {
      /* best-effort persist */
    }
  }

  const buf = Buffer.from(pdfB64, "base64");
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="GES-MIS-receipt-${tx.reference}.pdf"`,
      "Content-Length": String(buf.length),
    },
  });
});

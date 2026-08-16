import { prisma } from "@/lib/prisma";

/** Next admission number for the current academic year — max-based so deletions never collide. */
export async function nextAdmissionNo(): Promise<string> {
  const year = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
  const yearTag =
    year?.name.replace("/", "").slice(-2) ?? new Date().getFullYear().toString().slice(-2);
  const prefix = `GES-20${yearTag}-`;
  const rows = await prisma.student.findMany({
    where: { admissionNo: { startsWith: prefix } },
    select: { admissionNo: true },
  });
  let max = 0;
  for (const r of rows) {
    const n = Number.parseInt(r.admissionNo.slice(prefix.length), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

/** Next fee receipt number — max-based so deletions never collide. */
export async function nextReceiptNo(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `RCP-${year}-`;
  const rows = await prisma.feePayment.findMany({
    where: { receiptNo: { startsWith: prefix } },
    select: { receiptNo: true },
  });
  let max = 1000;
  for (const r of rows) {
    const n = Number.parseInt(r.receiptNo.slice(prefix.length), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return `${prefix}${max + 1}`;
}

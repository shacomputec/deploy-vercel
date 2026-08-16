import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok, rateLimit, clientIp } from "@/lib/api";

/** Public lookup used by the /pay checkout — returns only identity info. */
export const GET = handle(async (req) => {
  rateLimit(`lookup:${clientIp(req)}`, 30, 60_000);
  const url = new URL(req.url);
  const admissionNo = url.searchParams.get("admissionNo")?.trim();
  if (!admissionNo) throw new ApiError("Missing admissionNo", 422);

  const student = await prisma.student.findUnique({
    where: { admissionNo },
    select: { id: true, fullName: true, admissionNo: true, class: { select: { name: true } } },
  });
  if (!student) throw new ApiError("Student not found. Check the admission number.", 404);
  return ok(student);
});

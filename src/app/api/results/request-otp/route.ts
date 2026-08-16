import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson, rateLimit, clientIp } from "@/lib/api";
import { otpRequestSchema } from "@/lib/validators";
import { generateOtp, hashOtp } from "@/lib/otp";
import { formatOtpMessage } from "@/lib/sms";
import { notify } from "@/lib/notify";
import { getSchool } from "@/lib/school";
import { getSetting } from "@/lib/settings";

export const POST = handle(async (req) => {
  const ip = clientIp(req);
  rateLimit(`otp:${ip}`, 10, 60_000); // max 10 OTP requests/min/IP

  const body = await readJson<{ admissionNo: string; phone: string }>(req);
  const parsed = otpRequestSchema.safeParse(body);
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]!.message, 422);

  const { admissionNo, phone } = parsed.data;
  const normalizedPhone = phone.replace(/[\s-]/g, "");

  // Find the student — admission number alone must NOT reveal anything
  const student = await prisma.student.findUnique({ where: { admissionNo: admissionNo.toUpperCase() } });
  // Identical message + delay for every failure so the endpoint cannot be used
  // to enumerate admission numbers or registered phones.
  const notFound = async () => {
    await new Promise((r) => setTimeout(r, 600));
    throw new ApiError("We could not send a code. Please verify your details with the school office.", 404);
  };
  if (!student || !student.phone) return notFound();
  if (student.phone.replace(/[\s-]/g, "") !== normalizedPhone) return notFound();

  // Rate limit per student as well
  rateLimit(`otp:student:${student.id}`, 5, 300_000);

  const ttlSeconds = Number((await getSetting("result.otp.ttlSeconds")) || 300);
  const code = generateOtp();
  const otp = await prisma.otpRequest.create({
    data: {
      studentId: student.id,
      phone: normalizedPhone,
      codeHash: hashOtp(code),
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
    },
  });

  const school = await getSchool();
  await notify(
    { phone: normalizedPhone, email: student.email || undefined, whatsapp: student.phone || undefined },
    formatOtpMessage(code, school?.name ?? "School")
  );

  return NextResponse.json({
    ok: true,
    data: {
      requestId: otp.id,
      message: `A 6-digit OTP has been sent to the registered number (${phone.slice(0, 4)}****${phone.slice(-2)}). It expires in ${Math.round(ttlSeconds / 60)} minutes.`,
    },
  });
});

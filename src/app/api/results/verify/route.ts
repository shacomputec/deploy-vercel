import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, readJson, rateLimit, clientIp } from "@/lib/api";
import { otpVerifySchema } from "@/lib/validators";
import { verifyOtp } from "@/lib/otp";
import { getSchool } from "@/lib/school";
import { getSetting } from "@/lib/settings";

export const POST = handle(async (req) => {
  const ip = clientIp(req);
  rateLimit(`verify:${ip}`, 20, 60_000);

  const body = await readJson<{ admissionNo: string; phone: string; code: string; requestId: string }>(req);
  const parsed = otpVerifySchema.safeParse(body);
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]!.message, 422);

  const { admissionNo, phone, code, requestId } = parsed.data;
  const student = await prisma.student.findUnique({ where: { admissionNo: admissionNo.toUpperCase() } });
  if (!student || !student.phone) throw new ApiError("Invalid request.", 404);

  const otp = await prisma.otpRequest.findUnique({ where: { id: requestId } });
  if (!otp || otp.studentId !== student.id || otp.verified || otp.usedAt) {
    throw new ApiError("Invalid or already-used OTP request. Please request a new code.", 400);
  }
  if (otp.expiresAt < new Date()) throw new ApiError("This OTP has expired. Please request a new one.", 400);

  const maxAttempts = Number((await getSetting("result.otp.maxAttempts")) || 5);
  if (otp.attempts >= maxAttempts) throw new ApiError("Too many failed attempts. Please request a new OTP.", 429);

  if (!verifyOtp(code, otp.codeHash)) {
    await prisma.otpRequest.update({ where: { id: otp.id }, data: { attempts: otp.attempts + 1 } });
    throw new ApiError("Incorrect OTP. Please try again.", 401);
  }

  // Mark used
  await prisma.otpRequest.update({ where: { id: otp.id }, data: { verified: true, usedAt: new Date() } });

  // Find the current-term published report card
  const currentYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
  const currentTerm = await prisma.term.findFirst({ where: { isCurrent: true } });
  if (!currentYear || !currentTerm) throw new ApiError("No active academic term configured.", 500);

  const report = await prisma.reportCard.findUnique({
    where: {
      studentId_termId_academicYearId: {
        studentId: student.id,
        termId: currentTerm.id,
        academicYearId: currentYear.id,
      },
    },
  });
  if (!report || !report.published) {
    throw new ApiError("Results for this term have not been published yet. Please check back later.", 404);
  }

  const school = await getSchool();
  const data = JSON.parse(report.data ?? "null");
  if (!data) throw new ApiError("Report data is unavailable.", 500);

  const origin = new URL(req.url).origin;
  const qrDataUrl = await QRCode.toDataURL(
    `${origin}/verify-result?ref=${report.id}&sig=${report.qrToken}`,
    { width: 240, margin: 1, color: { dark: "#065f46" } }
  );

  // Single access log entry for this successful view (with report reference)
  await prisma.resultAccessLog.create({
    data: {
      studentId: student.id,
      reportCardId: report.id,
      ip,
      userAgent: req.headers.get("user-agent")?.slice(0, 300),
    },
  });

  return NextResponse.json({
    ok: true,
    data: {
      report: data,
      schoolName: school?.name ?? "School",
      motto: school?.motto,
      logo: "/sms-logo.png", // brand mark suits white report-card paper
      studentName: student.fullName,
      admissionNo: student.admissionNo,
      qrDataUrl,
      published: true,
      vacationDate: currentTerm.vacationDate,
      reopeningDate: currentTerm.reopeningDate,
      termStartDate: currentTerm.startDate,
      termEndDate: currentTerm.endDate,
    },
  });
});

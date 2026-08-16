import crypto from "crypto";

const OTP_LENGTH = 6;

export function generateOtp(): string {
  // crypto-random digits (rejection sampling avoids modulo bias)
  const bytes = crypto.randomBytes(OTP_LENGTH);
  let code = "";
  for (const b of bytes) code += String(b % 10);
  return code;
}

export function hashOtp(code: string): string {
  return crypto
    .createHmac("sha256", process.env.JWT_SECRET || "dev-secret-change-me")
    .update(`otp:${code}`)
    .digest("hex");
}

export function verifyOtp(code: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashOtp(code.trim()), "utf8");
  const expected = Buffer.from(expectedHash, "utf8");
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

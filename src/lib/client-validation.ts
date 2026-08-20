// Client-side mirrors of the server-side zod rules (src/lib/validators.ts).
// Kept in sync so forms can show the same error inline while the user types,
// before the API rejects the submission. The server remains the authority.

const GH_PHONE = /^(0\d{9}|\+?233\d{9})$/;

/** Normalizes a phone string the same way the server does. */
export function normalizePhone(v: string): string {
  return v.trim().replace(/[\s\-().]/g, "");
}

/** True when the value is a valid 10-digit Ghana phone number. */
export function isValidGhPhone(v: string): boolean {
  if (!v) return false;
  return GH_PHONE.test(normalizePhone(v));
}

export const GH_PHONE_HINT = "Enter a valid 10-digit Ghana phone number (e.g. 0241234567)";

const GHANA_CARD = /^GHA-\d{9}-\d{1}$/;

/** Normalizes a Ghana Card number the same way the server does. */
export function normalizeGhanaCard(v: string): string {
  return v.trim().toUpperCase().replace(/^GHA-?/, "GHA-");
}

/** True when the value is a valid Ghana Card number (GHA- + 9 digits + check digit). */
export function isValidGhanaCard(v: string): boolean {
  if (!v) return false;
  return GHANA_CARD.test(normalizeGhanaCard(v));
}

export const GHANA_CARD_HINT = "Ghana Card must be GHA- followed by 9 digits and a check digit (e.g. GHA-123456789-0)";

/** Normalizes an NHIS number the same way the server does (strips spaces/dashes). */
export function normalizeNhis(v: string): string {
  return v.trim().replace(/[\s\-.]/g, "");
}

/** True when the value is a valid NHIS number (exactly 9 digits). */
export function isValidNhis(v: string): boolean {
  if (!v) return false;
  return /^\d{9}$/.test(normalizeNhis(v));
}

export const NHIS_HINT = "NHIS number must be exactly 9 digits (e.g. 123456789)";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ok, rateLimit } from "@/lib/api";
import { validateLicenseKey, getKeyNonce } from "@/lib/license";

/**
 * GET /api/license/remote-status?key=GES-SMIS-…&school=…
 *
 * The ONLINE licensing authority. A school installation phones home here
 * (throttled, every 12h) when its LICENSE_SERVER points at this deployment.
 * This route is intentionally public — the key itself is the credential, and
 * it is rate-limited per key. It answers for any installation's key because
 * the issuance records (nonce → school, days, revokedAt) live in THIS
 * deployment's database.
 *
 * Verdicts:
 *   ACTIVE    — key valid, subscription runs until expiresAt
 *   EXPIRED   — subscription period (issuedAt + days) is over → school locks
 *   REVOKED   — developer revoked the key from the Licensing console
 *   MISMATCH  — key was issued for a different school than the caller claims
 *   UNTRACKED — legacy/offline-minted key; caller falls back to local rules
 *   INVALID   — signature does not verify (forged/tampered)
 */
export const GET = handle(async (req) => {
  const url = new URL(req.url);
  const key = (url.searchParams.get("key") || "").trim();
  const wantSchool = (url.searchParams.get("school") || "").trim().toUpperCase();
  if (!key) return NextResponse.json({ ok: false, error: "key is required" }, { status: 422 });

  const check = validateLicenseKey(key);
  if (!check.valid) return ok({ status: "INVALID", message: "Invalid or tampered license key." });

  const nonce = getKeyNonce(key);
  if (!nonce) {
    return ok({ status: "UNTRACKED", message: "Legacy key — not tracked on the licensing server." });
  }

  rateLimit(`remote-status:${nonce}`, 30, 60_000);

  const issuance = await prisma.licenseIssuance.findUnique({ where: { nonce } });
  if (!issuance) {
    return ok({ status: "UNTRACKED", message: "This key was not issued from the licensing server." });
  }

  const expiresAt = new Date(issuance.createdAt.getTime() + issuance.days * 24 * 60 * 60 * 1000);
  const issuedSchool = issuance.schoolId.toUpperCase();

  if (issuance.revokedAt) {
    return ok({
      status: "REVOKED",
      schoolId: issuedSchool,
      expiresAt: expiresAt.toISOString(),
      message: "This license key has been revoked by the developer.",
    });
  }
  if (wantSchool && wantSchool !== issuedSchool) {
    return ok({
      status: "MISMATCH",
      schoolId: issuedSchool,
      expiresAt: expiresAt.toISOString(),
      message: `This key was issued for school ${issuedSchool}, not ${wantSchool}.`,
    });
  }
  if (expiresAt.getTime() < Date.now()) {
    return ok({
      status: "EXPIRED",
      schoolId: issuedSchool,
      expiresAt: expiresAt.toISOString(),
      message: `This license expired on ${expiresAt.toISOString().slice(0, 10)}.`,
    });
  }
  return ok({
    status: "ACTIVE",
    schoolId: issuedSchool,
    expiresAt: expiresAt.toISOString(),
    message: "License valid.",
  });
});

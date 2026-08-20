import { getSetting, getSettings } from "@/lib/settings";
import { getLicenseStatus, checkRemoteLicense } from "@/lib/license";
import { prisma } from "@/lib/prisma";

/**
 * The enforcement gate for the whole school-facing side of the system.
 *
 * The Developer account always bypasses it. Everyone else is stopped when:
 *  1. the vendor has LOCKED **this school** — locking is keyed to the school's
 *     license code (the SCHOOLID embedded in its license key, e.g.
 *     `GES-SMIS-ABC-365-…`), so the developer can lock one school online
 *     without locking every school they have sold to. The legacy global
 *     `system.locked` setting is still honoured (emergency "lock everything");
 *  2. the license is EXPIRED or SUSPENDED (trial ended / key revoked / clock
 *     rollback) — lock screen with an activation form;
 *  3. a new version of the Terms & Conditions was published and the school has
 *     not accepted it yet — terms acceptance screen.
 */
export type SystemGate = {
  systemLocked: boolean;
  lockMessage: string;
  schoolId: string; // the license code this installation belongs to
  licenseBlocked: boolean;
  licenseMessage: string;
  termsVersion: string;
  termsContent: string;
  termsAcceptedVersion: string;
  needsTermsAcceptance: boolean;
};

/** The license code of THIS installation (from the active license record). */
export async function getThisSchoolId(): Promise<string> {
  const lic = await prisma.license.findFirst({ orderBy: { createdAt: "desc" } });
  return (lic?.schoolId || "main").toUpperCase();
}

/**
 * Lightweight enforcement for the API layer (used by the shared handle()
 * wrapper). Unlike getSystemGate() this never writes (no lastSeenAt update,
 * no trial-expiry flip) — it is safe to run on EVERY authenticated request
 * from web, desktop AND mobile, which all hit the same /api/* endpoints, so
 * locking one school blocks all three clients at the same time.
 */
export async function getApiGateBlock(): Promise<{ blocked: boolean; message: string }> {
  const settings = await getSettings();
  const locked = settings.get("system.locked") === "true";
  const lockMessage = settings.get("system.lockMessage")?.trim();

  let lic = await prisma.license.findFirst({ orderBy: { createdAt: "desc" } });
  const schoolId = (lic?.schoolId || "main").toUpperCase();
  const schoolLocked = settings.get(`lock.school.${schoolId}`) === "true";
  const schoolMessage = settings.get(`lock.school.${schoolId}.message`)?.trim();

  if (schoolLocked || locked) {
    return {
      blocked: true,
      message:
        (schoolLocked ? schoolMessage || lockMessage : lockMessage) ||
        "This system has been locked by the vendor. Contact your system developer to resolve it.",
    };
  }
  // Online enforcement: while ACTIVE, check in with the developer's licensing
  // server (throttled to once per 12h). A REVOKED/EXPIRED/MISMATCH verdict
  // flips this install's status, and the check below then blocks it. Network
  // failure is a grace window — the local verdict keeps governing.
  if (lic?.status === "ACTIVE") {
    const flipped = await checkRemoteLicense(lic);
    if (flipped) lic = { ...lic, status: flipped.status };
  }
  if (lic && (lic.status === "EXPIRED" || lic.status === "SUSPENDED")) {
    return {
      blocked: true,
      message:
        lic.status === "SUSPENDED"
          ? "Installation suspended. Contact your system developer."
          : lic.activatedAt
            ? "License expired. Contact the developer to renew your subscription."
            : "Trial expired. Activate your license to continue.",
    };
  }
  return { blocked: false, message: "" };
}

export async function getSystemGate(): Promise<SystemGate> {
  const [locked, lockMessage, termsVersion, termsContent, termsAcceptedVersion] = await Promise.all([
    getSetting("system.locked"),
    getSetting("system.lockMessage"),
    getSetting("terms.version"),
    getSetting("terms.content"),
    getSetting("terms.acceptedVersion"),
  ]);

  // Per-school lock: the developer targets one school by its license code.
  const schoolId = await getThisSchoolId();
  const [schoolLocked, schoolLockMessage] = await Promise.all([
    getSetting(`lock.school.${schoolId}`),
    getSetting(`lock.school.${schoolId}.message`),
  ]);

  let licenseBlocked = false;
  let licenseMessage = "";
  try {
    const lic = await getLicenseStatus();
    licenseBlocked = lic.status === "EXPIRED" || lic.status === "SUSPENDED";
    licenseMessage = lic.message;
  } catch {
    // Never hard-block just because license evaluation failed (e.g. fresh DB).
  }

  const current = termsVersion?.trim() || "";
  const accepted = termsAcceptedVersion?.trim() || "";

  return {
    systemLocked: schoolLocked === "true" || locked === "true",
    lockMessage:
      (schoolLocked === "true" ? schoolLockMessage?.trim() || lockMessage?.trim() : lockMessage?.trim()) ||
      "This system has been locked by the vendor. Contact your system developer to resolve it.",
    schoolId,
    licenseBlocked,
    licenseMessage,
    termsVersion: current,
    termsContent: termsContent?.trim() || "",
    termsAcceptedVersion: accepted,
    needsTermsAcceptance: !!current && current !== accepted,
  };
}

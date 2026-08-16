import { ok, fail, handle } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

/**
 * The Developer-console guide chapter. It lives ONLY on the server (never in the
 * /admin/guide client bundle) and is served exclusively to the Developer role —
 * admins and everyone else get 403/401.
 */
const DEV_CONSOLE_CHAPTER = {
  id: "developer",
  title: "32 · Developer console (/dev) — licensing, terms, lock, releases (developer only)",
  intro:
    "This console is NOT part of the admin portal — it is a separate surface at /dev that ONLY the Developer (Shacomputec) can open. Here you sell and manage licenses, publish terms & releases, and can lock any installation that fails to pay or accept terms.",
  steps: [
    "Log in with the Developer account → go to /dev (or follow the “Back to admin portal” / developer links). Non-developers are redirected away server-side.",
    "Licensing → “Issue activation license key”: school code (e.g. MAIN), validity days, confirm with YOUR password → the key is minted (HMAC-signed) and shown once.",
    "Send the key to the school: Email, WhatsApp or SMS from the issuance history.",
    "When the school has paid, activate on their behalf: Licensing → “Activate this installation” → paste the issued key. ACTIVATION IS DEVELOPER-ONLY — no admin, teacher or other account can activate the system anywhere.",
    "Issuance history: every key with its nonce, SHA-256 hash, delivery status; re-send or revoke anytime. A revoked key can never be activated again — and if the school already activated it, their installation is suspended.",
    "Rotate signing secret: generate a fresh secret safely (old keys keep validating via LICENSE_SECRET_OLD); apply the .env block and restart.",
    "Sales config: Licensing → Sales configuration → trial days, activation fee, MoMo numbers.",
    "Terms & Lock → Lock ONE school by its license code: type (or click) the school's code (the SCHOOLID embedded in its key, e.g. ABC in GES-SMIS-ABC-365-…) and Lock. ONLY that school is blocked — paid schools keep working. The Locked schools list shows every locked code with one-click unlock. Use this when one buyer fails to pay or refuses terms.",
    "Schools tab → the district-style directory: every school you've sold to, with its license code, name, district/region, contact and payment status (Paid in full / Partial / Unpaid). Lock or unlock any school straight from the list — unpaid schools get a ready-made payment-due message. Schools are added automatically when you issue/send a key, or via the Register form. Set payment status with the dropdown; delete a row to remove it from the directory without touching its lock or license.",
    "Instant key delivery — now fully automatic: when a school pays online (Paystack), the system mints the license key from the school's own code on the spot (e.g. GES-SMIS-ABC-365-…), activates the license the instant payment is confirmed, and delivers the key INSTANTLY to the buyer's own email + phone (SMS/WhatsApp) — you never need to issue or send it manually. The auto-minted key is recorded in the issuance history, written to the audit log, and the school appears in the Schools directory automatically.",
    "Releases: publish software releases — they appear instantly in the school's in-app What's New changelog.",
    "Factory reset → hand a NEW buyer a clean install: open the Factory reset tab to see live counts of what will be kept (accounts & roles, school profile, curriculum, licensing records, vendor directory) versus cleared (students, staff, teachers, fees & expenses, assessments, reports, admissions, website content, operations, payroll, messages, notifications, audit logs). Type RESET to confirm — the wipe runs in one transaction and the license resets to a brand-new trial, so the new Super Admin / Admin receives a fresh system for first-time setup. Your developer records are never touched.",
    "Offline (air-gapped) schools: mint keys with node scripts/mint-key.mjs mint --school MAIN --days 365 — same format, validates on any server with the same secret.",
  ],
  notes: [
    "Every issuance is password-confirmed + rate-limited + audit-logged — a stolen session cannot mint keys.",
    "Locking is PER-SCHOOL: targeting code ABC never touches a different school (e.g. DEF) — even in the same deployment. The legacy global lock no longer exists in the console.",
    "The school admin NEVER sees this console and CANNOT activate — their “Activate the license” (the dashboard's Get-your-school-ready checklist step, or School & Settings → License & Activation → Pay / Activate) opens /admin/activate, which shows ONLY payment options (Paystack / direct MoMo) and where to receive the key; all API keys stay hidden. Activation, unlocking and license management happen only here in /dev.",
  ],
  img: {
    src: "/api/guide/assets/licensing.png",
    alt: "Licensing console",
    caption: "The developer's licensing console.",
  },
};

export const GET = handle(async () => {
  const user = await getCurrentUser();
  if (!user) return fail("Not authenticated", 401);
  if (user.role.name !== "developer") return fail("Forbidden", 403);
  return ok(DEV_CONSOLE_CHAPTER);
});

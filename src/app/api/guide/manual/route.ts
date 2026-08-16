import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { handle } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

/**
 * The full Developer-console chapter. It lives here (NOT in public/guide/ —
 * that file is web-served and its developer section is redacted) and is only
 * spliced back into the manual for the developer role.
 */
const DEV_CONSOLE_SECTION = `## 32 · Developer console — Licensing *(developer only)*

> Visible **only** to the Developer (Shacomputec). This is where licenses are sold and managed.

1. Log in with the Developer account → sidebar → **Developer → Licensing**.
2. **Issue activation license key**: school code (e.g. MAIN), validity days, confirm with your
   password → the HMAC-signed key is shown once.
3. **Send the key**: Email, WhatsApp or SMS — the school admin pastes it into the activation
   prompt on their license banner/modal.
4. **Issuance history**: nonce, SHA-256 hash, delivery status; re-send or revoke anytime. A
   revoked key can never be activated again — an install already using it is suspended.
5. **Rotate signing secret**: generate a fresh secret safely (old keys keep validating via
   \`LICENSE_SECRET_OLD\`); apply the .env block and restart.
6. **Sales config**: School & Settings → Licensing → trial days, activation fee, MoMo numbers.
7. **Offline (air-gapped) schools**: \`node scripts/mint-key.mjs mint --school MAIN --days 365\`
   — same format, validates on any server with the same secret.

**Note:** every issuance is password-confirmed, rate-limited and audit-logged. The school
admin never sees this console — they only activate keys and pay (online or by direct MoMo
transfer to your number).

![Licensing](/api/guide/assets/licensing.png)

`;

// The guide is for administrators and the Developer (matches /admin/guide).
const GUIDE_MIN_LEVEL = 800;

export const GET = handle(async () => {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  // Only administrator-level roles may download the manual at all.
  if (user.role.level < GUIDE_MIN_LEVEL) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  // The manual lives OUTSIDE public/ (in docs/guide-assets/) so it is never
  // web-served — the only download path is this gated route.
  const file = path.join(process.cwd(), "docs", "guide-assets", "USER-GUIDE.md");
  let md = fs.readFileSync(file, "utf8");

  // Developers get the full manual; everyone else gets the redacted public copy.
  if (user.role.name === "developer") {
    md = md.replace(/<!-- DEV-CONSOLE:START -->[\s\S]*?<!-- DEV-CONSOLE:END -->/, DEV_CONSOLE_SECTION);
  }

  return new NextResponse(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": 'attachment; filename="USER-GUIDE.md"',
      "Cache-Control": "private, no-store",
    },
  });
});

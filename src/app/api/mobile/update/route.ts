import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";

/**
 * Mobile (Android) update manifest. The Android app polls this endpoint from
 * its Settings screen, compares versions, and shows the release notes with a
 * download link for the published APK.
 *
 * The APK is published by copying it into public/mobile/ (see the packaging
 * step in .freebuff/run.md). Version + notes come from the same desktop
 * manifest (public/desktop/latest.json) so all three clients stay in lockstep.
 */
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;

  let version = "";
  let notes = "";
  const manifestFile = join(process.cwd(), "public", "desktop", "latest.json");
  if (existsSync(manifestFile)) {
    try {
      const m = JSON.parse(readFileSync(manifestFile, "utf8")) as {
        version?: string;
        notes?: string;
      };
      version = m.version ?? "";
      notes = m.notes ?? "";
    } catch {
      // corrupt manifest — still report the APK below
    }
  }

  let apkUrl = "";
  const apkDir = join(process.cwd(), "public", "mobile");
  if (existsSync(apkDir)) {
    const apks = readdirSync(apkDir)
      .filter((f) => f.endsWith(".apk"))
      .sort()
      .reverse(); // latest first by filename
    if (apks.length > 0) apkUrl = `${origin}/mobile/${apks[0]}`;
  }

  return NextResponse.json({ ok: true, data: { version, notes, apkUrl } });
}

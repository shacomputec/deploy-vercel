import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";

/**
 * Desktop auto-update manifest. Published by desktop/build-release.sh into
 * public/desktop/latest.json. The desktop app polls this endpoint on startup
 * and compares versions, then downloads the installer from the returned URL.
 */
export async function GET(req: Request) {
  const file = join(process.cwd(), "public", "desktop", "latest.json");
  if (!existsSync(file)) {
    return NextResponse.json({ ok: false, error: "No release published yet" }, { status: 404 });
  }
  try {
    const manifest = JSON.parse(readFileSync(file, "utf8")) as {
      version: string;
      notes?: string;
      url: string;
      sha256?: string;
      publishedAt?: string;
    };
    const origin = new URL(req.url).origin;
    return NextResponse.json({
      ok: true,
      data: {
        version: manifest.version,
        notes: manifest.notes ?? "",
        url: manifest.url.startsWith("http") ? manifest.url : `${origin}${manifest.url}`,
        sha256: manifest.sha256 ?? "",
        publishedAt: manifest.publishedAt ?? "",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Corrupt release manifest" }, { status: 500 });
  }
}

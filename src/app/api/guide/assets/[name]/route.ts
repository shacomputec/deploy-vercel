import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { handle } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

// Assets that only the developer may view (served from docs/guide-assets/,
// which is NOT in the public web root). Anything not listed here is rejected.
const DEV_ONLY = new Set(["licensing.png"]);

export const GET = handle(async (_req: Request, ctx: { params: Record<string, string> }) => {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const name = ctx.params.name as string;
  if (!/^[a-z0-9-]+\.png$/.test(name)) return new NextResponse("Not found", { status: 404 });
  if (DEV_ONLY.has(name) && user.role.name !== "developer") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const file = path.join(process.cwd(), "docs", "guide-assets", name);
  if (!fs.existsSync(file)) return new NextResponse("Not found", { status: 404 });

  const buf = fs.readFileSync(file);
  return new NextResponse(new Blob([buf]), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=3600",
    },
  });
});

import { NextResponse } from "next/server";
import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

/** Resolve the SQLite db path from DATABASE_URL ("file:./dev.db" → prisma/dev.db). */
function dbPath(): string {
  const url = process.env.DATABASE_URL || "file:./dev.db";
  const m = /file:(.+)$/.exec(url);
  const rel = m ? m[1] : "dev.db";
  // Prisma resolves relative to the prisma/ directory
  return join(process.cwd(), "prisma", rel.replace(/^\.\//, ""));
}

const SQLITE_MAGIC = Buffer.from("SQLite format 3\u0000");

/** Only top administrators may download the raw database (contains all PII). */
export const GET = handle(async (req) => {
  const user = await requirePerm("backup", "manage");
  const path = dbPath();
  if (!existsSync(path)) throw new ApiError("Database file not found", 404);

  const buf = readFileSync(path);
  await auditLog(user.id, "BACKUP", "backup", undefined, { bytes: buf.length });
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="ges-smis-backup-${stamp}.db"`,
      "Content-Length": String(buf.length),
    },
  });
});

/**
 * Restore from an uploaded SQLite backup. The current database is copied to a
 * timestamped .bak file first, then replaced. A server restart is recommended
 * afterwards so Prisma re-opens the new file cleanly.
 */
export const POST = handle(async (req) => {
  const user = await requirePerm("backup", "update");
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError("Backup file is required");
  if (!/\.(db|sqlite|sqlite3)$/i.test(file.name)) throw new ApiError("Only .db/.sqlite backup files are supported");
  if (file.size > 100_000_000) throw new ApiError("Backup too large (max 100MB)");

  const path = dbPath();
  if (!existsSync(path)) throw new ApiError("Database file not found", 404);

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length < SQLITE_MAGIC.length || !buf.subarray(0, SQLITE_MAGIC.length).equals(SQLITE_MAGIC)) {
    throw new ApiError("Not a valid SQLite database file — restore aborted.");
  }

  // Keep a copy of the current db before replacing
  const bakDir = join(process.cwd(), "prisma", "backups");
  if (!existsSync(bakDir)) mkdirSync(bakDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  copyFileSync(path, join(bakDir, `pre-restore-${stamp}.db`));

  writeFileSync(path, buf);
  await auditLog(user.id, "RESTORE", "backup", undefined, { bytes: buf.length });
  return NextResponse.json(
    { ok: true, data: { restored: true, note: "Database replaced. Restart the server to apply cleanly." } },
    { status: 201 }
  );
});

/** List stored backups in prisma/backups. */
export const PUT = handle(async (req) => {
  await requirePerm("backup", "manage");
  const dir = join(process.cwd(), "prisma", "backups");
  if (!existsSync(dir)) return ok([]);
  const { readdirSync, statSync } = await import("fs");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".db"))
    .map((f) => {
      const st = statSync(join(dir, f));
      return { name: f, size: st.size, mtime: st.mtime.toISOString() };
    })
    .sort((a, b) => b.mtime.localeCompare(a.mtime));
  return ok(files);
});

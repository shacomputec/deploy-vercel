import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

// ── Multi-user / multi-device concurrency (SQLite only) ─────────────────────
// The web, desktop and Android apps all share this one database, so several
// people can be working at the same moment (teachers entering scores while the
// office records payments). SQLite is tuned for that here:
//   • WAL journaling  → readers never block writers and vice-versa.
//   • busy_timeout    → a brief write collision waits (up to 8s) instead of
//                       failing with “database is locked”.
// These are SQLite-specific; Postgres (Vercel/Neon) needs none of this.
if (process.env.DATABASE_URL?.startsWith("file:")) {
  // `journal_mode = WAL` returns a result row, so it must go through
  // $queryRawUnsafe (executeRaw rejects statements that return rows).
  prisma
    .$queryRawUnsafe("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 8000;")
    .catch(() => {
      /* WAL is a persistent DB property — a later start can still apply it. */
    });
}

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

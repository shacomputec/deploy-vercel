#!/usr/bin/env node
// GES School MIS — two-way database mirror sync.
//
// Makes the local (offline, SQLite) database and the cloud (online, Postgres)
// database contain the SAME data. It is a full mirror, not a merge: import
// replaces the destination database with the snapshot.
//
// The script is generic — it walks Prisma's schema (dmmf) so it works with
// every model automatically, and it runs under EITHER Prisma client:
//   * the desktop bundle's SQLite client   (local/offline side)
//   * the cloud's Postgres client          (online side, e.g. deploy-vercel)
//
// Usage:
//   node scripts/sync-db.mjs export <file.json>
//       → dump every table (parents first) to <file.json>
//   node scripts/sync-db.mjs import <file.json> [--yes]
//       → REPLACE this database with the snapshot (wipes existing rows)
//
// Examples (from the machine that has both sides):
//   # online data → offline (so offline shows the same data as the website):
//   cd deploy-vercel && node scripts/sync-db.mjs export cloud.json
//   cd <server dir>  && node.exe scripts/sync-db.mjs import cloud.json --yes
//
//   # offline data → online (so the website shows what you entered offline):
//   cd <server dir>  && node.exe scripts/sync-db.mjs export local.json
//   cd deploy-vercel && node scripts/sync-db.mjs import local.json --yes
import { PrismaClient, Prisma } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

// ── .env loading (so DATABASE_URL etc. come from the folder we run in) ──────
try {
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (m && !(m[1] in process.env)) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  }
} catch {
  /* ignore */
}

// Transient/security tables that must never be mirrored between machines.
const EXCLUDE = new Set(["OtpRequest"]);

// Slow/remote databases (Neon cold starts) need a small pool + patient timeout.
let dbUrl = process.env.DATABASE_URL || "";
if (dbUrl.startsWith("postgres")) {
  dbUrl += (dbUrl.includes("?") ? "&" : "?") + "connection_limit=2&pool_timeout=60";
}
const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
const models = Prisma.dmmf.datamodel.models.filter((m) => !EXCLUDE.has(m.name));

// Retry transient connectivity failures (Neon cold starts are slow).
async function retry(fn, tries = 4) {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (err) {
      const msg = String(err?.message || err);
      const transient = /reach database|connection|timed out|pool|ECONN|ETIMEDOUT|locked|busy/i.test(msg);
      if (i >= tries || !transient) throw err;
      log(`  retry ${i}/${tries} after ${2 * i}s…`);
      await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
}
const camel = (s) => s[0].toLowerCase() + s.slice(1);

// Model metadata: scalar fields (incl. enums) and FK edges.
const meta = models.map((m) => ({
  name: m.name,
  key: camel(m.name),
  scalars: m.fields
    .filter((f) => !f.relationName && f.kind !== "unsupported")
    .map((f) => f.name),
  fks: m.fields
    .filter((f) => f.relationName && !f.isList && f.relationFromFields?.length)
    .map((f) => ({ field: f.name, target: f.type })),
}));
const byName = new Map(meta.map((m) => [m.name, m]));

// Deferred cycle FKs: if the schema ever gains an FK cycle, the closing edge
// (a nullable FK) would go here and be created as null, then filled in after
// the rest of the graph exists. The current schema is acyclic, so it's empty.
const DEFER_FKS = new Map();

// Parents-first topological order (cycle edges removed).
const order = [];
{
  const visited = new Set();
  const stack = new Set();
  const visit = (name) => {
    if (visited.has(name)) return;
    visited.add(name);
    stack.add(name);
    for (const e of byName.get(name).fks) {
      if (e.target === name || !byName.has(e.target)) continue;
      if (DEFER_FKS.get(name)?.has(e.field)) continue; // cycle edge → defer
      if (stack.has(e.target)) continue; // safety for any other cycle
      visit(e.target);
    }
    stack.delete(name);
    order.push(name);
  };
  for (const m of meta) visit(m.name);
}

const log = (...a) => console.log(`[sync-db]`, ...a);

function rowsByModel(snapshot) {
  const map = new Map();
  for (const name of order) {
    map.set(name, snapshot.models[name] ?? []);
  }
  return map;
}

// Resolve the SQLite database file for `file:` DATABASE_URLs (relative paths
// are resolved against the schema folder, like Prisma does).
function resolveDbFile() {
  const url = process.env.DATABASE_URL || "";
  if (!url.startsWith("file:")) return null;
  const rel = url.slice(5).split("?")[0].replace(/^\.\//, "");
  const schema = ["prisma/schema.prisma", "schema.prisma"]
    .map((p) => path.join(process.cwd(), p))
    .find((p) => fs.existsSync(p));
  if (!schema) return null;
  return path.resolve(path.dirname(schema), rel);
}

async function cmdExport(outFile) {
  log(`exporting ${order.length} models → ${outFile}`);
  const snapshot = { format: "ges-mis-sync-v1", exportedAt: new Date().toISOString(), models: {} };
  let total = 0;
  for (const m of meta) {
    const rows = await retry(() => prisma[m.key].findMany());
    snapshot.models[m.name] = rows.map((r) => {
      const o = {};
      for (const f of m.scalars) o[f] = r[f];
      return o;
    });
    total += rows.length;
    log(`  ${m.name}: ${rows.length} rows`);
  }
  fs.writeFileSync(outFile, JSON.stringify(snapshot, null, 0));
  log(`done — ${total} rows, ${(fs.statSync(outFile).size / 1024 / 1024).toFixed(2)} MB`);
}

async function cmdImport(inFile, yes) {
  let snapshot = JSON.parse(fs.readFileSync(inFile, "utf8"));
  // Accept both the raw snapshot and the API envelope { ok, data: snapshot }.
  if (snapshot.format !== "ges-mis-sync-v1" && snapshot.data?.format === "ges-mis-sync-v1") {
    snapshot = snapshot.data;
  }
  if (snapshot.format !== "ges-mis-sync-v1") {
    log("not a valid sync snapshot");
    process.exit(1);
  }
  const rows = rowsByModel(snapshot);
  let total = 0;
  for (const name of order) total += rows.get(name).length;
  log(`import: replace this database with ${total} rows across ${order.length} models`);
  if (!yes) {
    log("This WIPES the destination database. Re-run with --yes to proceed.");
    await prisma.$disconnect();
    process.exit(1);
  }

  // 0) Safety: back up the destination database file before touching it.
  const dbFile = resolveDbFile();
  if (dbFile && fs.existsSync(dbFile)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const bak = `${dbFile}.bak-${stamp}`;
    fs.copyFileSync(dbFile, bak);
    for (const suffix of ["-wal", "-shm"]) {
      if (fs.existsSync(dbFile + suffix)) fs.copyFileSync(dbFile + suffix, bak + suffix);
    }
    log(`backup saved: ${path.basename(bak)}`);
  } else if (dbFile) {
    log(`no existing database file at ${dbFile} — skipping backup`);
  }

  // 1) Delete phase — reverse order (children before parents).
  log("deleting existing rows (children first)…");
  for (const name of [...order].reverse()) {
    const m = byName.get(name);
    await retry(() => prisma[m.key].deleteMany());
  }
  log("  deleted.");

  // 2) Create phase — parents first; deferred cycle FKs are set to null now.
  log("inserting rows (parents first)…");
  for (const name of order) {
    const m = byName.get(name);
    const modelRows = rows.get(name);
    if (!modelRows.length) continue;
    const defer = DEFER_FKS.get(name) ?? new Set();
    const data = modelRows.map((r) => {
      const o = {};
      for (const f of m.scalars) o[f] = r[f] ?? null;
      for (const f of defer) o[f] = null; // fill in after the graph exists
      return o;
    });
    try {
      const created = await retry(() => prisma[m.key].createMany({ data, skipDuplicates: false }));
      log(`  ${name}: ${created.count} rows`);
    } catch (err) {
      // Fall back to per-row create (some engines/clients lack createMany).
      let n = 0;
      for (const row of data) {
        try {
          await retry(() => prisma[m.key].create({ data: row }));
          n++;
        } catch (e2) {
          log(`  ${name}: FAILED row ${row.id}: ${e2.message}`);
        }
      }
      log(`  ${name}: ${n}/${data.length} rows (per-row)`);
    }
  }

  // 3) Fill in the deferred cycle FKs.
  for (const [name, fields] of DEFER_FKS) {
    const m = byName.get(name);
    const modelRows = rows.get(name);
    if (!modelRows.length) continue;
    let n = 0;
    for (const r of modelRows) {
      const update = {};
      let has = false;
      for (const f of fields) {
        if (r[f] != null) {
          update[f] = r[f];
          has = true;
        }
      }
      if (!has) continue;
      try {
        await retry(() => prisma[m.key].update({ where: { id: r.id }, data: update }));
        n++;
      } catch (e) {
        log(`  ${name} ${r.id}: deferred FK update failed: ${e.message}`);
      }
    }
    log(`  deferred FKs on ${name}: ${n} updated`);
  }

  log(`done — database now mirrors ${total} rows.`);
}

const [cmd, file] = process.argv.slice(2);
const yes = process.argv.includes("--yes");

(async () => {
  try {
    if (cmd === "export" && file) await cmdExport(file);
    else if (cmd === "import" && file) await cmdImport(file, yes);
    else {
      log("usage: node scripts/sync-db.mjs export <file.json> | import <file.json> [--yes]");
      process.exitCode = 1;
    }
  } catch (err) {
    log("error:", err.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();

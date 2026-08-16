import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok, readJson } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

// Sections that can be archived & cleared for a new academic year.
// `tables` lists the Prisma models whose rows are snapshotted (children first).
const SECTIONS: Record<string, { label: string; tables: string[] }> = {
  assessments: { label: "Assessments & scores (incl. SBA sheet)", tables: ["SbaRecord", "AssessmentRecord", "Assessment"] },
  attendance: { label: "Attendance records", tables: ["AttendanceRecord"] },
  reports: { label: "Report cards & result access logs", tables: ["ResultAccessLog", "ReportCard"] },
  enrollments: { label: "Class enrollments", tables: ["Enrollment"] },
  fees: { label: "Fee payments", tables: ["FeePayment"] },
  expenses: { label: "Expenses", tables: ["Expense"] },
  otp: { label: "Result-checker OTP requests", tables: ["OtpRequest"] },
};

type Row = Record<string, unknown>;
const TABLE_ACCESS = new Set([
  "SbaRecord", "AssessmentRecord", "Assessment", "AttendanceRecord",
  "ResultAccessLog", "ReportCard", "Enrollment", "FeePayment", "Expense", "OtpRequest",
]);

// Loose typed handle to the generated Prisma models we archive (children first).
type ModelOps = {
  findMany: () => Promise<unknown>;
  count: () => Promise<number>;
  deleteMany: () => Promise<{ count: number }>;
};
const db = prisma as unknown as Record<string, ModelOps>;

function lowerFirst(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/** Load every row of the given tables as plain objects. */
async function snapshotTables(tables: string[]): Promise<Record<string, Row[]>> {
  const out: Record<string, Row[]> = {};
  for (const t of tables) {
    if (!TABLE_ACCESS.has(t)) throw new ApiError(`Unknown table ${t}`, 400);
    const rows = await db[lowerFirst(t)].findMany();
    out[t] = rows as Row[];
  }
  return out;
}

/** Count rows per section (live). */
async function sectionCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const [key, sec] of Object.entries(SECTIONS)) {
    counts[key] = await snapshotCount(sec.tables);
  }
  return counts;
}

async function snapshotCount(tables: string[]): Promise<number> {
  let n = 0;
  for (const t of tables) {
    n += await db[lowerFirst(t)].count();
  }
  return n;
}

/** Delete the rows of the given tables (children first — matching archive order). */
async function clearTables(tables: string[]): Promise<number> {
  let n = 0;
  for (const t of tables) {
    const res = await db[lowerFirst(t)].deleteMany();
    n += res.count;
  }
  return n;
}

export const GET = handle(async (req) => {
  // Any signed-in staff can see the overview (so teachers can run mass
  // promotion); archiving & clearing stay gated by the yearEnd permission.
  const { getCurrentUser } = await import("@/lib/auth");
  const me = await getCurrentUser();
  if (!me) throw { status: 401, message: "Authentication required" };
  const { hasPerm, getRolePerms } = await import("@/lib/permissions");
  const perms = await getRolePerms(me.roleId);
  const canManage = hasPerm(perms, "yearEnd", "create") || hasPerm(perms, "yearEnd", "delete");
  void req;
  const [counts, archives, students, classes] = await Promise.all([
    sectionCounts(),
    prisma.dataArchive.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { createdBy: { select: { fullName: true } } } }),
    prisma.student.count(),
    prisma.class.count(),
  ]);
  return ok({
    sections: Object.entries(SECTIONS).map(([key, sec]) => ({ key, label: sec.label, count: counts[key] ?? 0 })),
    archives: archives.map((a) => ({
      id: a.id, title: a.title, scope: a.scope, sections: JSON.parse(a.sections), counts: JSON.parse(a.counts),
      createdAt: a.createdAt, clearedAt: a.clearedAt, createdBy: a.createdBy?.fullName ?? null,
    })),
    totals: { students, classes },
    canManage,
  });
});

/** POST /api/year-end/archive  { title?, sections: string[] } → safe snapshot (no deletion). */
export const POST = handle(async (req) => {
  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const user = await requirePerm("yearEnd", action === "clear" ? "delete" : "create");
  const body = await readJson<{ title?: string; sections?: string[]; archiveId?: string }>(req);

  if (action === "clear") {
    if (!body.archiveId) throw new ApiError("archiveId is required — archive before clearing");
    const archive = await prisma.dataArchive.findUnique({ where: { id: body.archiveId } });
    if (!archive) throw new ApiError("Archive not found", 404);
    if (archive.clearedAt) {
      throw new ApiError("This archive has already been used to clear the system. Create a fresh archive for the new data.", 409);
    }
    const sections = JSON.parse(archive.sections) as string[];
    if (!sections.length) throw new ApiError("This archive has no sections to clear");

    // Atomic: every section's tables are cleared in ONE transaction so a
    // mid-failure can never leave some sections wiped and others untouched.
    let cleared = 0;
    await prisma.$transaction(async (tx) => {
      const txDb = tx as unknown as Record<string, ModelOps>;
      for (const key of sections) {
        const sec = SECTIONS[key];
        if (!sec) continue;
        for (const t of sec.tables) {
          const res = await txDb[lowerFirst(t)].deleteMany();
          cleared += res.count;
        }
      }
    });
    await prisma.dataArchive.update({ where: { id: archive.id }, data: { clearedAt: new Date() } });
    await auditLog(user.id, "DELETE", "year-end", archive.id, {
      action: "clear", title: archive.title, sections, rowsCleared: cleared,
    });
    return ok({ cleared, sections, archiveId: archive.id, message: `${cleared} record(s) cleared. Everything was safely archived in “${archive.title}”.` });
  }

  // archive
  const sections = (body.sections ?? []).filter((s) => SECTIONS[s]);
  if (!sections.length) throw new ApiError("Select at least one section to archive");
  const payload: Record<string, Row[]> = {};
  const counts: Record<string, number> = {};
  for (const key of sections) {
    const snap = await snapshotTables(SECTIONS[key].tables);
    payload[key] = Object.values(snap).flat();
    counts[key] = Object.values(snap).reduce((a, r) => a + r.length, 0);
  }
  const totalRows = Object.values(counts).reduce((a, b) => a + b, 0);
  const archive = await prisma.dataArchive.create({
    data: {
      title: body.title?.trim() || `Academic year archive — ${new Date().toLocaleDateString("en-GB")}`,
      scope: sections.length >= Object.keys(SECTIONS).length ? "FULL" : "SECTION",
      sections: JSON.stringify(sections),
      counts: JSON.stringify(counts),
      payload: JSON.stringify({ archivedAt: new Date().toISOString(), sections, rows: payload }),
      createdById: user.id,
    },
  });
  await auditLog(user.id, "CREATE", "year-end", archive.id, {
    action: "archive", title: archive.title, sections, rows: totalRows,
  });
  return ok({ archiveId: archive.id, title: archive.title, sections, counts, rows: totalRows });
});

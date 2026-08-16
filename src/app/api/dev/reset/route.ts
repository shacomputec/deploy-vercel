import { prisma } from "@/lib/prisma";
import { handle, ApiError, ok, readJson } from "@/lib/api";
import { auditLog } from "@/lib/audit";

/**
 * FACTORY RESET (developer-only) — hands a buyer a clean, fresh system.
 * ---------------------------------------------------------------------
 * GET  → what will be kept / cleared, with live row counts.
 * POST → wipes every school-data table (one transaction) and resets the
 *        license to a brand-new trial. Everything the NEW buyer needs to
 *        start fresh is untouched:
 *
 *   KEPT   users & roles, school profile, curriculum (levels, classes,
 *          subjects, programmes, grading scales), academic years & terms,
 *          fee items, salary scales, licensing records, vendor directory,
 *          the developer's own settings.
 *
 *   CLEARED  students, parents, teachers, staff, enrollments, attendance,
 *          assessments & SBA, mocks, report cards, promotions, fees &
 *          expenses, payments, admissions, website content, library,
 *          hostel, transport, clinic, discipline, clubs, inventory,
 *          payroll, messages, notifications, audit logs, suggestions.
 */
const WIPE_ORDER = [
  // admissions (children first)
  "AdmissionDocument",
  "AdmissionApplication",
  // academics — children first
  "SbaRecord",
  "MockScore",
  "MockExam",
  "AssessmentRecord",
  "Assessment",
  "ResultAccessLog",
  "ReportCard",
  "Promotion",
  "AttendanceRecord",
  "Enrollment",
  "StudentParent",
  // people
  "OtpRequest",
  "FeePayment",
  "PaymentGatewayTx",
  "TeacherDocument",
  "Teacher",
  "StaffLeave",
  "Staff",
  "Parent",
  "Student",
  // teaching support
  "TimetableEntry",
  "Homework",
  "LessonNote",
  "ExamTimetable",
  "MessageLog",
  // website content
  "NewsItem",
  "EventItem",
  "Announcement",
  "GalleryImage",
  "VideoItem",
  "DownloadFile",
  "ContactMessage",
  // operations
  "LibraryLoan",
  "LibraryBook",
  "HostelAllocation",
  "HostelRoom",
  "TransportRider",
  "TransportRoute",
  "ClinicVisit",
  "DisciplineCase",
  "ClubMember",
  "Club",
  "StockMovement",
  "InventoryItem",
  "Supplier",
  // finance & misc
  "PayrollEntry",
  "PayrollRun",
  "Expense",
  "DataArchive",
  "Suggestion",
  "Notification",
  "AuditLog",
];

const KEEP_LABELS = [
  "User accounts & roles (super admin, admin, staff, developer)",
  "School profile & system settings",
  "Curriculum — levels, classes, subjects, programmes, grading scales",
  "Academic years & terms",
  "Fee items & salary scales",
  "Licensing records & the vendor school directory (your records stay)",
];

type ModelOps = { count: () => Promise<number>; deleteMany: () => Promise<{ count: number }> };
const db = prisma as unknown as Record<string, ModelOps>;

function lowerFirst(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

async function requireDeveloper() {
  const { getCurrentUser } = await import("@/lib/auth");
  const user = await getCurrentUser();
  if (!user) throw { status: 401, message: "Authentication required" };
  if (user.role.name !== "developer") {
    throw { status: 403, message: "Only the developer can reset the system" };
  }
  return user;
}

export const GET = handle(async () => {
  await requireDeveloper();
  const counts: Record<string, number> = {};
  for (const t of WIPE_ORDER) counts[t] = await db[lowerFirst(t)].count();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const kept = {
    users: await prisma.user.count(),
    classes: await prisma.class.count(),
    levels: await prisma.level.count(),
    issuances: await prisma.licenseIssuance.count(),
    vendorSchools: await prisma.vendorSchool.count(),
  };
  const license = await prisma.license.findFirst({ select: { status: true } });
  return ok({ counts, total, kept, licenseStatus: license?.status ?? "NONE" });
});

export const POST = handle(async (req) => {
  const user = await requireDeveloper();
  const body = await readJson<{ confirm?: string }>(req);
  if ((body.confirm ?? "").trim().toUpperCase() !== "RESET") {
    throw new ApiError("Type RESET to confirm the factory reset", 422);
  }

  let cleared = 0;
  await prisma.$transaction(async (tx) => {
    const txDb = tx as unknown as Record<string, ModelOps>;
    for (const t of WIPE_ORDER) {
      const res = await txDb[lowerFirst(t)].deleteMany();
      cleared += res.count;
    }
  });

  // Fresh trial for the new buyer (the developer's licensing records are kept).
  const existing = await prisma.license.findFirst();
  if (existing) {
    await prisma.license.update({
      where: { id: existing.id },
      data: {
        status: "TRIAL",
        trialStartedAt: new Date(),
        trialEndsAt: null,
        activatedAt: null,
        lastSeenAt: null,
        rollbackSuspected: false,
        notes: "Factory reset — handed to a new buyer as a fresh install",
      },
    });
  } else {
    await prisma.license.create({
      data: { licenseKey: `RESET-${Date.now()}`, status: "TRIAL", trialStartedAt: new Date() },
    });
  }

  await auditLog(user.id, "DELETE", "system-reset", undefined, {
    rowsCleared: cleared,
    kept: "users, roles, school, curriculum, licensing",
  });

  return ok({
    cleared,
    message: `Factory reset complete — ${cleared} record(s) cleared. The system is now a fresh install for the new buyer: license reset to a new trial, all school data gone.`,
  });
});

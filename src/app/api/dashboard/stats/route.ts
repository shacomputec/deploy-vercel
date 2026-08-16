import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, ok } from "@/lib/api";
import { requirePerm } from "@/lib/permissions";

// Rough device classification from the User-Agent — web / desktop / Android.
function detectDevice(ua: string | null): "Web" | "Desktop" | "Mobile" {
  if (!ua) return "Web";
  if (ua.includes("GES-SMIS-Desktop")) return "Desktop";
  if (ua.includes("GES-SMIS-Mobile") || ua.includes("Android") || ua.includes("okhttp") || ua.includes("Expo")) return "Mobile";
  return "Web";
}

export const GET = handle(async (req) => {
  const user = await requirePerm("dashboard", "read");
  // Heartbeat: mark this user “online now” (the panel shows the last 5 min).
  const ua = req.headers.get("user-agent") ?? "";
  await prisma.user
    .update({ where: { id: user.id }, data: { lastSeenAt: new Date(), lastDevice: detectDevice(ua) } })
    .catch(() => {});

  const currentYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
  const currentTerm = await prisma.term.findFirst({ where: { isCurrent: true } });

  const [
    students, activeStudents, teachers, staff, classes, parents,
    feeTotal, expenseTotal, paymentCount,
    attendanceStats, genderSplit, reportsPublished, admissionsPending,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.student.count({ where: { status: "ACTIVE" } }),
    prisma.teacher.count({ where: { status: "ACTIVE" } }),
    prisma.staff.count({ where: { status: "ACTIVE" } }),
    prisma.class.count(),
    prisma.parent.count(),
    prisma.feePayment.aggregate({ _sum: { amount: true } }),
    prisma.expense.aggregate({ _sum: { amount: true } }),
    prisma.feePayment.count(),
    prisma.attendanceRecord.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: currentTerm ? { date: { gte: currentTerm.startDate } } : undefined,
    }),
    prisma.student.groupBy({ by: ["gender"], _count: { _all: true } }),
    prisma.reportCard.count({ where: { published: true } }),
    prisma.admissionApplication.count({ where: { status: "PENDING" } }),
  ]);

  const attendanceTotal = attendanceStats.reduce((a, r) => a + r._count._all, 0);
  const attendanceRate = attendanceTotal
    ? Math.round(
        (attendanceStats
          .filter((r) => r.status === "PRESENT" || r.status === "LATE")
          .reduce((a, r) => a + r._count._all, 0) /
          attendanceTotal) *
          100
      )
    : 0;

  const recent = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 12,
    include: { user: { select: { fullName: true } } },
  });

  // Who's online now — staff/portals that touched the system in the last 5 min.
  const cutoff = new Date(Date.now() - 5 * 60 * 1000);
  const activeUsers = await prisma.user.findMany({
    where: { lastSeenAt: { gte: cutoff }, status: "ACTIVE" },
    orderBy: { lastSeenAt: "desc" },
    take: 15,
    include: { role: { select: { displayName: true } } },
  });
  const me = detectDevice(ua);

  // First-run readiness: what is still missing for the school to go live?
  const [school, settings, license] = await Promise.all([
    prisma.school.findUnique({ where: { id: "main" } }),
    prisma.setting.findMany({
      where: { key: { in: ["payments.momo.enabled", "payments.paystack.enabled"] } },
    }),
    prisma.license.findFirst({ where: { status: "ACTIVE" } }),
  ]);
  const settingMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  const enabled = (v: string | undefined | null) => !!v && v !== "" && v !== "false" && v !== "0";

  return ok({
    online: {
      me: { name: user.fullName, role: user.role.displayName, device: detectDevice(ua) },
      users: activeUsers.map((u) => ({
        name: u.fullName,
        role: u.role.displayName,
        device: u.lastDevice ?? "Web",
        lastSeenAt: u.lastSeenAt,
      })),
    },
    setup: {
      schoolProfile: !!(school?.name && school.name !== "My School"),
      hasStaff: teachers + staff > 0,
      hasStudents: students > 0,
      payments: enabled(settingMap["payments.momo.enabled"]) || enabled(settingMap["payments.paystack.enabled"]),
      // License state is strictly developer-only — staff never learn it.
      licenseActive: user.role.name === "developer" && !!license,
    },
    user: { name: user.fullName, role: user.role.displayName, roleKey: user.role.name, isDeveloper: user.role.name === "developer" },
    counts: {
      students: activeStudents,
      totalStudents: students,
      teachers,
      staff,
      classes,
      parents,
      admissionsPending,
      reportsPublished,
    },
    finance: {
      collected: feeTotal._sum.amount ?? 0,
      spent: expenseTotal._sum.amount ?? 0,
      paymentCount,
    },
    attendanceRate,
    genderSplit: Object.fromEntries(genderSplit.map((g) => [g.gender, g._count._all])),
    currentYear: currentYear?.name ?? null,
    currentTerm: currentTerm?.name ?? null,
    recent,
  });
});

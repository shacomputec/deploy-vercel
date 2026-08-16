"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, ClipboardCheck, FileText,
  Wallet, Award, CalendarCheck, Newspaper, Inbox, UserCog, ShieldCheck,
  Settings, ScrollText, Menu, X, LogOut, School as SchoolIcon, Stethoscope,
  TrendingUp, BookMarked, CalendarRange, Library, BedDouble, Bus, HeartPulse,
  Scale, Trophy, MessageSquare, Receipt, DatabaseBackup, Award as CertificateIcon,
  Send, Banknote, Building2, Package, CreditCard, BookOpenText, LayoutGrid, Sparkles,
  School as SchoolCap, Search, GraduationCap as CapIcon, Landmark, CalendarClock, CalendarOff, IdCard,
  AlarmClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/site/logo";
import { Avatar } from "@/components/ui/avatar";
import { SuggestionBox } from "@/components/admin/suggestion-box";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { NotificationBell } from "@/components/admin/notification-bell";
import { includesBasic, includesSHS, type SchoolType } from "@/lib/school-type";
import { useLanguage } from "@/lib/i18n/client";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { section: "People" },
  { href: "/admin/students", label: "Students", icon: Users },
  { href: "/admin/parents", label: "Parents", icon: GraduationCap },
  { href: "/admin/teachers", label: "Teachers", icon: BookOpen },
  { href: "/admin/staff", label: "Staff", icon: Stethoscope },
  { section: "Academics" },
  { href: "/admin/classes", label: "Classes & Subjects", icon: SchoolIcon },
  { href: "/admin/programmes", label: "SHS Programmes & Courses", icon: SchoolCap, shsOnly: true },
  { href: "/admin/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/admin/assessments", label: "Assessments", icon: ClipboardCheck },
  { href: "/admin/reports", label: "Report Cards", icon: FileText },
  { href: "/admin/master-sheet", label: "Master & Broad Sheet", icon: LayoutGrid },
  { href: "/admin/promotions", label: "Promotion", icon: TrendingUp },
  { href: "/admin/year-end", label: "Year End & Rollover", icon: CalendarRange },
  { href: "/admin/timetable", label: "Timetable", icon: CalendarRange },
  { href: "/admin/remedial", label: "Remedial Classes", icon: AlarmClock },
  { href: "/admin/exams", label: "Exam Timetable", icon: CalendarClock },
  { href: "/admin/teacher-tools", label: "Teacher Tools", icon: BookMarked },
  { href: "/admin/certificates", label: "Certificates", icon: CertificateIcon },
  { href: "/admin/id-cards", label: "ID Cards", icon: IdCard },
  { section: "Finance" },
  { href: "/admin/fees", label: "Fees & Payments", icon: Wallet },
  { href: "/admin/payments", label: "Online Payments", icon: CreditCard },
  { href: "/admin/expenses", label: "Expenses", icon: Receipt },
  { href: "/admin/payroll", label: "Payroll & HR", icon: Banknote },
  { href: "/admin/leaves", label: "Staff Leave", icon: CalendarOff },
  { section: "Results & Admissions" },
  { href: "/admin/results", label: "Result Checker", icon: Award },
  { href: "/admin/mocks", label: "Mock Analysis (BECE/WASSCE)", icon: Sparkles },
  { href: "/admin/admissions", label: "Applications", icon: Inbox },
  { section: "Operations" },
  { href: "/admin/library", label: "Library", icon: Library },
  { href: "/admin/hostel", label: "Hostel", icon: BedDouble },
  { href: "/admin/transport", label: "Transport", icon: Bus },
  { href: "/admin/clinic", label: "Sick Bay", icon: HeartPulse },
  { href: "/admin/discipline", label: "Discipline", icon: Scale },
  { href: "/admin/clubs", label: "Clubs & Sports", icon: Trophy },
  { href: "/admin/inventory", label: "Inventory & Stores", icon: Package },
  { section: "Communications" },
  { href: "/admin/messaging", label: "Messaging Center", icon: MessageSquare },
  { section: "Website" },
  { href: "/admin/content", label: "Content", icon: Newspaper },
  { section: "System" },
  // The System section is SUPER-ADMIN territory: users, roles, settings,
  // schools, backup and audit are only shown to the super-admin (and the
  // developer). Ordinary admins/headteachers run the school — they don't see
  // these, matching what the login page tells each role it can access.
  { href: "/admin/users", label: "Users", icon: UserCog, superOnly: true },
  { href: "/admin/roles", label: "Roles & Permissions", icon: ShieldCheck, superOnly: true },
  // License & Activation is STRICTLY developer-only — it lives in the
  // Developer Console (/dev) and is never shown in the admin portal menu.
  { href: "/admin/settings", label: "School & Settings", icon: Settings, superOnly: true },
  { href: "/admin/schools", label: "Schools", icon: Building2, superOnly: true },
  { href: "/admin/backup", label: "Backup & Restore", icon: DatabaseBackup, superOnly: true },
  { href: "/admin/audit", label: "Audit Logs", icon: ScrollText, superOnly: true },
  { section: "Help" },
  { href: "/admin/whats-new", label: "What's New", icon: Sparkles, dot: true },
  { href: "/admin/guide", label: "User Guide", icon: BookOpenText },
  { href: "/admin?tour=1", label: "Start Tour", icon: Sparkles },
  // The Developer console lives OUTSIDE the admin portal at /dev — it is not a
  // menu item here for anyone, not even the Developer (the server gates /dev).
];

// Developer-only navigation items are filtered out for every other role, and
// SHS-only items (e.g. Programmes) are hidden when the school runs no SHS.
// System items (users/roles/settings/schools/backup/audit) are super-admin
// territory — ordinary admin/headteacher/staff never see them.
function visibleNav(isDeveloper: boolean, isSuperAdmin: boolean, schoolType: SchoolType) {
  return NAV.filter(
    (item) =>
      (!("devOnly" in item && item.devOnly) || isDeveloper) &&
      (!("superOnly" in item && item.superOnly) || isSuperAdmin) &&
      (!("shsOnly" in item && item.shsOnly) || includesSHS(schoolType))
  );
}

// Filters the nav by the search term — sections with no matching items vanish.
function filterNav(items: ReturnType<typeof visibleNav>, q: string) {
  if (!q.trim()) return items;
  const t = q.trim().toLowerCase();
  const out: typeof items = [];
  let pendingSection: (typeof items)[number] | null = null;
  for (const item of items) {
    if ("section" in item) {
      pendingSection = item;
      continue;
    }
    if (item.label.toLowerCase().includes(t)) {
      if (pendingSection) {
        out.push(pendingSection);
        pendingSection = null;
      }
      out.push(item);
    }
  }
  return out;
}

export function AdminShell({
  user,
  schoolType,
  children,
}: {
  user: { name: string; email: string; role: string; roleName: string };
  schoolType: SchoolType;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const [navQuery, setNavQuery] = useState("");
  // A small amber dot on “What's New” until the latest release has been seen
  // (same localStorage key the dashboard banner uses to dismiss itself).
  const [newVersionDot, setNewVersionDot] = useState(false);
  useEffect(() => {
    try {
      setNewVersionDot(localStorage.getItem("whatsnew-dismissed") !== "v1.2.1");
    } catch {
      setNewVersionDot(false);
    }
  }, []);
  const isDeveloper = user.roleName === "developer";
  const isSuperAdmin = isDeveloper || user.roleName === "super_admin";
  const { t } = useLanguage();
  const modeLabel = schoolType === "BASIC" ? "Basic School" : schoolType === "SHS" ? "SHS" : "Basic + SHS";
  const ModeIcon = schoolType === "BASIC" ? CapIcon : schoolType === "SHS" ? Landmark : Landmark;
  const navItems = filterNav(visibleNav(isDeveloper, isSuperAdmin, schoolType), navQuery);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const NavList = (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
      {navItems.length === 0 && (
        <p className="px-3 py-8 text-center text-xs text-slate-500">No menu items match “{navQuery}”</p>
      )}
      {navItems.map((item, i) =>
        "section" in item ? (
          <div key={i} className="px-3 pb-1 pt-5">
            <div className="flex items-center gap-2">
              <span className="h-px w-3 bg-gradient-to-r from-primary/70 to-transparent" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{item.section}</p>
            </div>
          </div>
        ) : (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setDrawer(false)}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150",
              item.exact ? pathname === item.href : pathname.startsWith(item.href)
                ? "bg-gradient-to-r from-primary to-primary-deep text-white shadow-lg shadow-primary/25"
                : "text-slate-300 hover:bg-white/5 hover:text-white"
            )}
          >
            <span
              className={cn(
                "absolute left-0 h-5 w-1 rounded-r-full bg-white transition-all duration-150",
                item.exact ? pathname === item.href : pathname.startsWith(item.href) ? "opacity-100" : "opacity-0 group-hover:opacity-40"
              )}
            />
            <item.icon className={cn("h-[18px] w-[18px] shrink-0 transition", item.exact ? pathname === item.href : pathname.startsWith(item.href) ? "" : "text-slate-400 group-hover:text-white")} />
            {item.label}
            {"dot" in item && item.dot && newVersionDot && (
              <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-amber-400 ring-2 ring-amber-400/30" title="New update — see What's New" />
            )}
          </Link>
        )
      )}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* desktop sidebar */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-slate-950 lg:flex">
        <div className="relative flex h-16 items-center border-b border-white/10 px-4">
          <Link href="/" className="[&_span]:text-white">
            <Logo school={null} />
          </Link>
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
        <div className="border-b border-white/10 px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={navQuery}
              onChange={(e) => setNavQuery(e.target.value)}
              placeholder="Search menu…"
              className="w-full rounded-lg border border-white/10 bg-white/5 py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
        {NavList}
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 px-2 py-2">
            <Avatar name={user.name} className="h-9 w-9 ring-2 ring-primary/40" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{user.name}</p>
              <p className="truncate text-[11px] text-slate-400">{user.role}</p>
            </div>
            <button onClick={logout} className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white" title="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/10 px-2 py-1.5">
            <ModeIcon className="h-3.5 w-3.5 text-primary-soft" />
            <span className="text-[11px] font-semibold text-primary-soft">{modeLabel} engine</span>
          </div>
        </div>
      </aside>

      {/* mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-slate-950 shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
              <Logo school={null} />
              <button onClick={() => setDrawer(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="border-b border-white/10 px-4 py-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={navQuery}
                  onChange={(e) => setNavQuery(e.target.value)}
                  placeholder="Search menu…"
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            {NavList}
          </aside>
        </div>
      )}

      {/* main */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="no-print sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur-xl sm:px-6">
          <button onClick={() => setDrawer(true)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Menu">
            <Menu className="h-5 w-5" />
          </button>
          <p className="hidden text-sm text-slate-400 lg:block">
            {t("admin.systemTitle")}
            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">{modeLabel}</span>
          </p>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <NotificationBell />
            {/* The UI-theme panel is developer-mode only — the developer can
                switch Light / Dark / Gold; the school staff keep the default. */}
            {isDeveloper && <ThemeSwitcher />}
            <Link href="/" className="btn-outline btn-sm">
              View website
            </Link>
          </div>
        </header>
        {/* The license banner/modal used to live here — they are now gone from
            every portal. License & Activation exists ONLY in the Developer
            Console (/dev), which no other account can open. */}
        <main key={pathname} className="flex-1 animate-fade-up p-4 sm:p-6 lg:p-8">{children}</main>
        <SuggestionBox />
      </div>
    </div>
  );
}

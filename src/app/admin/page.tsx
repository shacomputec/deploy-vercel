"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Users, BookOpen, Stethoscope, Wallet, CalendarCheck, Award, Inbox,
  TrendingUp, ArrowRight, BookOpenText, MessageSquare, LayoutGrid, Check,
  CheckCircle2, School, CreditCard, KeyRound, Building2, UserPlus, Circle,
  Sparkles, X, Monitor, MonitorSmartphone, Smartphone, Radio, CalendarDays,
  ClipboardList,
} from "lucide-react";
import { api } from "@/lib/client";
import { ghs, fmtDateTime } from "@/lib/utils";
import { PageHeader, StatCard } from "@/components/admin/page-header";
import { FirstRunTour } from "@/components/admin/first-run-tour";
import { ToursPanel } from "@/components/admin/tours-panel";

type Stats = {
  user: { name: string; role: string; roleKey?: string; isDeveloper?: boolean };
  online: { me: { name: string; role: string; device: string }; users: { name: string; role: string; device: string; lastSeenAt: string }[] };
  setup: { schoolProfile: boolean; hasStaff: boolean; hasStudents: boolean; payments: boolean; licenseActive: boolean };
  counts: { students: number; totalStudents: number; teachers: number; staff: number; classes: number; parents: number; admissionsPending: number; reportsPublished: number };
  finance: { collected: number; spent: number; paymentCount: number };
  attendanceRate: number;
  genderSplit: Record<string, number>;
  currentYear: string | null;
  currentTerm: string | null;
  recent: { id: string; action: string; entity: string; createdAt: string; user: { fullName: string } | null }[];
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    api<Stats>("/api/dashboard/stats")
      .then(setStats)
      .catch((e) => setError(e.message));
    // Keep the “Live Sync” panel fresh — the heartbeat runs on every poll, so
    // the dashboard reflects who is using the system right now, on any device.
    const t = setInterval(() => {
      api<Stats>("/api/dashboard/stats").then(setStats).catch(() => {});
    }, 15_000);
    return () => clearInterval(t);
  }, []);

  // One dismissible “What's New” banner per release (persisted per browser).
  useEffect(() => {
    try {
      setShowWhatsNew(localStorage.getItem("whatsnew-dismissed") !== "v1.2.1");
    } catch {
      setShowWhatsNew(true);
    }
  }, []);

  const dismissWhatsNew = () => {
    try {
      localStorage.setItem("whatsnew-dismissed", "v1.2.1");
    } catch { /* ignore */ }
    setShowWhatsNew(false);
  };

  // Sidebar "Start Tour" → /admin?tour=1: once the dashboard (and therefore the
  // tour component) is mounted, replay the tour and clean the URL so a reload
  // does not re-trigger it.
  useEffect(() => {
    if (stats && searchParams.get("tour") === "1") {
      const t = setTimeout(() => {
        window.dispatchEvent(new CustomEvent("smis:replay-tour"));
        const url = new URL(window.location.href);
        url.searchParams.delete("tour");
        window.history.replaceState({}, "", url);
      }, 350);
      return () => clearTimeout(t);
    }
  }, [stats, searchParams]);

  if (error) return <p className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700">{error}</p>;
  if (!stats) return <DashboardSkeleton />;

  const totalG = (stats.genderSplit.MALE ?? 0) + (stats.genderSplit.FEMALE ?? 0);
  const malePct = totalG ? Math.round(((stats.genderSplit.MALE ?? 0) / totalG) * 100) : 0;
  const femalePct = 100 - malePct;
  const publishedPct = stats.counts.students ? Math.min(100, Math.round((stats.counts.reportsPublished / stats.counts.students) * 100)) : 0;

  const quickActions = [
    { href: "/admin/students", label: "Add Student", icon: Users, tone: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20" },
    { href: "/admin/assessments", label: "Enter Scores", icon: BookOpen, tone: "bg-sky-500/10 text-sky-600 ring-sky-500/20" },
    { href: "/admin/year-end", label: "Year End & Rollover", icon: TrendingUp, tone: "bg-violet-500/10 text-violet-600 ring-violet-500/20" },
    { href: "/admin/reports", label: "Report Cards", icon: Award, tone: "bg-amber-500/10 text-amber-600 ring-amber-500/20" },
    { href: "/admin/fees", label: "Record Payment", icon: Wallet, tone: "bg-rose-500/10 text-rose-600 ring-rose-500/20" },
    { href: "/admin/messaging", label: "Messaging Center", icon: MessageSquare, tone: "bg-indigo-500/10 text-indigo-600 ring-indigo-500/20" },
    { href: "/admin/master-sheet", label: "Master & Broad Sheet", icon: LayoutGrid, tone: "bg-teal-500/10 text-teal-600 ring-teal-500/20" },
    { href: "/admin/guide", label: "User Guide", icon: BookOpenText, tone: "bg-slate-500/10 text-slate-600 ring-slate-500/20" },
    { href: "/api/guide/buyer", label: "Buyer's Checklist", icon: ClipboardList, tone: "bg-amber-500/10 text-amber-600 ring-amber-500/20", external: true },
  ];

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${stats.user.name.split(" ")[0]} 👋`}
        subtitle={`${stats.currentYear ?? "—"} · ${stats.currentTerm ?? "—"} · ${stats.user.role}`}
        action={
          <Link href="/admin/reports" className="btn-primary btn-sm">
            <Award className="h-4 w-4" /> Generate Report Cards
          </Link>
        }
      />

      {/* Today bar — the academic moment at a glance */}
      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-slate-200/80 bg-white/80 px-5 py-3 shadow-sm backdrop-blur">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
          <CalendarDays className="h-4 w-4 text-primary" />
          {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </span>
        <span className="hidden h-4 w-px bg-slate-200 sm:block" />
        <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
          Academic year: {stats.currentYear ?? "—"}
        </span>
        <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-amber-700">
          {stats.currentTerm ?? "—"} term
        </span>
        <span className="ml-auto hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200 md:inline-flex">
          Signed in as {stats.user.role}
        </span>
      </div>

      {/* Live multi-device sync strip — one shared database across every client */}
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-slate-900 px-5 py-4 text-white shadow-lift">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" aria-hidden />
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-emerald-500/15 blur-3xl" aria-hidden />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400" />
          </span>
          <span className="text-sm font-bold tracking-wide">One live database</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 ring-1 ring-white/15"><Monitor className="h-3.5 w-3.5 text-emerald-300" /> Website</span>
          <span className="text-slate-500">+</span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 ring-1 ring-white/15"><MonitorSmartphone className="h-3.5 w-3.5 text-emerald-300" /> Windows app</span>
          <span className="text-slate-500">+</span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 ring-1 ring-white/15"><Smartphone className="h-3.5 w-3.5 text-emerald-300" /> Android app</span>
        </div>
        <p className="min-w-[220px] flex-1 text-xs text-slate-400">
          Everyone works on the same data at the same time — a score saved on the phone appears on the desktop instantly.
        </p>
        </div>
      </div>

      {showWhatsNew && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-primary/25 bg-gradient-to-r from-primary-soft/70 via-white to-amber-50 px-5 py-4 shadow-sm">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-emerald-600 text-white shadow-sm">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">What's new in this update</p>
            <p className="text-xs text-slate-500">AI report-card comments, live multi-device sync, edit-conflict protection and 3 UI themes.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/admin/whats-new" className="btn-primary btn-sm">See what's new</Link>
            <button onClick={dismissWhatsNew} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Dismiss" title="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <SetupChecklist setup={stats.setup} />
      <FirstRunTour setup={stats.setup} roleKey={stats.user.roleKey} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Students" value={stats.counts.students} icon={Users} tone="emerald" hint={`${stats.counts.totalStudents} total records`} />
        <StatCard label="Teachers" value={stats.counts.teachers} icon={BookOpen} tone="sky" hint={`${stats.counts.classes} classes`} />
        <StatCard label="Support Staff" value={stats.counts.staff} icon={Stethoscope} tone="violet" hint={`${stats.counts.parents} parents`} />
        <StatCard label="Fees Collected" value={ghs(stats.finance.collected)} icon={Wallet} tone="amber" hint={`${stats.finance.paymentCount} payments · ${ghs(stats.finance.spent)} expenses`} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Attendance Rate (Term)" value={`${stats.attendanceRate}%`} icon={CalendarCheck} tone="emerald" progress={stats.attendanceRate} />
        <StatCard label="Published Reports" value={stats.counts.reportsPublished} icon={Award} tone="sky" hint={`${publishedPct}% of active students`} progress={publishedPct} />
        <StatCard label="Pending Admissions" value={stats.counts.admissionsPending} icon={Inbox} tone="amber" hint="awaiting review" />
        <StatCard
          label="Gender Split"
          value={`${malePct} : ${femalePct}`}
          icon={TrendingUp}
          tone="violet"
          hint={`${stats.genderSplit.MALE ?? 0} male · ${stats.genderSplit.FEMALE ?? 0} female`}
          progress={malePct}
          progressClass="bg-gradient-to-r from-sky-500 via-emerald-500 to-violet-500"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="card">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-semibold text-slate-900">Recent Activity</h3>
          </div>
          {stats.recent.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <TrendingUp className="h-5 w-5" />
              </div>
              <p className="mt-3 text-sm font-medium text-slate-600">No activity yet</p>
              <p className="mt-1 text-xs text-slate-400">Actions across the system will appear here.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {stats.recent.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-slate-50/60">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-700">
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-600">{r.action}</span>{" "}
                      {r.entity}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">by {r.user?.fullName ?? "system"}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">{fmtDateTime(r.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
              <h3 className="font-semibold text-slate-900">Live Sync — who's online</h3>
              <span className="ml-auto text-[11px] font-semibold uppercase tracking-wide text-emerald-600">{stats.online.users.length + 1} live</span>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">Web, desktop and Android share one live database — updates every 15s.</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(() => {
                const all = [stats.online.me, ...stats.online.users.filter((u) => u.name !== stats.online.me.name)];
                const count = (d: string) => all.filter((u) => u.device === d).length;
                const devices = [
                  { key: "Web", label: "Web", icon: Monitor, n: count("Web") + count("Website") },
                  { key: "Desktop", label: "Windows", icon: MonitorSmartphone, n: count("Desktop") },
                  { key: "Mobile", label: "Android", icon: Smartphone, n: count("Mobile") + count("Android") },
                ];
                return devices.filter((d) => d.n > 0).map((d) => (
                  <span key={d.key} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                    <d.icon className="h-3 w-3 text-primary" /> {d.label} · {d.n}
                  </span>
                ));
              })()}
            </div>
            <ul className="mt-3 space-y-2">
              {[stats.online.me, ...stats.online.users.filter((u) => u.name !== stats.online.me.name)].slice(0, 6).map((u, i) => (
                <li key={i} className="flex items-center gap-2.5 rounded-lg bg-slate-50 px-3 py-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200">
                    {u.device === "Desktop" ? <MonitorSmartphone className="h-4 w-4" /> : u.device === "Mobile" ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-700">
                      {u.name}
                      {u.name === stats.online.me.name && <span className="ml-1 text-[10px] font-bold uppercase text-emerald-600">(you)</span>}
                    </span>
                    <span className="block truncate text-[11px] text-slate-400">{u.role} · {u.device}</span>
                  </span>
                  <Radio className="ml-auto h-3.5 w-3.5 shrink-0 text-emerald-500" />
                </li>
              ))}
            </ul>
          </div>
          <ToursPanel
            roleKey={stats.user.roleKey}
            canSeeAnalytics={["super_admin", "admin", "headteacher", "developer"].includes(stats.user.roleKey ?? "")}
          />
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900">Admin Portal</h3>
            <p className="mt-0.5 text-xs text-slate-400">Everything is one click away — full navigation lives in the sidebar.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {quickActions.map((a) => (
                <Link key={a.href} href={a.href} target={a.external ? "_blank" : undefined} className="group flex flex-col gap-2 rounded-xl border border-slate-200 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg ring-1 transition group-hover:scale-105 ${a.tone}`}>
                    <a.icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-semibold text-slate-700 group-hover:text-primary">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-slate-900 p-6 text-white">
            <h3 className="text-sm font-semibold">Term Fee Collection</h3>
            <p className="mt-1 text-3xl font-bold text-emerald-300">{ghs(stats.finance.collected)}</p>
            <p className="mt-1 text-xs text-slate-400">Collected across {stats.finance.paymentCount} receipts</p>
            <Link href="/admin/fees" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-amber-300 hover:text-amber-200">
              View finance <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function SetupChecklist({ setup }: { setup: Stats["setup"] }) {
  const steps = [
    {
      done: setup.schoolProfile,
      label: "Set up your school profile",
      desc: "Name, logo and colours",
      href: "/admin/settings",
      icon: Building2,
    },
    {
      done: setup.hasStaff,
      label: "Add staff & teachers",
      desc: "Create accounts and assign roles",
      href: "/admin/users",
      icon: UserPlus,
    },
    {
      done: setup.hasStudents,
      label: "Add students",
      desc: "Enrol your learners into classes",
      href: "/admin/students",
      icon: School,
    },
    {
      done: setup.payments,
      label: "Set up online payments",
      desc: "MTN / AirtelTigo / Telecel / Paystack",
      href: "/admin/payments",
      icon: CreditCard,
    },
    {
      done: setup.licenseActive,
      label: "Activate the license",
      desc: "Remove the trial countdown",
      href: "/admin/activate",
      icon: KeyRound,
    },
  ];

  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-teal-50 shadow-sm">        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-semibold text-slate-900">Get your school ready</h3>
            <p className="text-xs text-slate-500">{done} of {steps.length} setup steps complete — finish these to go live.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("smis:replay-tour"))}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary-soft/60 px-3 py-1.5 text-xs font-semibold text-primary transition hover:border-primary/40 hover:bg-primary-soft"
          >
            <Sparkles className="h-3.5 w-3.5" /> Replay tour
          </button>
          <a
            href="/api/guide/buyer"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:border-amber-300 hover:bg-amber-100"
          >
            <ClipboardList className="h-3.5 w-3.5" /> Buyer's onboarding checklist
          </a>
        </div>
        <div className="h-2 w-40 overflow-hidden rounded-full bg-emerald-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
            style={{ width: `${Math.round((done / steps.length) * 100)}%` }}
          />
        </div>
      </div>
      <ul className="grid gap-px bg-emerald-100/60 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map((s) => (
          <li key={s.label} className="bg-white">
            <Link
              href={s.href}
              className={`group flex h-full items-start gap-3 p-4 transition-colors hover:bg-emerald-50/70 ${s.done ? "opacity-60" : ""}`}
            >
              <span
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 ${
                  s.done
                    ? "bg-emerald-500 text-white ring-emerald-500"
                    : "bg-white text-slate-400 ring-slate-300 group-hover:ring-emerald-400"
                }`}
              >
                {s.done ? <Check className="h-4 w-4" /> : <Circle className="h-3.5 w-3.5" />}
              </span>
              <span className="min-w-0">
                <span className={`block text-sm font-semibold ${s.done ? "text-slate-500" : "text-slate-800"}`}>{s.label}</span>
                <span className="block text-xs text-slate-400">{s.desc}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div>
      <div className="skeleton h-8 w-64" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card h-28" />
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="card h-96" />
        <div className="card h-96" />
      </div>
    </div>
  );
}

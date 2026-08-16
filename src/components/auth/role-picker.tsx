"use client";

import { useMemo, useState } from "react";
import {
  BadgeCheck, BookOpen, Briefcase, Check, Crown, GraduationCap, ShieldCheck, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/client";

export type LoginRole =
  | "super_admin"
  | "admin"
  | "headteacher"
  | "teacher"
  | "other"
  | "student"
  | "parent";

export const ROLE_LABELS: Record<LoginRole, string> = {
  super_admin: "Super Administrator",
  admin: "Administrator",
  headteacher: "Headteacher / Headmaster",
  teacher: "Teacher",
  other: "Other Staff",
  student: "Student",
  parent: "Parent / Guardian",
};

type Access = { title: string; desc: string; modules: string[]; mode: "email" | "staff" };

const ACCESS: Record<LoginRole, Access> = {
  super_admin: {
    title: "Super Administrator",
    desc: "Complete control of the school management system — every module, every setting, backups and the year-end rollover. Only licensing & activation stay reserved for the Developer.",
    modules: [
      "Every module & report in the system",
      "Users, roles & permissions",
      "School settings & branding",
      "Backup & restore",
      "Year-End & Rollover — clear for a fresh academic year (archive kept)",
    ],
    mode: "email",
  },
  admin: {
    title: "Administrator",
    desc: "Runs the school day-to-day — students, staff, academics, fees and communications, including the year-end rollover.",
    modules: [
      "Students, admissions & staff",
      "Classes, subjects & timetables",
      "Assessments & report cards",
      "Fees, payments & expenses",
      "Year-End & Rollover — clear for a fresh academic year (archive kept)",
    ],
    mode: "email",
  },
  headteacher: {
    title: "Headteacher / Headmaster",
    desc: "Full academic oversight — assessments, reports, mass promotion and the year-end rollover.",
    modules: [
      "Students & staff",
      "Assessments & report cards",
      "Mass promotion",
      "Year-End & Rollover — clear for a fresh academic year",
      "Fees (view & update)",
    ],
    mode: "staff",
  },
  teacher: {
    title: "Teacher",
    desc: "Your classroom workspace — take attendance, enter marks and set homework.",
    modules: [
      "My classes & students",
      "Attendance",
      "Marks & assessments",
      "Homework & lessons",
      "Mass promotion",
    ],
    mode: "staff",
  },
  other: {
    title: "Other Staff",
    desc: "Every staff role gets exactly the tools its job needs — nothing more, nothing less.",
    modules: [
      "Secretary — admissions & website content",
      "Accountant — fees, expenses & payroll",
      "Nurse — sick bay records",
      "Librarian — library & books",
      "Store keeper — inventory",
      "ICT admin — settings, users & audit",
    ],
    mode: "staff",
  },
  student: {
    title: "Student",
    desc: "See your results and attendance in the student portal.",
    modules: ["Results & report cards", "Attendance"],
    mode: "email",
  },
  parent: {
    title: "Parent / Guardian",
    desc: "Track your ward's progress and fee status.",
    modules: ["Ward's results", "Fee status"],
    mode: "email",
  },
};

// Tier 1 — the three doors the user asked for, plus student & parent portals.
const TIER1: { id: LoginRole | "staff"; label: string; icon: typeof Crown; hint: string }[] = [
  { id: "super_admin", label: "Super Admin", icon: Crown, hint: "Full system control" },
  { id: "admin", label: "Admin", icon: ShieldCheck, hint: "Runs the whole school" },
  { id: "staff", label: "Staff Login", icon: Briefcase, hint: "Headteacher · Teachers · Office" },
  { id: "student", label: "Student", icon: GraduationCap, hint: "Results & attendance" },
  { id: "parent", label: "Parent", icon: Users, hint: "Ward's progress & fees" },
];

// Tier 2 — staff expands into these.
const STAFF_ROLES: { id: LoginRole; label: string; icon: typeof BookOpen; hint: string }[] = [
  { id: "headteacher", label: "Headteacher", icon: ShieldCheck, hint: "Runs academics & the year-end" },
  { id: "teacher", label: "Teacher", icon: BookOpen, hint: "Attendance, marks, homework" },
  { id: "other", label: "Other Staff", icon: Briefcase, hint: "Secretary · Accountant · Nurse · more" },
];

export function RolePicker({
  selected,
  onSelect,
}: {
  selected: LoginRole | null;
  onSelect: (role: LoginRole | null) => void;
}) {
  const { t } = useLanguage();
  const [tier1, setTier1] = useState<LoginRole | "staff" | null>(null);

  const access = useMemo(() => (selected ? ACCESS[selected] : null), [selected]);

  function pick(role: LoginRole) {
    setTier1(role === "headteacher" || role === "teacher" || role === "other" ? "staff" : role);
    onSelect(role);
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
          {t("login.whoAreYou")}
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {TIER1.map((t) => {
            const active = tier1 === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => (t.id === "staff" ? (setTier1("staff"), onSelect(null)) : pick(t.id))}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left transition",
                  active
                    ? "border-primary/50 bg-primary-soft/70 shadow-sm"
                    : "border-slate-200 bg-white/80 hover:border-primary/30 hover:bg-primary-soft/40"
                )}
              >
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <t.icon className="h-3.5 w-3.5 text-primary" /> {t.label}
                </span>
                <span className="text-[10px] leading-tight text-slate-400">{t.hint}</span>
              </button>
            );
          })}
        </div>
      </div>

      {tier1 === "staff" && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
            {t("login.staffWhich")}
          </p>
          <div className="mt-2 space-y-1.5">
            {STAFF_ROLES.map((s) => {
              const active = selected === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => pick(s.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition",
                    active
                      ? "border-primary/50 bg-white shadow-sm"
                      : "border-transparent bg-white/70 hover:border-primary/30"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                      active ? "bg-primary text-white" : "bg-primary-soft text-primary"
                    )}
                  >
                    <s.icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-slate-800">{s.label}</span>
                    <span className="block text-[10px] text-slate-400">{s.hint}</span>
                  </span>
                  {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {access && (
        <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/70 p-4">
          <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
            <BadgeCheck className="h-4 w-4" /> {access.title} — what you can access
          </p>
          <p className="mt-1 text-xs leading-relaxed text-emerald-700/90">{access.desc}</p>
          <ul className="mt-2.5 space-y-1.5">
            {access.modules.map((m) => (
              <li key={m} className="flex items-start gap-2 text-[11px] text-slate-600">
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

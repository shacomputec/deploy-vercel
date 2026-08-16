"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTourSeen } from "@/lib/tours";
import {
  ArrowRight, Building2, CheckCircle2, CreditCard, GraduationCap,
  KeyRound, Rocket, Sparkles, UserPlus, X,
} from "lucide-react";

const TOUR_KEY = "smis-firstrun-tour-v1";

type Setup = {
  schoolProfile: boolean;
  hasStaff: boolean;
  hasStudents: boolean;
  payments: boolean;
  licenseActive: boolean;
};

const STEPS = [
  {
    icon: Building2,
    title: "Set up your school profile",
    desc: "Give your school a name, logo and colours — the public website and every report card will use them automatically.",
    href: "/admin/settings",
    doneKey: "schoolProfile" as const,
  },
  {
    icon: UserPlus,
    title: "Add staff & teachers",
    desc: "Create accounts for your team and assign each person their role — a teacher, accountant, nurse, librarian and more. Staff sign in with the Staff ID you assign them.",
    href: "/admin/users",
    doneKey: "hasStaff" as const,
  },
  {
    icon: GraduationCap,
    title: "Add students",
    desc: "Enrol your learners into their exact classes (Crèche → SHS). You can also import them from a CSV, or let families apply online and approve them here.",
    href: "/admin/students",
    doneKey: "hasStudents" as const,
  },
  {
    icon: CreditCard,
    title: "Set up online payments",
    desc: "Connect the school's own payment channels — MTN MoMo, AirtelTigo, Telecel and Paystack — so parents can pay fees online and receipts are issued automatically.",
    href: "/admin/payments",
    doneKey: "payments" as const,
  },
  {
    icon: KeyRound,
    title: "Activate the license",
    desc: "Remove the trial countdown by activating the license — pay online or by mobile money and the key is delivered instantly to your contact.",
    href: "/admin/activate",
    doneKey: "licenseActive" as const,
  },
];

export function FirstRunTour({ setup, roleKey }: { setup: Setup; roleKey?: string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const { shouldShow, markSeen } = useTourSeen(TOUR_KEY);

  // Show once per browser, only while setup is incomplete, only for the roles
  // that run the school (super admin, admin, headteacher, developer).
  const canManage = useMemo(
    () => !!roleKey && ["super_admin", "admin", "headteacher", "developer"].includes(roleKey),
    [roleKey],
  );
  const incomplete = useMemo(
    () => STEPS.some((s) => !setup[s.doneKey]),
    [setup],
  );

  useEffect(() => {
    if (canManage && incomplete && shouldShow) setOpen(true);
  }, [canManage, incomplete, shouldShow]);

  // Replay: the checklist's "Replay tour" button dispatches this event — the
  // tour reopens even if it was skipped or completed before.
  useEffect(() => {
    const onReplay = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener("smis:replay-tour", onReplay);
    return () => window.removeEventListener("smis:replay-tour", onReplay);
  }, []);

  const dismiss = () => {
    markSeen();
    setOpen(false);
  };

  const finish = () => {
    markSeen("completed");
    setOpen(false);
  };

  if (!open) return null;

  const current = STEPS[step];
  const done = STEPS[step].doneKey;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* header */}
        <div className="relative bg-gradient-to-br from-primary via-primary to-accent px-6 pb-6 pt-5 text-white">
          <button
            type="button"
            onClick={dismiss}
            className="absolute right-4 top-4 rounded-full bg-white/15 p-1.5 text-white transition hover:bg-white/25"
            aria-label="Close tour"
          >
            <X className="h-4 w-4" />
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]">
            <Sparkles className="h-3 w-3" /> Welcome — quick tour
          </span>
          <h2 className="mt-2.5 text-xl font-extrabold leading-tight">
            Let&apos;s get your school live in 5 steps
          </h2>
          <p className="mt-1 text-sm text-white/85">
            Everything you need to set up before your first day. You can close
            this any time and come back to it from the checklist.
          </p>
          {/* progress dots */}
          <div className="mt-4 flex gap-1.5">
            {STEPS.map((s, i) => (
              <span
                key={s.title}
                className={`h-1.5 flex-1 rounded-full transition ${
                  i <= step ? "bg-white" : "bg-white/25"
                }`}
              />
            ))}
          </div>
        </div>

        {/* step body */}
        <div className="px-6 py-5">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <current.icon className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
                Step {step + 1} of {STEPS.length}
              </p>
              <h3 className="mt-0.5 text-base font-bold text-slate-900">
                {current.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                {current.desc}
              </p>
            </div>
          </div>

          <div
            className={`mt-4 flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold ${
              setup[done]
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {setup[done]
              ? "Already done — nice work!"
              : "Not done yet — this is still on your list."}
          </div>
        </div>

        {/* footer */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
          <button
            type="button"
            onClick={dismiss}
            className="text-xs font-semibold text-slate-400 transition hover:text-slate-600"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 transition hover:border-slate-300"
              >
                Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-accent px-4 py-2 text-xs font-bold text-white shadow-card transition hover:-translate-y-0.5 hover:shadow-lift"
              >
                Next step <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <Link
                href={current.href}
                onClick={finish}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-accent px-4 py-2 text-xs font-bold text-white shadow-card transition hover:-translate-y-0.5 hover:shadow-lift"
              >
                <Rocket className="h-3.5 w-3.5" /> Let&apos;s go!
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

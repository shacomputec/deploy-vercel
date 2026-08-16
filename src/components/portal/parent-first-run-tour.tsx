"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTourSeen } from "@/lib/tours";
import {
  ArrowRight, FileText, Printer, Sparkles, Users2, Wallet, X,
} from "lucide-react";

const TOUR_KEY = "smis-parent-tour-v1";

const STEPS = [
  {
    icon: Users2,
    title: "Your wards",
    desc: "This portal shows every child linked to your account — their names, admission numbers and current classes appear on this page. If a child is missing, ask the school to link them to your contact details.",
    href: "/portal/parent",
  },
  {
    icon: FileText,
    title: "Results & report cards",
    desc: "Once the school publishes report cards, each ward's result appears here with their total, position and promotion status. Tap a report to view the full card.",
    href: "/portal/parent",
  },
  {
    icon: Wallet,
    title: "Fees & printing",
    desc: "Your ward's fee status is available at the school's online payment page, and every report has a Print button so you can save a copy or take it to school. Need help? Contact the school office.",
    href: "/portal/parent",
  },
];

export function ParentFirstRunTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const { shouldShow, markSeen } = useTourSeen(TOUR_KEY);

  useEffect(() => {
    if (shouldShow) setOpen(true);
  }, [shouldShow]);

  // Replay button on the parent portal dispatches this event.
  useEffect(() => {
    const onReplay = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener("smis:replay-parent-tour", onReplay);
    return () => window.removeEventListener("smis:replay-parent-tour", onReplay);
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

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="relative bg-gradient-to-br from-primary via-primary to-accent px-6 pb-6 pt-5 text-white">
          <button
            type="button"
            onClick={dismiss}
            className="absolute right-4 top-4 rounded-full bg-white/15 p-1.5 text-white transition hover:bg-white/25"
            aria-label="Close parent tour"
          >
            <X className="h-4 w-4" />
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]">
            <Sparkles className="h-3 w-3" /> Parent quick tour
          </span>
          <h2 className="mt-2.5 text-xl font-extrabold leading-tight">
            Follow your child&apos;s progress here
          </h2>
          <p className="mt-1 text-sm text-white/85">
            Three things you can do in this portal. Close this any time — it
            won&apos;t come back.
          </p>
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

        <div className="px-6 py-5">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <current.icon className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
                Step {step + 1} of {STEPS.length}
              </p>
              <h3 className="mt-0.5 text-base font-bold text-slate-900">{current.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{current.desc}</p>
            </div>
          </div>
        </div>

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
                <Printer className="h-3.5 w-3.5" /> Got it!
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

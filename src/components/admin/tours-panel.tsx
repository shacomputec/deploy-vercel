"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2, GraduationCap, RefreshCcw, RotateCcw, Sparkles, UserRound, Users2,
} from "lucide-react";

/**
 * Dashboard "Tours" card — two halves:
 *
 *   1. YOUR TOURS — the first-run tours for the signed-in user's role, with a
 *      status badge (completed / dismissed / not seen) and buttons to replay
 *      it now or reset it so it appears again on the next visit.
 *
 *   2. TOUR ADOPTION — how many accounts have finished vs skipped each tour
 *      (admin analytics, from /api/portal/tours/stats).
 */

const TOUR_META: Record<string, { label: string; icon: typeof Sparkles; page: string; event: string }> = {
  "smis-firstrun-tour-v1": { label: "Admin setup tour", icon: Sparkles, page: "/admin?tour=1", event: "smis:replay-tour" },
  "smis-teacher-tour-v1": { label: "Teacher tour", icon: GraduationCap, page: "/portal/teacher?tour=1", event: "smis:replay-teacher-tour" },
  "smis-parent-tour-v1": { label: "Parent tour", icon: Users2, page: "/portal/parent?tour=1", event: "smis:replay-parent-tour" },
  "smis-student-tour-v1": { label: "Student tour", icon: UserRound, page: "/portal/student?tour=1", event: "smis:replay-student-tour" },
};

const TOURS_BY_ROLE: Record<string, string[]> = {
  super_admin: ["smis-firstrun-tour-v1"],
  admin: ["smis-firstrun-tour-v1"],
  headteacher: ["smis-firstrun-tour-v1"],
  teacher: ["smis-teacher-tour-v1"],
  parent: ["smis-parent-tour-v1"],
  student: ["smis-student-tour-v1"],
  developer: ["smis-firstrun-tour-v1"],
};

type MyTours = { tours: string[]; completed: string[]; enabled: boolean };
type Stats = {
  stats: Record<string, { seen: number; completed: number }>;
  totalUsers: number;
};

export function ToursPanel({ roleKey, canSeeAnalytics }: { roleKey?: string; canSeeAnalytics: boolean }) {
  const [mine, setMine] = useState<MyTours | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(() => {
    fetch("/api/portal/tours", { method: "GET" })
      .then((r) => r.json())
      .then((j) => { if (j?.ok) setMine(j.data); })
      .catch(() => {});
    if (canSeeAnalytics) {
      fetch("/api/portal/tours/stats", { method: "GET" })
        .then((r) => r.json())
        .then((j) => { if (j?.ok) setStats(j.data); })
        .catch(() => {});
    }
  }, [canSeeAnalytics]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const myKeys = (roleKey ? TOURS_BY_ROLE[roleKey] : undefined) ?? ["smis-firstrun-tour-v1"];
  const toursEnabled = mine?.enabled ?? true;

  const resetTour = async (key: string) => {
    setBusy(key);
    try {
      await fetch(`/api/portal/tours?key=${encodeURIComponent(key)}`, { method: "DELETE" });
      refresh();
    } finally {
      setBusy(null);
    }
  };

  const dismissTour = async (key: string) => {
    setBusy(key);
    try {
      await fetch("/api/portal/tours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, status: "dismissed" }),
      });
      refresh();
    } finally {
      setBusy(null);
    }
  };

  const replay = (key: string) => {
    const meta = TOUR_META[key];
    if (!meta) return;
    // The admin tour lives on this very page — open it in place. The other
    // tours live on their own portals, so navigate there with ?tour=1 (the
    // portals auto-open the tour when that param is present).
    if (meta.event === "smis:replay-tour") {
      window.dispatchEvent(new CustomEvent(meta.event));
    } else {
      window.location.href = meta.page;
    }
  };

  const statusOf = (key: string): "completed" | "dismissed" | "new" => {
    if (mine?.completed.includes(key)) return "completed";
    if (mine?.tours.includes(key)) return "dismissed";
    return "new";
  };

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <Sparkles className="h-4 w-4" />
        </span>
        <h3 className="font-semibold text-slate-900">Tours</h3>
        <button
          type="button"
          onClick={refresh}
          className="ml-auto inline-flex items-center gap-1 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          title="Refresh"
          aria-label="Refresh tours"
        >
          <RefreshCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Your tours */}
      <div className="mt-3">
        {!toursEnabled && (
          <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
            First-run tours are switched OFF school-wide (System Settings → System).
          </p>
        )}
        <ul className="space-y-2">
          {myKeys.map((key) => {
            const meta = TOUR_META[key];
            if (!meta) return null;
            const status = statusOf(key);
            return (
              <li key={key} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200">
                  <meta.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-700">{meta.label}</p>
                  <p className="text-[11px] text-slate-400">
                    {status === "completed" && (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" /> Completed
                      </span>
                    )}
                    {status === "dismissed" && <span className="font-semibold text-slate-500">Dismissed — won&apos;t auto-show</span>}
                    {status === "new" && <span className="font-semibold text-sky-600">Not seen yet — will show on next visit</span>}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => replay(key)}
                    className="rounded-lg bg-primary-soft px-2.5 py-1.5 text-[11px] font-bold text-primary transition hover:bg-primary hover:text-white"
                  >
                    {meta.event === "smis:replay-tour" ? "Replay" : "Take it"}
                  </button>
                  {status !== "new" && (
                    <button
                      type="button"
                      onClick={() => resetTour(key)}
                      disabled={busy === key}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700 disabled:opacity-50"
                      title="Reset so it shows again"
                    >
                      <RotateCcw className="h-3 w-3" /> Reset
                    </button>
                  )}
                  {status === "new" && toursEnabled && (
                    <button
                      type="button"
                      onClick={() => dismissTour(key)}
                      disabled={busy === key}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 transition hover:border-slate-300 hover:text-slate-700 disabled:opacity-50"
                      title="Dismiss — don't show this tour"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Adoption analytics */}
      {canSeeAnalytics && stats && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Tour adoption</h4>
            <span className="text-[11px] font-semibold text-slate-400">{stats.totalUsers} accounts</span>
          </div>
          <ul className="mt-2.5 space-y-2">
            {Object.entries(stats.stats).map(([key, v]) => {
              const meta = TOUR_META[key];
              if (!meta) return null;
              const pct = stats.totalUsers ? Math.round((v.completed / stats.totalUsers) * 100) : 0;
              return (
                <li key={key}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">{meta.label}</span>
                    <span className="text-slate-400">
                      <span className="font-bold text-emerald-600">{v.completed} done</span> · {v.seen - v.completed} skipped
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[11px] text-slate-400">
            Finished = walked through to the end. Skipped = closed early. Counts follow accounts across web, desktop and Android.
          </p>
        </div>
      )}
    </div>
  );
}

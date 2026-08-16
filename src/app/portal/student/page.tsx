"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Award, CalendarCheck, Download, Sparkles, UserRound } from "lucide-react";
import { api } from "@/lib/client";
import { ghs, fmtDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty";
import { StudentFirstRunTour } from "@/components/portal/student-first-run-tour";

type Overview = {
  portal: "student";
  student: { fullName: string; admissionNo: string; gender: string; dateOfBirth: string | null; class: { name: string; level: { name: string } } | null };
  reports: { id: string; term: { name: string }; academicYear: { name: string }; totalPercentage: number | null; position: number | null; promotionStatus: string | null; published: boolean }[];
  attendance: { status: string; date: string }[];
  payments: { receiptNo: string; amount: number; date: string }[];
};

export default function StudentPortalPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    api<Overview>("/api/portal/overview").then(setData).catch((e) => setError(e.message));
  }, []);

  // The dashboard Tours panel links here with ?tour=1 to auto-open the tour.
  useEffect(() => {
    if (searchParams.get("tour") === "1") {
      const t = setTimeout(() => {
        window.dispatchEvent(new CustomEvent("smis:replay-student-tour"));
        const url = new URL(window.location.href);
        url.searchParams.delete("tour");
        window.history.replaceState({}, "", url);
      }, 350);
      return () => clearTimeout(t);
    }
  }, [searchParams]);

  if (error) return <p className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700">{error}</p>;
  if (!data) return <div className="card p-8"><div className="skeleton h-4 w-full" /></div>;

  const present = data.attendance.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
  const rate = data.attendance.length ? Math.round((present / data.attendance.length) * 100) : 0;

  return (
    <div>
      <StudentFirstRunTour />
      <div className="card mb-6 flex flex-wrap items-center justify-between gap-4 p-6">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary"><UserRound className="h-7 w-7" /></span>
          <div>
            <h1 className="text-xl font-bold text-ink">{data.student.fullName}</h1>
            <p className="text-sm text-slate-500">{data.student.admissionNo} · {data.student.class?.name ?? "No class"} · {data.student.class?.level.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("smis:replay-student-tour"))}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary-soft/60 px-3 py-1.5 text-xs font-semibold text-primary transition hover:border-primary/40 hover:bg-primary-soft"
          >
            <Sparkles className="h-3.5 w-3.5" /> Replay tour
          </button>
          <Badge tone="green">Active Student</Badge>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <CalendarCheck className="h-5 w-5 text-primary" />
          <p className="mt-2 text-2xl font-bold text-ink">{rate}%</p>
          <p className="text-xs text-slate-400">Attendance this term</p>
        </div>
        <div className="card p-5">
          <Award className="h-5 w-5 text-primary" />
          <p className="mt-2 text-2xl font-bold text-ink">{data.reports.length}</p>
          <p className="text-xs text-slate-400">Published report cards</p>
        </div>
        <div className="card p-5">
          <Download className="h-5 w-5 text-primary" />
          <p className="mt-2 text-2xl font-bold text-ink">{ghs(data.payments.reduce((a, p) => a + p.amount, 0))}</p>
          <p className="text-xs text-slate-400">Fees paid this year</p>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-ink">My Report Cards</h2>
        {data.reports.length === 0 ? (
          <EmptyState title="No published results yet" hint="When the school publishes results, they appear here." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {data.reports.map((r) => (
              <div key={r.id} className="card p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800">{r.term.name} · {r.academicYear.name}</p>
                    <p className="text-xs text-slate-400">Position {r.position ?? "—"}</p>
                  </div>
                  <Badge tone={r.promotionStatus === "PROMOTED" ? "green" : r.promotionStatus === "CONDITIONAL" ? "amber" : "red"}>{r.promotionStatus}</Badge>
                </div>
                <p className="mt-3 text-3xl font-bold text-primary">{r.totalPercentage?.toFixed(1)}%</p>
                <Link href="/result-checker" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                  Open in result checker →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Printer, Sparkles, Users2 } from "lucide-react";
import { api } from "@/lib/client";
import { fmtDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty";
import { Avatar } from "@/components/ui/avatar";
import { ParentFirstRunTour } from "@/components/portal/parent-first-run-tour";

type Overview = {
  portal: "parent";
  students: { id: string; fullName: string; admissionNo: string; gender: string; dateOfBirth: string | null; class: { name: string; level: { name: string } } | null }[];
  reports: { id: string; studentId: string; student: { fullName: string; admissionNo: string }; term: { name: string }; academicYear: { name: string }; totalPercentage: number | null; position: number | null; promotionStatus: string | null }[];
};

export default function ParentPortalPage() {
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
        window.dispatchEvent(new CustomEvent("smis:replay-parent-tour"));
        const url = new URL(window.location.href);
        url.searchParams.delete("tour");
        window.history.replaceState({}, "", url);
      }, 350);
      return () => clearTimeout(t);
    }
  }, [searchParams]);

  if (error) return <p className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700">{error}</p>;
  if (!data) return <div className="card p-8"><div className="skeleton h-4 w-full" /></div>;

  return (
    <div>
      <ParentFirstRunTour />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">My Wards</h1>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("smis:replay-parent-tour"))}
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary-soft/60 px-3 py-1.5 text-xs font-semibold text-primary transition hover:border-primary/40 hover:bg-primary-soft"
        >
          <Sparkles className="h-3.5 w-3.5" /> Replay tour
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {data.students.map((s) => (
          <div key={s.id} className="card p-6">
            <div className="flex items-center gap-4">
              <Avatar name={s.fullName} className="h-12 w-12" />
              <div>
                <p className="font-semibold text-slate-800">{s.fullName}</p>
                <p className="text-xs text-slate-400">{s.admissionNo} · {s.class?.name ?? "No class"}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
              {data.reports.filter((r) => r.studentId === s.id).length === 0 && (
                <p className="text-sm text-slate-400">No published results yet.</p>
              )}
              {data.reports.filter((r) => r.studentId === s.id).map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{r.term.name} · {r.academicYear.name}</p>
                    <p className="text-xs text-slate-400">Position {r.position ?? "—"}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{r.totalPercentage?.toFixed(1)}%</p>
                    <div className="mt-1 flex items-center justify-end gap-2">
                      <Badge tone={r.promotionStatus === "PROMOTED" ? "green" : r.promotionStatus === "CONDITIONAL" ? "amber" : "red"}>{r.promotionStatus}</Badge>
                      <a
                        href={`/portal/parent/report/${r.id}`}
                        target="_blank"
                        rel="noopener"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
                        title="Open as a printable A4 PDF (front page only)"
                      >
                        <Printer className="h-3.5 w-3.5" /> Print / PDF
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {data.students.length === 0 && (
        <EmptyState title="No children linked" hint="Contact the school office to link your ward's records to this account." />
      )}

      <div className="mt-8 flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-5">
        <Users2 className="mt-0.5 h-5 w-5 text-primary" />
        <p className="text-sm text-slate-500">
          Detailed report cards with subject-by-subject scores, attendance and teacher comments are available through the{" "}
          <a href="/result-checker" className="font-semibold text-primary hover:underline">Result Checker</a> using your ward's admission number and registered phone number.
        </p>
      </div>
    </div>
  );
}

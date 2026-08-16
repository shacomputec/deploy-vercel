"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, LayoutGrid, ListChecks, Printer, TrendingUp } from "lucide-react";
import { api } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/admin/page-header";
import { useToast } from "@/components/ui/toast";

type Meta = { classes: { id: string; name: string }[]; terms: { id: string; name: string; academicYearId: string }[]; years: { id: string; name: string }[] };
type SubjectCol = { subject: string; classScore: number | null; examScore: number | null; total: number | null; grade: string | null; passed: boolean | null };
type MasterRow = { studentId: string; admissionNo: string; fullName: string; gender: string; position: number; totalPercent: number; average: number; aggregate: number | null; aggregateMax: number; promotionStatus: string; subjects: SubjectCol[] };
type SummaryRow = { studentId: string; admissionNo: string; fullName: string; position: number; average: number; aggregate: number | null; aggregateMax: number; promotionStatus: string };
type BroadRow = { subject: string; count: number; average: number | null; highest: number | null; lowest: number | null; passCount: number; passRate: number | null; gradeDist: { grade: string; count: number }[] };
type Sheet = {
  meta: { className: string; levelName: string; termName: string; yearName: string; onRoll: number; overallAverage: number | null; overallHighest: number | null; overallLowest: number | null; classAggregateAverage: number | null; bestAggregate: number | null; worstAggregate: number | null; promoted: number; conditional: number; repeat: number };
  subjects: { id: string; name: string }[];
  master: MasterRow[];
  broad: BroadRow[];
  summary: SummaryRow[];
};

const TABS = [
  ["master", "Master Sheet", LayoutGrid],
  ["broad", "Broad Sheet (analysis)", ListChecks],
] as const;

export default function MasterSheetPage() {
  const toast = useToast();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [classId, setClassId] = useState("");
  const [termId, setTermId] = useState("");
  const [tab, setTab] = useState<"master" | "broad">("master");
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<Meta>("/api/meta").then(setMeta).catch(() => {});
  }, []);

  // Default to the current term + first class with data.
  useEffect(() => {
    if (!meta) return;
    if (!classId && meta.classes.length) setClassId(meta.classes[0].id);
    if (!termId) {
      const current = meta.terms.find((t) => t.name === "First Term") ?? meta.terms[0];
      if (current) setTermId(current.id);
    }
  }, [meta, classId, termId]);

  const yearId = useMemo(() => meta?.terms.find((t) => t.id === termId)?.academicYearId ?? meta?.years[0]?.id ?? "", [meta, termId]);

  const load = useCallback(async () => {
    if (!classId || !termId) return;
    setLoading(true);
    try {
      const data = await api<Sheet>(`/api/master-sheet?classId=${classId}&termId=${termId}&academicYearId=${yearId}`);
      setSheet(data);
    } catch (e) {
      toast.toast({ title: "Failed to load sheet", description: (e as Error).message, variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [classId, termId, yearId, toast]);

  useEffect(() => {
    if (classId && termId) load();
  }, [classId, termId, load]);

  async function exportSheet(format: "csv" | "xlsx") {
    if (!classId || !termId) return;
    const res = await fetch(`/api/master-sheet/export?classId=${classId}&termId=${termId}&academicYearId=${yearId}&format=${format}`);
    if (!res.ok) {
      toast.toast({ title: "Export failed", variant: "error" });
      return;
    }
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Master-Sheet_${sheet?.meta.className ?? classId}_${sheet?.meta.termName ?? termId}.${format}`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.toast({ title: `Exported as ${format.toUpperCase()}`, variant: "success" });
  }

  return (
    <div>
      <PageHeader
        title="Master & Broad Sheet"
        subtitle="Class-based analysis of SBA + report data — every student × subject, with per-subject statistics. Computed live."
        action={
          <>
            <Button variant="outline" onClick={() => exportSheet("csv")} disabled={!sheet}><Download className="h-4 w-4" /> Export CSV</Button>
            <Button variant="outline" onClick={() => exportSheet("xlsx")} disabled={!sheet}><FileSpreadsheet className="h-4 w-4" /> Export Excel</Button>
            <Button variant="outline" onClick={() => window.print()} disabled={!sheet}><Printer className="h-4 w-4" /> Print</Button>
          </>
        }
      />

      <div className="card mb-5 flex flex-wrap items-end gap-4 p-5">
        <Field label="Class">
          <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">— pick a class —</option>
            {meta?.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Term">
          <Select value={termId} onChange={(e) => setTermId(e.target.value)}>
            <option value="">— pick a term —</option>
            {meta?.terms.map((t) => <option key={t.id} value={t.id}>{t.name} · {meta.years.find((y) => y.id === t.academicYearId)?.name}</option>)}
          </Select>
        </Field>
        <Button onClick={load} loading={loading}><TrendingUp className="h-4 w-4" /> Load</Button>
      </div>

      <div className="mb-5 flex gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
        {TABS.map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)} className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === key ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50"}`}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {!sheet ? (
        <div className="card p-10 text-center text-sm text-slate-400">
          {classId && termId ? "Loading…" : "Pick a class and term to load the sheet."}
        </div>
      ) : tab === "master" ? (
        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-semibold text-slate-900">
              Master Sheet — {sheet.meta.className} · {sheet.meta.termName} {sheet.meta.yearName}
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">{sheet.meta.onRoll} students · ranked by overall %</p>
          </div>
          <div className="overflow-x-auto">
            <table className="table text-sm">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Adm. No</th>
                  {sheet.subjects.map((s) => (
                    <th key={s.id} colSpan={4} className="text-center border-l border-slate-100">
                      {s.name}
                    </th>
                  ))}
                  <th className="border-l border-slate-100">Avg %</th>
                  <th className="border-l border-slate-100">Aggregate</th>
                  <th>Status</th>
                </tr>
                <tr className="bg-slate-50">
                  <th /><th /><th />
                  {sheet.subjects.map((s) => (
                    <th key={s.id} colSpan={4} className="border-l border-slate-100 text-[10px] font-medium text-slate-400">
                      Class | Exam | Total | Grade
                    </th>
                  ))}
                  <th className="border-l border-slate-100" /><th className="border-l border-slate-100" /><th />
                </tr>
              </thead>
              <tbody>
                {sheet.master.map((m) => (
                  <tr key={m.studentId}>
                    <td className="font-semibold text-slate-500">{m.position}</td>
                    <td className="font-medium text-slate-800">{m.fullName}</td>
                    <td className="font-mono text-xs text-slate-500">{m.admissionNo}</td>
                    {m.subjects.map((s, i) => (
                      <td key={i} colSpan={4} className="border-l border-slate-100 whitespace-nowrap px-2 text-center">
                        <span className="text-slate-600">{s.classScore ?? "—"}</span> ·{" "}
                        <span className="text-slate-600">{s.examScore ?? "—"}</span> ·{" "}
                        <span className="font-semibold text-slate-800">{s.total ?? "—"}</span> ·{" "}
                        <span className={`font-bold ${s.passed === false ? "text-rose-600" : "text-emerald-600"}`}>{s.grade ?? "—"}</span>
                      </td>
                    ))}
                    <td className="border-l border-slate-100 text-center font-bold text-slate-800">{m.average}</td>
                    <td className="border-l border-slate-100 text-center">
                      {m.aggregate !== null ? (
                        <span className={`font-bold ${m.aggregate <= (sheet.meta.levelName.includes("Junior") ? 24 : 18) ? "text-emerald-600" : m.aggregate <= (sheet.meta.levelName.includes("Junior") ? 36 : 27) ? "text-amber-600" : "text-rose-600"}`}>
                          {m.aggregate}<span className="text-[10px] font-medium text-slate-400">/{m.aggregateMax}</span>
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${m.promotionStatus === "PROMOTED" ? "bg-emerald-100 text-emerald-700" : m.promotionStatus === "CONDITIONAL" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>
                        {m.promotionStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overall summary */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryCard label="Class Average" value={sheet.meta.overallAverage ?? "—"} />
            <SummaryCard label="Highest" value={sheet.meta.overallHighest ?? "—"} />
            <SummaryCard label="Lowest" value={sheet.meta.overallLowest ?? "—"} />
            <SummaryCard label="Class Aggregate" value={sheet.meta.classAggregateAverage ?? "—"} />
            <SummaryCard label="Best / Worst Aggregate" value={sheet.meta.bestAggregate !== null ? `${sheet.meta.bestAggregate} / ${sheet.meta.worstAggregate}` : "—"} />
            <SummaryCard label="Promoted" value={`${sheet.meta.promoted} · ${sheet.meta.conditional} conditional`} />
            <SummaryCard label="Repeat" value={`${sheet.meta.repeat} students`} />
          </div>

          {/* Per-student summary — average %, aggregate & rank */}
          <div className="card overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="font-semibold text-slate-900">Class summary — position, average & aggregate</h3>
              <p className="mt-0.5 text-xs text-slate-400">
                {sheet.meta.levelName.includes("Junior")
                  ? "BECE aggregate: sum of the best 6 subject grades (1 = best … 9 = worst, min 6, max 54)"
                  : sheet.meta.levelName.includes("Senior")
                    ? "WASSCE aggregate: 4 core subjects + 2 best electives (min 6, max 36)"
                    : "Aggregates apply to JHS (BECE) and SHS (WASSCE) only."}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="table text-sm">
                <thead>
                  <tr>
                    <th>Position</th>
                    <th>Student</th>
                    <th>Adm. No</th>
                    <th className="text-center">Average %</th>
                    <th className="text-center">Aggregate</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sheet.summary.map((r) => (
                    <tr key={r.studentId}>
                      <td className="font-semibold text-slate-500">{r.position}</td>
                      <td className="font-medium text-slate-800">{r.fullName}</td>
                      <td className="font-mono text-xs text-slate-500">{r.admissionNo}</td>
                      <td className="text-center font-bold text-slate-800">{r.average}</td>
                      <td className="text-center">
                        {r.aggregate !== null ? (
                          <span className="font-bold text-slate-700">{r.aggregate}<span className="text-[10px] font-medium text-slate-400">/{r.aggregateMax}</span></span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${r.promotionStatus === "PROMOTED" ? "bg-emerald-100 text-emerald-700" : r.promotionStatus === "CONDITIONAL" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>
                          {r.promotionStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="font-semibold text-slate-900">Broad Sheet — subject analysis</h3>
              <p className="mt-0.5 text-xs text-slate-400">Class average, spread, pass rate and predicted grade distribution per subject</p>
            </div>
            <div className="overflow-x-auto">
              <table className="table text-sm">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th className="text-center">Students</th>
                    <th className="text-center">Average</th>
                    <th className="text-center">Highest</th>
                    <th className="text-center">Lowest</th>
                    <th className="text-center">Pass</th>
                    <th className="text-center">Pass Rate</th>
                    <th>Grade Distribution</th>
                  </tr>
                </thead>
                <tbody>
                  {sheet.broad.map((b) => (
                    <tr key={b.subject}>
                      <td className="font-medium text-slate-800">{b.subject}</td>
                      <td className="text-center">{b.count}</td>
                      <td className="text-center font-bold text-slate-800">{b.average ?? "—"}</td>
                      <td className="text-center text-emerald-600">{b.highest ?? "—"}</td>
                      <td className="text-center text-rose-600">{b.lowest ?? "—"}</td>
                      <td className="text-center">{b.passCount}</td>
                      <td className="text-center">{b.passRate !== null ? `${b.passRate}%` : "—"}</td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {b.gradeDist.length === 0 && <span className="text-xs text-slate-300">—</span>}
                          {b.gradeDist.map((g) => (
                            <span key={g.grade} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
                              {g.grade}: {g.count}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-800">{value}</p>
    </div>
  );
}

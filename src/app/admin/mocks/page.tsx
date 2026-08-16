"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight, ArrowUpRight, Download, FileSpreadsheet, GraduationCap,
  ListChecks, Printer, Save, Sparkles, Table2, TrendingUp, Wand2,
} from "lucide-react";
import { api } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/admin/page-header";
import { useToast } from "@/components/ui/toast";

type Meta = { classes: { id: string; name: string }[]; terms: { id: string; name: string; academicYearId: string }[]; years: { id: string; name: string }[] };
type MockStructure = {
  className: string; levelCode: string; levelName: string; termName: string; yearName: string;
  subjects: { id: string; name: string; core: boolean }[];
  mockNumbers: number[];
  students: { id: string; admissionNo: string; fullName: string }[];
  scores: Record<string, number>;
};
type SubjectStat = { subjectId: string; subject: string; core: boolean; perMockAverages: (number | null)[]; trend: number | null; classAverage: number | null; highest: number | null; lowest: number | null; passCount: number; passRate: number | null; gradeDist: { grade: string; count: number }[] };
type Analysis = {
  className: string; levelCode: string; termName: string; yearName: string;
  subjects: { id: string; name: string; core: boolean }[];
  mockNumbers: number[];
  students: {
    studentId: string; admissionNo: string; fullName: string; position: number;
    subjects: { subjectId: string; subject: string; core: boolean; scores: (number | null)[]; average: number | null; best: number | null; worst: number | null; trend: number | null; grade: string | null; points: number | null; remark: string | null; passed: boolean | null }[];
    overallAverage: number | null; overallGrade: string | null; overallPoints: number | null; overallRemark: string | null; overallPassed: boolean | null;
    aggregate: number | null; aggregateMax: number; aggregateUsed: string[];
  }[];
  subjectStats: SubjectStat[];
};

const TABS = [
  ["setup", "Setup mocks", Wand2],
  ["entry", "Enter scores", Table2],
  ["analysis", "Analysis", Sparkles],
] as const;

// Only Basic 9 (BECE) and SHS (WASSCE) classes run the mock series.
const isMockClass = (name: string) => name.startsWith("Basic 9") || name.startsWith("SHS");

export default function MockAnalysisPage() {
  const toast = useToast();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [classId, setClassId] = useState("");
  const [termId, setTermId] = useState("");
  const [tab, setTab] = useState<"setup" | "entry" | "analysis">("setup");
  const [count, setCount] = useState("5");
  const [struct, setStruct] = useState<MockStructure | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [entryMock, setEntryMock] = useState(1);
  const [entry, setEntry] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const mockClasses = useMemo(() => (meta?.classes ?? []).filter((c) => isMockClass(c.name)), [meta]);

  useEffect(() => {
    api<Meta>("/api/meta").then(setMeta).catch(() => {});
  }, []);

  useEffect(() => {
    if (!meta) return;
    if (!classId) {
      const basic9 = mockClasses.find((c) => c.name.startsWith("Basic 9"));
      setClassId((basic9 ?? mockClasses[0])?.id ?? "");
    }
    if (!termId) {
      const current = meta.terms.find((t) => t.name === "First Term") ?? meta.terms[0];
      if (current) setTermId(current.id);
    }
  }, [meta, classId, termId, mockClasses]);

  const yearId = useMemo(() => meta?.terms.find((t) => t.id === termId)?.academicYearId ?? meta?.years[0]?.id ?? "", [meta, termId]);

  const loadStructure = useCallback(async () => {
    if (!classId || !termId) return;
    try {
      const data = await api<MockStructure>(`/api/mocks?classId=${classId}&termId=${termId}&academicYearId=${yearId}`);
      setStruct(data);
      if (data.mockNumbers.length) {
        setEntryMock(data.mockNumbers[0]);
        const e: Record<string, string> = {};
        for (const n of data.mockNumbers) {
          for (const subj of data.subjects) {
            for (const st of data.students) {
              const v = data.scores[`${n}:${subj.id}:${st.id}`];
              if (v !== undefined) e[`${n}:${subj.id}:${st.id}`] = String(v);
            }
          }
        }
        setEntry(e);
      } else {
        setEntry({});
      }
    } catch (e) {
      toast.toast({ title: "Failed to load mocks", description: (e as Error).message, variant: "error" });
    }
  }, [classId, termId, yearId, toast]);

  const loadAnalysis = useCallback(async () => {
    if (!classId || !termId) return;
    try {
      setAnalysis(await api<Analysis>(`/api/mocks/analysis?classId=${classId}&termId=${termId}&academicYearId=${yearId}`));
    } catch (e) {
      toast.toast({ title: "Failed to load analysis", description: (e as Error).message, variant: "error" });
    }
  }, [classId, termId, yearId, toast]);

  useEffect(() => {
    if (classId && termId) loadStructure();
  }, [classId, termId, loadStructure]);

  useEffect(() => {
    if (tab === "analysis" && classId && termId) loadAnalysis();
  }, [tab, classId, termId, loadAnalysis]);

  async function setupMocks(e: React.FormEvent) {
    e.preventDefault();
    const n = Math.max(5, Math.min(12, Number(count) || 5));
    setBusy(true);
    try {
      await api("/api/mocks", {
        method: "POST",
        body: JSON.stringify({ classId, termId, academicYearId: yearId, count: n }),
      });
      toast.toast({ title: `${n} mocks ready`, description: "Scores can now be entered per subject.", variant: "success" });
      setCount(String(n));
      await loadStructure();
      setTab("entry");
    } catch (e) {
      toast.toast({ title: "Setup failed", description: (e as Error).message, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function saveScores() {
    if (!struct) return;
    setBusy(true);
    try {
      const scores = struct.students.flatMap((st) =>
        struct.subjects.map((subj) => {
          const raw = entry[`${entryMock}:${subj.id}:${st.id}`]?.trim() ?? "";
          return { studentId: st.id, subjectId: subj.id, score: raw === "" ? null : Number(raw) };
        })
      );
      const res = await api<{ saved: number; removed: number }>("/api/mocks/scores", {
        method: "PUT",
        body: JSON.stringify({ classId, termId, academicYearId: yearId, mockNumber: entryMock, scores }),
      });
      toast.toast({ title: `Mock ${entryMock} saved`, description: `${res.saved} scores saved · ${res.removed} cleared`, variant: "success" });
      await loadStructure();
    } catch (e) {
      toast.toast({ title: "Save failed", description: (e as Error).message, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function exportAnalysis(format: "csv" | "xlsx") {
    if (!classId || !termId) return;
    const res = await fetch(`/api/mocks/export?classId=${classId}&termId=${termId}&academicYearId=${yearId}&format=${format}`);
    if (!res.ok) {
      toast.toast({ title: "Export failed", variant: "error" });
      return;
    }
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Mock-Analysis_${analysis?.className ?? classId}_${analysis?.termName ?? termId}.${format}`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.toast({ title: `Exported as ${format.toUpperCase()}`, variant: "success" });
  }

  const mockOptions = struct?.mockNumbers.length ? struct.mockNumbers : Array.from({ length: Math.max(5, Number(count) || 5) }, (_, i) => i + 1);
  const overallAvgs = analysis?.students.map((s) => s.overallAverage ?? null).filter((v): v is number => v !== null) ?? [];
  const classPredictedAvg = overallAvgs.length ? Math.round((overallAvgs.reduce((a, b) => a + b, 0) / overallAvgs.length) * 100) / 100 : null;

  return (
    <div>
      <PageHeader
        title="Mock Exam Analysis"
        subtitle="BECE (Basic 9) & WASSCE (SHS) preparation — a series of at least 5 mocks per subject, with predicted grades and class trends."
        action={
          analysis ? (
            <>
              <Button variant="outline" onClick={() => exportAnalysis("csv")}><Download className="h-4 w-4" /> Export CSV</Button>
              <Button variant="outline" onClick={() => exportAnalysis("xlsx")}><FileSpreadsheet className="h-4 w-4" /> Export Excel</Button>
              <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
            </>
          ) : undefined
        }
      />

      <div className="card mb-5 flex flex-wrap items-end gap-4 p-5">
        <Field label="Class (Basic 9 / SHS only)">
          <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">— pick a class —</option>
            {mockClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Term">
          <Select value={termId} onChange={(e) => setTermId(e.target.value)}>
            <option value="">— pick a term —</option>
            {meta?.terms.map((t) => <option key={t.id} value={t.id}>{t.name} · {meta.years.find((y) => y.id === t.academicYearId)?.name}</option>)}
          </Select>
        </Field>
        <p className="text-xs text-slate-400">Core subjects (English, Maths, Integrated Science, Social Studies…) are listed first.</p>
      </div>

      <div className="mb-5 flex gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
        {TABS.map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)} className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === key ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50"}`}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {!struct && tab !== "analysis" && (
        <div className="card p-10 text-center text-sm text-slate-400">{classId && termId ? "Loading…" : "Pick a class and term."}</div>
      )}

      {tab === "setup" && struct && (
        <div className="card max-w-2xl p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-ink"><Wand2 className="h-5 w-5 text-primary" /> Create the mock series</h3>
          <p className="mt-1 text-sm text-slate-500">
            GES schools run <strong>at least 5 mocks</strong> per subject before the real exam. This creates <strong>Mock 1 … Mock N</strong> for every
            subject in <strong>{struct.className}</strong> ({struct.subjects.length} subjects). You can add more mocks later.
          </p>
          {struct.mockNumbers.length > 0 && (
            <p className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-100">
              ✅ Already have mocks: <strong>{struct.mockNumbers.map((n) => `Mock ${n}`).join(", ")}</strong>. You can extend the series below.
            </p>
          )}
          <form onSubmit={setupMocks} className="mt-4 flex items-end gap-4">
            <Field label="Number of mocks (min 5)" hint="Up to 12">
              <Input type="number" min={5} max={12} value={count} onChange={(e) => setCount(e.target.value)} />
            </Field>
            <Button type="submit" loading={busy}><Wand2 className="h-4 w-4" /> Create / extend mocks</Button>
          </form>
        </div>
      )}

      {tab === "entry" && struct && (
        <div className="space-y-4">
          <div className="card flex flex-wrap items-end gap-4 p-5">
            <Field label="Mock">
              <Select value={String(entryMock)} onChange={(e) => setEntryMock(Number(e.target.value))}>
                {mockOptions.map((n) => <option key={n} value={n}>Mock {n}</option>)}
              </Select>
            </Field>
            <Button onClick={saveScores} loading={busy}><Save className="h-4 w-4" /> Save Mock {entryMock}</Button>
            <p className="text-xs text-slate-400">Enter each student's score (0–100) per subject. Leave blank to clear a score.</p>
          </div>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table text-sm">
                <thead>
                  <tr>
                    <th>Student</th>
                    {struct.subjects.map((s) => (
                      <th key={s.id} className={`text-center ${s.core ? "bg-primary-soft/50" : ""}`}>
                        {s.name} {s.core && <span className="ml-1 rounded bg-primary px-1 py-0.5 text-[9px] font-bold text-white">CORE</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {struct.students.map((st) => (
                    <tr key={st.id}>
                      <td className="min-w-44 font-medium text-slate-800">
                        {st.fullName}
                        <span className="ml-2 font-mono text-[10px] text-slate-400">{st.admissionNo}</span>
                      </td>
                      {struct.subjects.map((subj) => (
                        <td key={subj.id} className="text-center">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step="0.5"
                            value={entry[`${entryMock}:${subj.id}:${st.id}`] ?? ""}
                            onChange={(e) => setEntry((prev) => ({ ...prev, [`${entryMock}:${subj.id}:${st.id}`]: e.target.value }))}
                            className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-center text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "analysis" && (
        <div className="space-y-6">
          {!analysis ? (
            <div className="card p-10 text-center text-sm text-slate-400">{classId && termId ? "Loading…" : "Pick a class and term."}</div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <SummaryCard label="Class" value={analysis.className} />
                <SummaryCard label="Term" value={`${analysis.termName} · ${analysis.yearName}`} />
                <SummaryCard label="Mocks sat" value={analysis.mockNumbers.length} />
                <SummaryCard label="Class predicted avg" value={classPredictedAvg ?? "—"} />
                <SummaryCard label="Students" value={analysis.students.length} />
              </div>

              {/* Per-student predicted grades */}
              <div className="card overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div>
                    <h3 className="flex items-center gap-2 font-semibold text-slate-900"><GraduationCap className="h-4 w-4 text-primary" /> Predicted grades per student</h3>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {analysis.levelCode === "JHS" ? "BECE grading (1 = highest … 9 = lowest)" : "WASSCE grading (A+ = highest … F = lowest)"} — average across {analysis.mockNumbers.length} mocks
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="table text-sm">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Student</th>
                        {analysis.subjects.map((s) => (
                          <th key={s.id} className={`text-center ${s.core ? "bg-primary-soft/50" : ""}`}>{s.name}</th>
                        ))}
                        <th className="text-center">Average %</th>
                        <th className="text-center">Predicted</th>
                        <th className="text-center">Aggregate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.students.map((st) => (
                        <tr key={st.studentId}>
                          <td className="font-semibold text-slate-500">{st.position}</td>
                          <td className="min-w-44 font-medium text-slate-800">{st.fullName}</td>
                          {st.subjects.map((subj) => (
                            <td key={subj.subjectId} className="text-center whitespace-nowrap px-2">
                              <span className="font-semibold text-slate-700">{subj.average ?? "—"}</span>
                              <span className={`ml-1 font-bold ${subj.passed === false ? "text-rose-600" : "text-emerald-600"}`}>{subj.grade ?? "—"}</span>
                              {subj.trend !== null && (
                                <span className={`ml-1 text-[10px] ${subj.trend > 0 ? "text-emerald-500" : subj.trend < 0 ? "text-rose-500" : "text-slate-300"}`}>
                                  {subj.trend > 0 ? <ArrowUpRight className="inline h-3 w-3" /> : subj.trend < 0 ? <ArrowDownRight className="inline h-3 w-3" /> : ""}{subj.trend > 0 ? `+${subj.trend}` : subj.trend}
                                </span>
                              )}
                            </td>
                          ))}
                          <td className="text-center font-bold text-slate-800">{st.overallAverage ?? "—"}</td>
                          <td className="text-center">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${st.overallPassed === false ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                              {st.overallGrade ?? "—"}
                            </span>
                          </td>
                          <td className="text-center">
                            {st.aggregate !== null ? (
                              <span className={`font-bold ${st.aggregate <= (analysis.levelCode === "JHS" ? 24 : 18) ? "text-emerald-600" : st.aggregate <= (analysis.levelCode === "JHS" ? 36 : 27) ? "text-amber-600" : "text-rose-600"}`}>
                                {st.aggregate}<span className="text-[10px] font-medium text-slate-400">/{st.aggregateMax}</span>
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Predicted aggregate summary */}
              <div className="card overflow-hidden">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h3 className="flex items-center gap-2 font-semibold text-slate-900"><GraduationCap className="h-4 w-4 text-primary" /> Predicted aggregate</h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {analysis.levelCode === "JHS"
                      ? "BECE aggregate: the student's best 6 subject grades summed (1 = highest … 9 = lowest; min 6, max 54)."
                      : "WASSCE aggregate: 4 core subjects + 2 best electives summed (A+ = 1 … F = 9; min 6, max 36)."}{" "}
                    The lower the aggregate, the better the predicted placement.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="table text-sm">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Student</th>
                        <th className="text-center">Average %</th>
                        <th className="text-center">Predicted aggregate</th>
                        <th>Subjects used</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.students
                        .filter((st) => st.aggregate !== null)
                        .sort((a, b) => (a.aggregate ?? 99) - (b.aggregate ?? 99))
                        .map((st, i) => (
                          <tr key={st.studentId}>
                            <td className="font-semibold text-slate-500">{i + 1}</td>
                            <td className="font-medium text-slate-800">{st.fullName}</td>
                            <td className="text-center font-bold text-slate-800">{st.overallAverage ?? "—"}</td>
                            <td className="text-center">
                              <span className={`rounded-lg px-2.5 py-1 font-bold ${st.aggregate !== null && st.aggregate <= (analysis.levelCode === "JHS" ? 24 : 18) ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                                {st.aggregate}<span className="text-[10px] font-medium">/{st.aggregateMax}</span>
                              </span>
                            </td>
                            <td className="max-w-md text-xs text-slate-500">{st.aggregateUsed.join(" · ")}</td>
                          </tr>
                        ))}
                      {analysis.students.filter((st) => st.aggregate !== null).length === 0 && (
                        <tr><td colSpan={5} className="py-8 text-center text-slate-400">No complete aggregates yet — {analysis.levelCode === "JHS" ? "at least 6 subjects" : "the 4 core subjects + 2 electives"} need scores.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Per-subject class analysis */}
              <div className="card overflow-hidden">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h3 className="flex items-center gap-2 font-semibold text-slate-900"><TrendingUp className="h-4 w-4 text-primary" /> Subject analysis — class trends across mocks</h3>
                  <p className="mt-0.5 text-xs text-slate-400">The class average of each mock shows improvement (or decline) across the series</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="table text-sm">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        {analysis.mockNumbers.map((n) => <th key={n} className="text-center">Mock {n}</th>)}
                        <th className="text-center">Trend</th>
                        <th className="text-center">Class Avg</th>
                        <th className="text-center">Highest</th>
                        <th className="text-center">Lowest</th>
                        <th className="text-center">Pass Rate</th>
                        <th>Predicted grades</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.subjectStats.map((s) => (
                        <tr key={s.subjectId}>
                          <td className="font-medium text-slate-800">
                            {s.subject} {s.core && <span className="ml-1 rounded bg-primary px-1 py-0.5 text-[9px] font-bold text-white">CORE</span>}
                          </td>
                          {s.perMockAverages.map((v, i) => <td key={i} className="text-center">{v ?? "—"}</td>)}
                          <td className="text-center">
                            {s.trend !== null ? (
                              <span className={`inline-flex items-center gap-0.5 font-semibold ${s.trend > 0 ? "text-emerald-600" : s.trend < 0 ? "text-rose-600" : "text-slate-400"}`}>
                                {s.trend > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : s.trend < 0 ? <ArrowDownRight className="h-3.5 w-3.5" /> : ""}{s.trend > 0 ? `+${s.trend}` : s.trend}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="text-center font-bold text-slate-800">{s.classAverage ?? "—"}</td>
                          <td className="text-center text-emerald-600">{s.highest ?? "—"}</td>
                          <td className="text-center text-rose-600">{s.lowest ?? "—"}</td>
                          <td className="text-center">{s.passRate !== null ? `${s.passRate}%` : "—"}</td>
                          <td>
                            <div className="flex flex-wrap gap-1">
                              {s.gradeDist.map((g) => (
                                <span key={g.grade} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">{g.grade}: {g.count}</span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card p-5">
                <h3 className="text-sm font-semibold text-slate-800"><ListChecks className="mr-1 inline h-4 w-4 text-primary" /> How to read this</h3>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-500">
                  <li>The <strong>predicted grade</strong> is the grade the student's average across all mocks would earn on the real exam ({analysis.levelCode === "JHS" ? "BECE scale: 1–9" : "WASSCE scale: A+–F"}).</li>
                  <li>The <strong>trend</strong> (arrow) compares the last mock with the first — a rising arrow means the student/class is improving.</li>
                  <li>A <strong>red grade</strong> is a fail on the real exam ({analysis.levelCode === "JHS" ? "grade 9" : "F"}). Students in red need intervention before the exam.</li>
                  <li>Use <strong>Export Excel</strong> for the full per-student × subject × mock breakdown, or <strong>Print</strong> for a paper copy.</li>
                </ul>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 truncate text-xl font-bold text-slate-800">{value}</p>
    </div>
  );
}

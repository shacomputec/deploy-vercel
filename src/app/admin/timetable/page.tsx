"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CalendarDays, CheckCircle2, Save, ShieldAlert, UserRound } from "lucide-react";
import { api } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/admin/page-header";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

type Meta = {
  classes: { id: string; name: string }[];
  years: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
  teachers: { id: string; fullName: string }[];
};
type Entry = { day: number; period: number; startTime: string | null; endTime: string | null; subjectId: string; teacherId: string | null; subject: { name: string } };
type ClashReport = {
  errors: { type: string; detail: string; day?: string; period?: number }[];
  warnings: { type: string; detail: string; day?: string; period?: number }[];
  stats: { classes: number; classesWithTimetable: number; lessons: number; teacherClashes: number };
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const PERIODS = [1, 2, 3, 4, 5, 6];
const TIMES = ["8:00", "8:50", "9:40", "10:30", "11:20", "12:10", "13:00", "13:50", "14:40", "15:30"];

export default function TimetablePage() {
  const toast = useToast();
  const [meta, setMeta] = useState<Meta>({ classes: [], years: [], subjects: [], teachers: [] });
  const [classId, setClassId] = useState("");
  const [yearId, setYearId] = useState("");
  const [grid, setGrid] = useState<Record<string, { subjectId: string; teacherId: string }>>({});
  const [classAssignments, setClassAssignments] = useState<Record<string, string>>({}); // subjectId -> teacherId
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [report, setReport] = useState<ClashReport | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => { api<Meta>("/api/meta").then(setMeta).catch(() => {}); }, []);

  // Load the class-subject teacher assignments so cells auto-fill.
  useEffect(() => {
    if (!classId) return;
    api<{ subjects: { subjectId: string; teacherId: string | null }[] }>(`/api/classes/${classId}`)
      .then((d) => {
        const map: Record<string, string> = {};
        for (const s of d.subjects ?? []) if (s.teacherId) map[s.subjectId] = s.teacherId;
        setClassAssignments(map);
      })
      .catch(() => {});
  }, [classId]);

  const load = useCallback(async () => {
    if (!classId) return;
    setLoaded(false);
    try {
      const rows = await api<Entry[]>(`/api/timetable?classId=${classId}${yearId ? `&academicYearId=${yearId}` : ""}`);
      const g: Record<string, { subjectId: string; teacherId: string }> = {};
      for (const r of rows) g[`${r.day}-${r.period}`] = { subjectId: r.subjectId, teacherId: r.teacherId ?? "" };
      setGrid(g);
    } catch (e) {
      toast.toast({ title: "Failed to load timetable", description: (e as Error).message, variant: "error" });
    } finally {
      setLoaded(true);
    }
  }, [classId, yearId, toast]);

  useEffect(() => { load(); }, [load]);

  function setCell(day: number, period: number, subjectId: string) {
    setGrid((g) => {
      const key = `${day}-${period}`;
      const next = { ...g };
      if (!subjectId) delete next[key];
      else next[key] = { subjectId, teacherId: g[key]?.teacherId || classAssignments[subjectId] || "" };
      return next;
    });
  }

  function setTeacher(day: number, period: number, teacherId: string) {
    setGrid((g) => {
      const key = `${day}-${period}`;
      if (!g[key]?.subjectId) return g;
      return { ...g, [key]: { ...g[key], teacherId } };
    });
  }

  async function save() {
    if (!classId) return;
    setSaving(true);
    try {
      const entries = Object.entries(grid)
        .filter(([, v]) => v.subjectId)
        .map(([key, v]) => {
          const [day, period] = key.split("-").map(Number);
          return { day: day!, period: period!, subjectId: v.subjectId, teacherId: v.teacherId || null };
        });
      const res = await api<{ saved: number; warnings: string[] }>("/api/timetable", { method: "POST", body: JSON.stringify({ classId, academicYearId: yearId, entries }) });
      setWarnings(res.warnings ?? []);
      toast.toast({
        title: res.warnings?.length ? "Saved with warnings" : "Timetable saved",
        description: res.warnings?.length ? `${res.warnings.length} warning(s) — see below` : `${res.saved} lessons on the grid`,
        variant: res.warnings?.length ? "info" : "success",
      });
    } catch (e) {
      toast.toast({ title: "Save blocked — clash found", description: (e as Error).message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function checkClashes() {
    setReportOpen(true);
    setReport(null);
    try {
      const r = await api<ClashReport>(`/api/timetable/clashes${yearId ? `?academicYearId=${yearId}` : ""}`);
      setReport(r);
    } catch (e) {
      toast.toast({ title: "Clash check failed", description: (e as Error).message, variant: "error" });
      setReportOpen(false);
    }
  }

  const activeYear = meta.years.find((y) => y.id === yearId)?.name ?? "2024/2025";

  return (
    <div>
      <PageHeader
        title="Timetable Builder"
        subtitle="Design the weekly class timetable — teacher clashes are caught automatically."
        action={
          classId ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={checkClashes}><ShieldAlert className="h-4 w-4" /> Check clashes</Button>
              <Button onClick={save} loading={saving}><Save className="h-4 w-4" /> Save Timetable</Button>
            </div>
          ) : undefined
        }
      />

      <div className="card mb-6 flex flex-wrap items-end gap-4 p-5">
        <Field label="Class" className="min-w-56">
          <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Select class…</option>
            {meta.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Academic year" className="min-w-56">
          <Select value={yearId} onChange={(e) => setYearId(e.target.value)}>
            <option value="">Current</option>
            {meta.years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
          </Select>
        </Field>
      </div>

      {warnings.length > 0 && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-800"><AlertTriangle className="h-4 w-4" /> {warnings.length} warning(s) on the last save</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-700">
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {!classId ? <EmptyState title="Select a class" hint="Then fill the grid with lessons for each day and period." /> : !loaded ? (
        <div className="card p-8"><div className="skeleton h-4 w-full" /></div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Period</th>
                {DAYS.map((d) => (
                  <th key={d} className="px-3 py-3 text-center font-semibold text-slate-700">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERIODS.map((p) => (
                <tr key={p} className="border-b border-slate-100 align-top">
                  <td className="px-4 py-2 text-slate-400">
                    <p className="font-semibold text-slate-600">Period {p}</p>
                    <p className="text-xs">{TIMES[p - 1]} – {TIMES[p]}</p>
                  </td>
                  {DAYS.map((_, di) => {
                    const cell = grid[`${di}-${p}`];
                    return (
                      <td key={di} className="px-2 py-2">
                        <Select
                          value={cell?.subjectId ?? ""}
                          onChange={(e) => setCell(di, p, e.target.value)}
                          className="w-full text-xs"
                        >
                          <option value="">— Free —</option>
                          {meta.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </Select>
                        {cell?.subjectId && (
                          <>
                            <Select
                              value={cell.teacherId ?? ""}
                              onChange={(e) => setTeacher(di, p, e.target.value)}
                              className="mt-1 w-full text-[10px]"
                              title="Teacher"
                            >
                              <option value="">No teacher…</option>
                              {meta.teachers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
                            </Select>
                            {cell.teacherId && <p className="mt-0.5 text-center text-[9px] text-emerald-600"><UserRound className="mr-0.5 inline h-3 w-3" />assigned</p>}
                          </>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <p className="flex items-center gap-2 text-xs text-slate-400"><CalendarDays className="h-4 w-4" /> {activeYear} · {Object.values(grid).filter((v) => v.subjectId).length} lessons</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={checkClashes}><ShieldAlert className="h-4 w-4" /> Check clashes</Button>
              <Button size="sm" onClick={save} loading={saving}><Save className="h-4 w-4" /> Save</Button>
            </div>
          </div>
        </div>
      )}

      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="Timetable clash report" wide>
        {!report ? (
          <div className="p-6"><div className="skeleton h-4 w-full" /></div>
        ) : (
          <div className="space-y-4 p-1">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Classes checked", value: report.stats.classes },
                { label: "With timetable", value: report.stats.classesWithTimetable },
                { label: "Lessons", value: report.stats.lessons },
                { label: "Teacher clashes", value: report.stats.teacherClashes },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                  <p className="text-xl font-extrabold text-slate-800">{s.value}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
                </div>
              ))}
            </div>

            {report.errors.length === 0 && report.warnings.length === 0 ? (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                <CheckCircle2 className="h-5 w-5" /> No clashes found across all classes. 
              </div>
            ) : (
              <>
                {report.errors.length > 0 && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                    <p className="flex items-center gap-2 text-sm font-bold text-rose-700"><AlertTriangle className="h-4 w-4" /> {report.errors.length} error(s) — must be fixed</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-rose-700">
                      {report.errors.map((e, i) => <li key={i}>{e.detail}</li>)}
                    </ul>
                  </div>
                )}
                {report.warnings.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="flex items-center gap-2 text-sm font-bold text-amber-700"><AlertTriangle className="h-4 w-4" /> {report.warnings.length} warning(s) — please review</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-700">
                      {report.warnings.map((w, i) => <li key={i}>{w.detail}</li>)}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

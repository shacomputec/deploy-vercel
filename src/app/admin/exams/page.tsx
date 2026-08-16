"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, MapPin, Plus, Printer, Trash2, UserRound } from "lucide-react";
import { EmptyState } from "@/components/ui/empty";
import { api } from "@/lib/client";
import { fmtDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/admin/page-header";
import { useToast } from "@/components/ui/toast";

type Exam = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string | null;
  invigilator: string | null;
  notes: string | null;
  class: { id: string; name: string };
  subject: { id: string; name: string; code: string | null };
  term: { id: string; name: string } | null;
};

type Meta = { classes: { id: string; name: string }[]; terms: { id: string; name: string; academicYear: { name: string } }[]; subjects: { id: string; name: string }[] };

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function ExamsPage() {
  const toast = useToast();
  const [exams, setExams] = useState<Exam[]>([]);
  const [meta, setMeta] = useState<Meta>({ classes: [], terms: [], subjects: [] });
  const [classFilter, setClassFilter] = useState("");
  const [termFilter, setTermFilter] = useState("");
  const [addModal, setAddModal] = useState(false);
  const [form, setForm] = useState({ classId: "", subjectId: "", termId: "", date: "", startTime: "08:30", endTime: "10:00", venue: "", invigilator: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (classFilter) params.set("classId", classFilter);
      if (termFilter) params.set("termId", termFilter);
      const q = params.toString();
      setExams(await api<Exam[]>("/api/exams" + (q ? `?${q}` : "")));
    } catch (e) {
      toast.toast({ title: "Failed to load timetable", description: (e as Error).message, variant: "error" });
    }
  }, [classFilter, termFilter, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api<Meta>("/api/meta").then(setMeta).catch(() => {});
  }, []);

  // Group exams by day so the timetable reads like a real examination schedule.
  const byDay = useMemo(() => {
    const map = new Map<string, Exam[]>();
    for (const e of exams) {
      const key = e.date.slice(0, 10);
      (map.get(key) ?? map.set(key, []).get(key)!).push(e);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [exams]);

  // ── Clash detector: catches every kind of scheduling conflict ──
  //   1. same class + same day + overlapping times (a class can't write two
  //      papers at once)
  //   2. same venue + same day + overlapping times (no two classes in one hall)
  //   3. same class + same day + same subject (a duplicate paper)
  //   4. same invigilator + same day + overlapping times (a double booking)
  const clashes = useMemo(() => {
    const mins = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    const overlaps = (x: Exam, y: Exam) => mins(x.startTime) < mins(y.endTime) && mins(y.startTime) < mins(x.endTime);
    const sameDay = (x: Exam, y: Exam) => x.date.slice(0, 10) === y.date.slice(0, 10);
    const flagged = new Set<string>();
    const details: { a: Exam; b: Exam; why: string }[] = [];
    for (let i = 0; i < exams.length; i++) {
      for (let j = i + 1; j < exams.length; j++) {
        const x = exams[i], y = exams[j];
        if (x.id === y.id) continue;
        // 1. class overlap
        if (x.class.id === y.class.id && sameDay(x, y) && overlaps(x, y)) {
          flagged.add(x.id); flagged.add(y.id);
          details.push({ a: x, b: y, why: "same class — a class cannot write two papers at once" });
          continue;
        }
        // 2. venue overlap
        const xv = (x.venue || "").trim().toLowerCase();
        const yv = (y.venue || "").trim().toLowerCase();
        if (xv && yv && xv === yv && sameDay(x, y) && overlaps(x, y)) {
          flagged.add(x.id); flagged.add(y.id);
          details.push({ a: x, b: y, why: `same venue “${x.venue}” booked twice` });
          continue;
        }
        // 3. duplicate subject for the same class on the same day
        if (x.class.id === y.class.id && x.subject.id === y.subject.id && sameDay(x, y)) {
          flagged.add(x.id); flagged.add(y.id);
          details.push({ a: x, b: y, why: "duplicate paper — this subject is already scheduled for this class on this day" });
          continue;
        }
        // 4. invigilator double-booking
        const xi = (x.invigilator || "").trim().toLowerCase();
        const yi = (y.invigilator || "").trim().toLowerCase();
        if (xi && yi && xi === yi && sameDay(x, y) && overlaps(x, y)) {
          flagged.add(x.id); flagged.add(y.id);
          details.push({ a: x, b: y, why: `invigilator “${x.invigilator}” is double-booked` });
        }
      }
    }
    return { flagged, details };
  }, [exams]);

  async function addExam(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/api/exams", { method: "POST", body: JSON.stringify(form) });
      toast.toast({ title: "Exam scheduled", variant: "success" });
      setAddModal(false);
      setForm({ classId: "", subjectId: "", termId: "", date: "", startTime: "08:30", endTime: "10:00", venue: "", invigilator: "", notes: "" });
      load();
    } catch (err) {
      toast.toast({ title: "Scheduling failed", description: (err as Error).message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this exam from the timetable?")) return;
    try {
      await api(`/api/exams/${id}`, { method: "DELETE" });
      load();
    } catch (err) {
      toast.toast({ title: "Delete failed", description: (err as Error).message, variant: "error" });
    }
  }

  const dayLabel = (iso: string) => {
    const d = new Date(iso + "T00:00:00");
    return `${WEEKDAYS[d.getDay()]}, ${fmtDate(d)}`;
  };

  return (
    <div>
      <PageHeader
        title="Exam Timetable"
        subtitle={`${exams.length} papers scheduled${classFilter ? " for the selected class" : " across all classes"}`}
        action={<Button onClick={() => setAddModal(true)}><Plus className="h-4 w-4" /> Schedule Exam</Button>}
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="w-full max-w-xs">
          <Select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
            <option value="">All classes</option>
            {meta.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <div className="w-full max-w-xs">
          <Select value={termFilter} onChange={(e) => setTermFilter(e.target.value)}>
            <option value="">All terms</option>
            {meta.terms.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.academicYear.name}</option>)}
          </Select>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          Papers appear instantly for teachers & students on the timetable view
        </span>
        <div className="ml-auto">
          <Button
            variant="outline"
            disabled={exams.length === 0}
            onClick={() => {
              const params = new URLSearchParams();
              if (classFilter) params.set("classId", classFilter);
              if (termFilter) params.set("termId", termFilter);
              const q = params.toString();
              window.open(`/reports/print/exam-timetable${q ? `?${q}` : ""}`, "_blank");
            }}
          >
            <Printer className="h-4 w-4" /> Print schedule
          </Button>
        </div>
      </div>

      {clashes.details.length > 0 && (
        <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50/80 px-5 py-4">
          <p className="flex items-center gap-2 text-sm font-bold text-rose-700">
            <AlertTriangle className="h-4 w-4" /> {clashes.details.length} timetable clash{clashes.details.length > 1 ? "es" : ""} detected
          </p>
          <ul className="mt-2 space-y-1 text-xs text-rose-600">
            {clashes.details.map((c, i) => (
              <li key={i}>
                <strong>{c.a.class.name}</strong> · <strong>{c.a.subject.name}</strong> ({c.a.startTime}–{c.a.endTime})
                {" "}conflicts with <strong>{c.b.subject.name}</strong> ({c.b.startTime}–{c.b.endTime}) on {fmtDate(c.a.date)} — {c.why}.
              </li>
            ))}
          </ul>
        </div>
      )}

      {exams.length === 0 ? (
        <EmptyState
          title="No exams scheduled"
          hint="Plan your examination period — pick a class, subject, date, time and venue."
          action={<Button onClick={() => setAddModal(true)}><Plus className="h-4 w-4" /> Schedule Exam</Button>}
        />
      ) : (
        <div className="space-y-6">
          {byDay.map(([day, list]) => (
            <div key={day} className="card overflow-hidden">
              <div className="flex items-center gap-2 border-b border-slate-100 bg-gradient-to-r from-primary/10 to-transparent px-5 py-3">
                <CalendarClock className="h-4 w-4 text-primary" />
                <p className="text-sm font-bold text-slate-800">{dayLabel(day)}</p>
                <span className="ml-auto rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200">{list.length} paper{list.length > 1 ? "s" : ""}</span>
              </div>
              <div className="table-wrap !rounded-none !border-0 !shadow-none">
                <table className="table">
                  <thead>
                    <tr>
                      {clashes.flagged.size > 0 && <th className="w-8" />}
                      <th>Time</th><th>Class</th><th>Subject</th><th>Venue</th><th>Invigilator</th><th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((e) => (
                      <tr key={e.id} className={clashes.flagged.has(e.id) ? "bg-rose-50/70" : ""}>
                        {clashes.flagged.has(e.id) && (
                          <td className="w-8 !bg-rose-50 px-2 text-center"><span title="Clash"><AlertTriangle className="mx-auto h-3.5 w-3.5 text-rose-500" /></span></td>
                        )}
                        <td className={`font-mono text-xs font-semibold ${clashes.flagged.has(e.id) ? "text-rose-600" : "text-primary"}`}>{e.startTime} – {e.endTime}</td>
                        <td className="font-medium text-slate-800">{e.class.name}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-800">{e.subject.name}</span>
                            {e.subject.code && <Badge tone="slate">{e.subject.code}</Badge>}
                            {e.term && <Badge tone="blue">{e.term.name} term</Badge>}
                          </div>
                        </td>
                        <td className="text-xs text-slate-500"><span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{e.venue ?? "—"}</span></td>
                        <td className="text-xs text-slate-500"><span className="inline-flex items-center gap-1"><UserRound className="h-3 w-3" />{e.invigilator ?? "—"}</span></td>
                        <td>
                          <div className="flex justify-end">
                            <button onClick={() => remove(e.id)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Remove">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={addModal} onClose={() => setAddModal(false)} title="Schedule Exam" subtitle="Add a paper to the examination timetable.">
        <form onSubmit={addExam} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Class *">
              <Select required value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}>
                <option value="">Select class…</option>
                {meta.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Subject *">
              <Select required value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
                <option value="">Select subject…</option>
                {meta.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Date *"><Input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="Start *"><Input required type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></Field>
            <Field label="End *"><Input required type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Term">
              <Select value={form.termId} onChange={(e) => setForm({ ...form, termId: e.target.value })}>
                <option value="">Current / unspecified</option>
                {meta.terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </Field>
            <Field label="Venue"><Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} placeholder="e.g. Hall A, Block 2" /></Field>
          </div>
          <Field label="Invigilator"><Input value={form.invigilator} onChange={(e) => setForm({ ...form, invigilator: e.target.value })} placeholder="e.g. Mr. Asante" /></Field>
          <Field label="Notes"><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional — e.g. bring calculators" /></Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setAddModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}><CalendarClock className="h-4 w-4" /> Schedule</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

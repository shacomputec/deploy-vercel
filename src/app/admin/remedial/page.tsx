"use client";

import { useCallback, useEffect, useState } from "react";
import { AlarmClock, MoonStar, Plus, Sun, Trash2 } from "lucide-react";
import { api } from "@/lib/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/admin/page-header";
import { useToast } from "@/components/ui/toast";

type Meta = {
  classes: { id: string; name: string }[];
  years: { id: string; name: string; isCurrent: boolean }[];
  subjects: { id: string; name: string }[];
  teachers: { id: string; fullName: string }[];
};
type Row = {
  id: string;
  session: string;
  day: number;
  startTime: string | null;
  endTime: string | null;
  focus: string | null;
  class: { name: string };
  subject: { name: string };
  teacher: { fullName: string } | null;
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function RemedialPage() {
  const toast = useToast();
  const [meta, setMeta] = useState<Meta>({ classes: [], years: [], subjects: [], teachers: [] });
  const [rows, setRows] = useState<Row[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    classId: "",
    subjectId: "",
    teacherId: "",
    session: "MORNING",
    day: "0",
    startTime: "06:30",
    endTime: "07:20",
    focus: "",
    academicYearId: "",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api<Row[]>("/api/remedial");
      setRows(r);
    } catch (e) {
      toast.toast({ title: "Failed to load", description: (e as Error).message, variant: "error" });
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api<Meta>("/api/meta").then(setMeta).catch(() => {}); }, []);

  function openCreate() {
    setForm({ classId: "", subjectId: "", teacherId: "", session: "MORNING", day: "0", startTime: "06:30", endTime: "07:20", focus: "", academicYearId: meta.years.find((y) => y.isCurrent)?.id ?? "" });
    setModal(true);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api<{ warning?: string }>("/api/remedial", {
        method: "POST",
        body: JSON.stringify({
          classId: form.classId,
          subjectId: form.subjectId,
          teacherId: form.teacherId || null,
          session: form.session,
          day: Number(form.day),
          startTime: form.startTime,
          endTime: form.endTime,
          focus: form.focus,
          academicYearId: form.academicYearId || undefined,
        }),
      });
      setModal(false);
      toast.toast({ title: "Remedial session added", description: res.warning, variant: res.warning ? "info" : "success" });
      load();
    } catch (err) {
      toast.toast({ title: "Blocked — clash", description: (err as Error).message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this remedial session?")) return;
    try {
      await api(`/api/remedial/${id}`, { method: "DELETE" });
      toast.toast({ title: "Deleted", variant: "success" });
      load();
    } catch (e) {
      toast.toast({ title: "Delete failed", description: (e as Error).message, variant: "error" });
    }
  }

  const morning = rows.filter((r) => r.session === "MORNING");
  const afternoon = rows.filter((r) => r.session === "AFTERNOON");

  function SessionList({ list, session }: { list: Row[]; session: string }) {
    return list.length === 0 ? (
      <EmptyState title={`No ${session.toLowerCase()} sessions yet`} hint={session === "MORNING" ? "Morning remedial runs before school lessons begin (e.g. 6:30–7:20)." : "Afternoon remedial runs after school lessons end (e.g. 15:30–16:30)."} />
    ) : (
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Day</th><th>Time</th><th>Class</th><th>Subject</th><th>Teacher</th><th>Focus</th><th className="text-right">Actions</th></tr></thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id}>
                <td className="font-semibold text-slate-700">{DAYS[r.day] ?? "—"}</td>
                <td className="text-sm">{r.startTime ?? "—"} – {r.endTime ?? "—"}</td>
                <td>{r.class.name}</td>
                <td><Badge tone="violet">{r.subject.name}</Badge></td>
                <td className="text-sm">{r.teacher?.fullName ?? <span className="text-slate-400">not assigned</span>}</td>
                <td className="text-sm text-slate-500">{r.focus ?? "—"}</td>
                <td>
                  <div className="flex justify-end">
                    <button onClick={() => remove(r.id)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Remedial Classes"
        subtitle="Extra lessons for weak learners — morning (before school lessons) and afternoon (after school lessons). Teacher clashes are caught automatically."
        action={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Add session</Button>}
      />

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-primary/15 bg-primary-soft/40 p-4">
        <AlarmClock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p className="text-sm text-slate-600">
          <strong className="text-slate-800">Morning sessions</strong> run before school lessons begin (e.g. <strong>06:30 – 07:20</strong>);
          <strong className="text-slate-800"> afternoon sessions</strong> run after school lessons end (e.g. <strong>15:30 – 16:30</strong>).
          A teacher can only be booked for one remedial session at a time, and clashes with the main timetable are flagged.
        </p>
      </div>

      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-ink"><Sun className="h-5 w-5 text-amber-500" /> Morning — before lessons <Badge tone="amber">{morning.length}</Badge></h2>
      <div className="mb-8"><SessionList list={morning} session="MORNING" /></div>

      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-ink"><MoonStar className="h-5 w-5 text-indigo-500" /> Afternoon — after lessons <Badge tone="blue">{afternoon.length}</Badge></h2>
      <SessionList list={afternoon} session="AFTERNOON" />

      <Modal open={modal} onClose={() => setModal(false)} title="Add remedial session">
        <form onSubmit={create} className="grid gap-4 sm:grid-cols-2">
          <Field label="Class *">
            <Select required value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}>
              <option value="">Select…</option>
              {meta.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Subject *">
            <Select required value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
              <option value="">Select…</option>
              {meta.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label="Session *">
            <Select value={form.session} onChange={(e) => {
              const s = e.target.value;
              setForm({ ...form, session: s, startTime: s === "MORNING" ? "06:30" : "15:30", endTime: s === "MORNING" ? "07:20" : "16:30" });
            }}>
              <option value="MORNING">Morning — before lessons (6:30–7:20)</option>
              <option value="AFTERNOON">Afternoon — after lessons (15:30–16:30)</option>
            </Select>
          </Field>
          <Field label="Day *">
            <Select required value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })}>
              {DAYS.map((d, i) => <option key={i} value={String(i)}>{d}</option>)}
            </Select>
          </Field>
          <Field label="Start time"><Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></Field>
          <Field label="End time"><Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></Field>
          <Field label="Teacher" className="sm:col-span-2">
            <Select value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })}>
              <option value="">Auto (subject teacher)…</option>
              {meta.teachers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
            </Select>
          </Field>
          <Field label="Focus area" className="sm:col-span-2"><Textarea rows={2} value={form.focus} onChange={(e) => setForm({ ...form, focus: e.target.value })} placeholder="e.g. Weak areas in fractions; revision before mock exams" /></Field>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Add session</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

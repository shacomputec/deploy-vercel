"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarCheck, Check, Minus, X } from "lucide-react";
import { api } from "@/lib/client";
import { fmtDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/admin/page-header";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type Meta = { classes: { id: string; name: string }[]; terms: { id: string; name: string; isCurrent: boolean; academicYear: { name: string } }[] };

const STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_STYLE: Record<Status, string> = {
  PRESENT: "bg-emerald-100 text-emerald-700 border-emerald-200",
  ABSENT: "bg-rose-100 text-rose-700 border-rose-200",
  LATE: "bg-amber-100 text-amber-700 border-amber-200",
  EXCUSED: "bg-sky-100 text-sky-700 border-sky-200",
};
const STATUS_ICON: Record<Status, typeof Check> = { PRESENT: Check, ABSENT: X, LATE: Minus, EXCUSED: Check };

export default function AttendancePage() {
  const toast = useToast();
  const [meta, setMeta] = useState<Meta>({ classes: [], terms: [] });
  const currentTerm = meta.terms.find((t) => t.isCurrent) ?? meta.terms[0] ?? null;
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [students, setStudents] = useState<{ id: string; fullName: string; admissionNo: string }[]>([]);
  const [marks, setMarks] = useState<Record<string, Status>>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { api<Meta>("/api/meta").then(setMeta).catch(() => {}); }, []);

  const loadClass = useCallback(async () => {
    if (!classId || !date) return;
    setLoaded(false);
    try {
      const [klass, existing] = await Promise.all([
        api<{ students: { id: string; fullName: string; admissionNo: string }[] }>(`/api/classes/${classId}`),
        api<{ status: string; studentId: string }[]>(`/api/attendance?classId=${classId}&date=${date}`),
      ]);
      setStudents(klass.students);
      const m: Record<string, Status> = {};
      for (const s of klass.students) m[s.id] = "PRESENT";
      for (const r of existing) if (m[r.studentId]) m[r.studentId] = r.status as Status;
      setMarks(m);
    } catch (e) {
      toast.toast({ title: "Failed to load class", description: (e as Error).message, variant: "error" });
    } finally {
      setLoaded(true);
    }
  }, [classId, date, toast]);

  useEffect(() => { loadClass(); }, [loadClass]);

  const summary = useMemo(() => {
    const counts: Record<string, number> = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
    for (const s of Object.values(marks)) counts[s] = (counts[s] ?? 0) + 1;
    return counts;
  }, [marks]);

  const cycle = (id: string) => {
    const cur = marks[id] ?? "PRESENT";
    const next = STATUSES[(STATUSES.indexOf(cur) + 1) % STATUSES.length];
    setMarks((m) => ({ ...m, [id]: next }));
  };

  const markAll = (status: Status) => {
    const m: Record<string, Status> = {};
    for (const s of students) m[s.id] = status;
    setMarks(m);
  };

  async function save() {
    setSaving(true);
    try {
      const records = students.map((s) => ({ studentId: s.id, status: marks[s.id] ?? "PRESENT" }));
      await api("/api/attendance", { method: "POST", body: JSON.stringify({ date, classId, records }) });
      toast.toast({ title: "Attendance saved", description: `${records.length} students recorded for ${fmtDate(date)}`, variant: "success" });
    } catch (e) {
      toast.toast({ title: "Save failed", description: (e as Error).message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Attendance" subtitle="Daily class attendance — click a status to cycle: Present → Absent → Late → Excused" />

      <div className="card mb-6 flex flex-wrap items-end gap-4 p-5">
        <Field label="Class" className="min-w-56">
          <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Select class…</option>
            {meta.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Date" className="min-w-44">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Button variant="outline" onClick={loadClass}><CalendarCheck className="h-4 w-4" /> Load</Button>
        <Button variant="outline" disabled={!classId || !currentTerm} onClick={() => window.open(`/reports/print/attendance-register/${classId}/${currentTerm.id}`, "_blank", "noopener")} title={`Printable register for the whole term (${currentTerm?.name ?? ""}) — one landscape A4 page per 15 school days`}>
          <CalendarCheck className="h-4 w-4" /> Print Register
        </Button>
        <div className="flex gap-2 sm:ml-auto">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => markAll(s)} className={cn("rounded-lg border px-3 py-2 text-xs font-semibold transition", STATUS_STYLE[s])}>
              All {s}
            </button>
          ))}
        </div>
      </div>

      {classId && date && (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <span key={s} className={cn("rounded-lg border px-3 py-1.5 text-xs font-bold", STATUS_STYLE[s])}>
                {s}: {summary[s] ?? 0}
              </span>
            ))}
          </div>

          {!loaded ? (
            <div className="card p-8"><div className="skeleton h-4 w-full" /></div>
          ) : students.length === 0 ? (
            <div className="card p-10 text-center text-sm text-slate-400">No active students in this class.</div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>#</th><th>Student</th><th>Admission No</th><th className="w-64">Status (click to cycle)</th></tr></thead>
                <tbody>
                  {students.map((s, i) => {
                    const st = marks[s.id] ?? "PRESENT";
                    const Icon = STATUS_ICON[st];
                    return (
                      <tr key={s.id}>
                        <td className="text-slate-400">{i + 1}</td>
                        <td className="font-medium text-slate-800">{s.fullName}</td>
                        <td className="font-mono text-xs">{s.admissionNo}</td>
                        <td>
                          <button onClick={() => cycle(s.id)} className={cn("flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition hover:scale-[1.02]", STATUS_STYLE[st])}>
                            <Icon className="h-4 w-4" /> {st}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-5 flex justify-end">
            <Button onClick={save} loading={saving} size="lg">Save Attendance</Button>
          </div>
        </>
      )}
    </div>
  );
}

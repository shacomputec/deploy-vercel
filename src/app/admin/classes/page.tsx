"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, Plus, School, Settings2, Trash2 } from "lucide-react";
import { api } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/admin/page-header";
import { useToast } from "@/components/ui/toast";

type ClassRow = {
  id: string; name: string; stream: string | null;
  level: { id: string; name: string };
  classTeacher: { id: string; fullName: string } | null;
  _count: { students: number };
  subjects: { id: string; subject: { id: string; name: string }; teacher: { id: string; fullName: string } | null }[];
};
type Meta = { levels: { id: string; name: string }[]; subjects: { id: string; name: string; levelId: string }[]; teachers: { id: string; fullName: string }[] };

export default function ClassesPage() {
  const toast = useToast();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [meta, setMeta] = useState<Meta>({ levels: [], subjects: [], teachers: [] });
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", levelId: "", stream: "" });
  const [subjectModal, setSubjectModal] = useState<ClassRow | null>(null);
  const [selected, setSelected] = useState<{ subjectId: string; teacherId: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<ClassRow[]>("/api/classes");
      setClasses(data);
    } catch (e) {
      toast.toast({ title: "Failed to load", description: (e as Error).message, variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api<Meta>("/api/meta").then(setMeta).catch(() => {}); }, []);

  async function createClass(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/api/classes", { method: "POST", body: JSON.stringify(createForm) });
      toast.toast({ title: "Class created", variant: "success" });
      setCreateOpen(false); setCreateForm({ name: "", levelId: "", stream: "" }); load();
    } catch (e) {
      toast.toast({ title: "Create failed", description: (e as Error).message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  function openSubjects(c: ClassRow) {
    setSubjectModal(c);
    setSelected(c.subjects.map((s) => ({ subjectId: s.subject.id, teacherId: s.teacher?.id ?? "" })));
  }

  async function saveSubjects() {
    if (!subjectModal) return;
    setSaving(true);
    try {
      await api(`/api/classes/${subjectModal.id}`, {
        method: "POST",
        body: JSON.stringify({ subjects: selected.filter((s) => s.subjectId) }),
      });
      toast.toast({ title: "Subjects updated", variant: "success" });
      setSubjectModal(null); load();
    } catch (e) {
      toast.toast({ title: "Save failed", description: (e as Error).message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function removeClass(c: ClassRow) {
    if (!confirm(`Delete class ${c.name}? Students will be unassigned.`)) return;
    try {
      await api(`/api/classes/${c.id}`, { method: "DELETE" });
      toast.toast({ title: "Class deleted", variant: "success" });
      load();
    } catch (e) {
      toast.toast({ title: "Delete failed", description: (e as Error).message, variant: "error" });
    }
  }

  return (
    <div>
      <PageHeader
        title="Classes & Subjects"
        subtitle="Structure, form teachers and subject assignments"
        action={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> New Class</Button>}
      />

      {loading ? <div className="card p-8"><div className="skeleton h-4 w-full" /></div> : classes.length === 0 ? (
        <div className="card p-10 text-center">
          <School className="mx-auto h-10 w-10 text-slate-300" />
          <h3 className="mt-3 text-base font-semibold text-ink">No classes yet</h3>
          <p className="mt-1 text-sm text-slate-400">Create your first class (e.g. Basic 7A) and assign its subjects and teachers — then students can be enrolled into it.</p>
          <Button className="mt-4" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> New Class</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <div key={c.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-ink">{c.name}</h3>
                  <p className="text-xs text-slate-400">{c.level.name}</p>
                </div>
                <Badge tone="blue">{c._count.students} students</Badge>
              </div>
              <p className="mt-3 text-sm text-slate-500">
                Form teacher: <span className="font-medium text-slate-700">{c.classTeacher?.fullName ?? "Not assigned"}</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-1">
                {c.subjects.slice(0, 6).map((s) => <Badge key={s.id} tone="slate">{s.subject.name}</Badge>)}
                {c.subjects.length > 6 && <Badge tone="slate">+{c.subjects.length - 6}</Badge>}
              </div>
              <div className="mt-4 flex justify-end gap-1 border-t border-slate-100 pt-3">
                <button onClick={() => openSubjects(c)} className="btn-outline btn-sm"><Settings2 className="h-3.5 w-3.5" /> Subjects</button>
                <button onClick={() => removeClass(c)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Class">
        <form onSubmit={createClass} className="space-y-4">
          <Field label="Level *">
            <Select required value={createForm.levelId} onChange={(e) => setCreateForm({ ...createForm, levelId: e.target.value })}>
              <option value="">Select…</option>
              {meta.levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </Select>
          </Field>
          <Field label="Class name *" hint="e.g. Basic 7, SHS 1">
            <Input required value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} />
          </Field>
          <Field label="Stream (optional)" hint="e.g. A, B, C">
            <Input value={createForm.stream} onChange={(e) => setCreateForm({ ...createForm, stream: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create Class</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!subjectModal} onClose={() => setSubjectModal(null)} title={`Subjects — ${subjectModal?.name}`} subtitle="Assign subjects and teachers to this class." wide>
        <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
          {meta.subjects.filter((s) => s.levelId === subjectModal?.level.id).map((s) => {
            const row = selected.find((x) => x.subjectId === s.id);
            return (
              <div key={s.id} className="grid grid-cols-1 items-center gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-2">
                <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={!!row}
                    onChange={(e) =>
                      setSelected((prev) => e.target.checked ? [...prev, { subjectId: s.id, teacherId: "" }] : prev.filter((x) => x.subjectId !== s.id))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <BookOpen className="h-4 w-4 text-slate-400" /> {s.name}
                </label>
                {row && (
                  <Select value={row.teacherId} onChange={(e) => setSelected((prev) => prev.map((x) => x.subjectId === s.id ? { ...x, teacherId: e.target.value } : x))}>
                    <option value="">No teacher assigned</option>
                    {meta.teachers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
                  </Select>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setSubjectModal(null)}>Cancel</Button>
          <Button onClick={saveSubjects} loading={saving}>Save Subjects</Button>
        </div>
      </Modal>
    </div>
  );
}

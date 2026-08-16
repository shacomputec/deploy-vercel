"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpenCheck, Check, Pencil, Plus, School as SchoolIcon, Trash2, Wand2 } from "lucide-react";
import { api } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/admin/page-header";
import { useToast } from "@/components/ui/toast";

type ProgrammeSubject = { id: string; isCore: boolean; subject: { id: string; name: string } };
type Programme = {
  id: string; name: string; code: string | null; description: string | null;
  subjects: ProgrammeSubject[];
  classes: { id: string; name: string }[];
};
type Meta = {
  classes: { id: string; name: string; level: { code: string } }[];
  subjects: { id: string; name: string; level: { code: string } }[];
};

const emptyForm = { name: "", code: "", description: "" };

export default function ProgrammesPage() {
  const toast = useToast();
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [meta, setMeta] = useState<Meta>({ classes: [], subjects: [] });
  const [modal, setModal] = useState<null | { mode: "create" } | { mode: "edit"; p: Programme }>(null);
  const [form, setForm] = useState(emptyForm);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [core, setCore] = useState<Record<string, boolean>>({});
  const [applyClass, setApplyClass] = useState("");
  const [applyFor, setApplyFor] = useState<Programme | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setProgrammes(await api<Programme[]>("/api/programmes"));
    } catch (e) {
      toast.toast({ title: "Failed to load programmes", description: (e as Error).message, variant: "error" });
    }
  }, [toast]);

  useEffect(() => {
    load();
    api<Meta>("/api/meta").then(setMeta).catch(() => {});
  }, [load]);

  const shsSubjects = meta.subjects.filter((s) => s.level?.code === "SHS");
  const shsClasses = meta.classes.filter((c) => c.level?.code === "SHS");

  const openCreate = () => {
    setForm(emptyForm);
    setPicked({});
    setCore({});
    setModal({ mode: "create" });
  };
  const openEdit = (p: Programme) => {
    setForm({ name: p.name, code: p.code ?? "", description: p.description ?? "" });
    const picked: Record<string, boolean> = {};
    const core: Record<string, boolean> = {};
    for (const s of p.subjects) {
      picked[s.subject.id] = true;
      core[s.subject.id] = s.isCore;
    }
    setPicked(picked);
    setCore(core);
    setModal({ mode: "edit", p });
  };

  const toggle = (id: string) => {
    setPicked((p) => {
      const next = { ...p, [id]: !p[id] };
      if (!next[id]) {
        const c = { ...core };
        delete c[id];
        setCore(c);
      }
      return next;
    });
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const subjectIds = Object.entries(picked).filter(([, v]) => v).map(([id]) => id);
    if (!subjectIds.length) {
      toast.toast({ title: "No subjects", description: "Tick at least one subject for the programme.", variant: "info" });
      return;
    }
    const coreSubjectIds = Object.entries(core).filter(([, v]) => v).map(([id]) => id);
    setSaving(true);
    try {
      if (modal?.mode === "edit") {
        await api(`/api/programmes/${modal.p.id}`, {
          method: "PUT",
          body: JSON.stringify({ ...form, subjectIds, coreSubjectIds }),
        });
        toast.toast({ title: "Programme updated", variant: "success" });
      } else {
        await api("/api/programmes", { method: "POST", body: JSON.stringify({ ...form, subjectIds, coreSubjectIds }) });
        toast.toast({ title: "Programme created", description: `${subjectIds.length} subjects attached.`, variant: "success" });
      }
      setModal(null);
      load();
    } catch (err) {
      toast.toast({ title: "Save failed", description: (err as Error).message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function remove(p: Programme) {
    if (!confirm(`Delete the “${p.name}” programme? Classes keep their subjects but lose the programme link.`)) return;
    try {
      await api(`/api/programmes/${p.id}`, { method: "DELETE" });
      toast.toast({ title: "Programme deleted", variant: "success" });
      load();
    } catch (e) {
      toast.toast({ title: "Delete failed", description: (e as Error).message, variant: "error" });
    }
  }

  async function applyProgramme() {
    if (!applyFor || !applyClass) return;
    setSaving(true);
    try {
      const res = await api<{ subjects: number }>("/api/programmes", {
        method: "PUT",
        body: JSON.stringify({ classId: applyClass, programmeId: applyFor.id }),
      });
      toast.toast({
        title: `${applyFor.name} applied to ${shsClasses.find((c) => c.id === applyClass)?.name}`,
        description: `Class subjects replaced with the programme's ${res.subjects} subjects.`,
        variant: "success",
      });
      setApplyFor(null);
      setApplyClass("");
      load();
    } catch (e) {
      toast.toast({ title: "Apply failed", description: (e as Error).message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="SHS Programmes & Courses"
        subtitle="GES senior-high programmes (General Science, General Arts, Business, …) — each with its own core + elective subjects. Applying a programme to a class defines that class's curriculum."
        action={<Button onClick={openCreate}><Plus className="h-4 w-4" /> New Programme</Button>}
      />

      {programmes.length === 0 ? (
        <EmptyState
          title="No programmes yet"
          hint="Create your first SHS programme (e.g. General Science) and attach its subjects — then apply it to an SHS class."
          action={<Button onClick={openCreate}>Create Programme</Button>}
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {programmes.map((p) => (
            <div key={p.id} className="card overflow-hidden">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div className="min-w-0">
                  <h3 className="flex items-center gap-2 font-semibold text-slate-900">
                    <BookOpenCheck className="h-4 w-4 text-primary" /> {p.name}
                    {p.code && <Badge tone="blue">{p.code}</Badge>}
                  </h3>
                  {p.description && <p className="mt-0.5 text-xs text-slate-400">{p.description}</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => openEdit(p)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Edit"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(p)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Delete"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="px-5 py-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Subjects ({p.subjects.length})</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.subjects.map((s) => (
                    <span key={s.id} className={`rounded-lg px-2 py-1 text-xs font-semibold ${s.isCore ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-600"}`}>
                      {s.subject.name}{s.isCore && <span className="ml-1 rounded bg-primary px-1 text-[9px] font-bold text-white">CORE</span>}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                  <p className="text-xs text-slate-400">
                    {p.classes.length ? `Used by: ${p.classes.map((c) => c.name).join(", ")}` : "Not attached to any class yet"}
                  </p>
                  <div className="ml-auto flex items-center gap-2">
                    <Select value={applyFor?.id === p.id ? applyClass : ""} onChange={(e) => { setApplyFor(p); setApplyClass(e.target.value); }} className="w-44">
                      <option value="">Apply to class…</option>
                      {shsClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                    {applyFor?.id === p.id && (
                      <Button size="sm" onClick={applyProgramme} loading={saving} disabled={!applyClass}>
                        <Wand2 className="h-3.5 w-3.5" /> Apply
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === "edit" ? `Edit ${modal.p.name}` : "New Programme"}
        subtitle="Pick the subjects — tick the CORE box for core subjects (e.g. English Language, Core Mathematics)."
        wide
      >
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Programme name *"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. General Science" /></Field>
            <Field label="Code"><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. SCI" /></Field>
            <Field label="Description"><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" /></Field>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">Subjects</p>
            {shsSubjects.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-400">No SHS subjects exist yet — add them under Classes &amp; Subjects first.</p>
            ) : (
              <div className="grid max-h-72 gap-1.5 overflow-y-auto rounded-xl border border-slate-200 p-3 sm:grid-cols-2">
                {shsSubjects.map((s) => (
                  <label key={s.id} className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm transition ${picked[s.id] ? "bg-primary/5 ring-1 ring-primary/30" : "hover:bg-slate-50"}`}>
                    <span className="flex items-center gap-2 font-medium text-slate-700">
                      <input type="checkbox" checked={!!picked[s.id]} onChange={() => toggle(s.id)} className="h-4 w-4 rounded accent-primary" />
                      {s.name}
                    </span>
                    <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                      <input type="checkbox" disabled={!picked[s.id]} checked={!!core[s.id]} onChange={() => setCore((c) => ({ ...c, [s.id]: !c[s.id] }))} className="h-3.5 w-3.5 rounded accent-primary" />
                      CORE
                    </label>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
            <Button type="submit" loading={saving}><Check className="h-4 w-4" /> {modal?.mode === "edit" ? "Save Changes" : "Create Programme"}</Button>
          </div>
        </form>
      </Modal>

      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
        <SchoolIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p>
          <strong className="text-slate-700">How programmes work:</strong> a class can only belong to one programme. Applying a
          programme <strong>replaces the class's subjects</strong> with the programme's set — the report card, mark sheet and
          mock exams all follow the class's subjects automatically. Create as many custom programmes as your school needs.
        </p>
      </div>
    </div>
  );
}

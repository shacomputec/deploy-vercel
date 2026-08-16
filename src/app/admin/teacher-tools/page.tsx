"use client";

import { useCallback, useEffect, useState } from "react";
import { BookMarked, Check, ClipboardList, Download, Eye, FileDown, Pencil, Plus, RotateCcw, Send, Star, Trash2, X } from "lucide-react";
import { api } from "@/lib/client";
import { fmtDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/admin/page-header";
import { useToast } from "@/components/ui/toast";

type Meta = {
  classes: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
};
type HomeworkRow = { id: string; title: string; description: string | null; dueDate: string | null; class: { name: string }; subject: { name: string } };
type LessonRow = {
  id: string;
  topic: string;
  week: number | null;
  objectives: string | null;
  content: string | null;
  duration: string | null;
  resources: string | null;
  activityIntro: string | null;
  activityMain: string | null;
  activityPlenary: string | null;
  homework: string | null;
  status: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  rating: number | null;
  reviewComment: string | null;
  class: { name: string } | null;
  subject: { id: string; name: string } | null;
  teacher: { fullName: string } | null;
  reviewedBy: { fullName: string } | null;
};
type Sample = { key: string; level: string; subject: string; topic: string; week: number; duration: string; objectives: string; resources: string; activityIntro: string; activityMain: string; activityPlenary: string; homework: string };

const STATUS_TONE: Record<string, "slate" | "amber" | "green" | "red"> = {
  DRAFT: "slate",
  SUBMITTED: "amber",
  APPROVED: "green",
  REJECTED: "red",
};

const EMPTY_FORM = {
  classId: "",
  subjectId: "",
  title: "",
  description: "",
  dueDate: "",
  topic: "",
  week: "",
  duration: "",
  objectives: "",
  resources: "",
  activityIntro: "",
  activityMain: "",
  activityPlenary: "",
  homework: "",
};

export default function TeacherToolsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<"homework" | "lessons" | "vetting">("homework");
  const [meta, setMeta] = useState<Meta>({ classes: [], subjects: [] });
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [homework, setHomework] = useState<HomeworkRow[]>([]);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<{ id: string } | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  // Samples
  const [samplesOpen, setSamplesOpen] = useState(false);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [sampleSubjects, setSampleSubjects] = useState<string[]>([]);
  const [sampleLevel, setSampleLevel] = useState("");
  const [sampleSubject, setSampleSubject] = useState("");
  const [sampleQ, setSampleQ] = useState("");
  // Vetting
  const [vetting, setVetting] = useState<LessonRow | null>(null);
  const [vetComment, setVetComment] = useState("");
  const [vetRating, setVetRating] = useState(0);

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    if (classFilter) qs.set("classId", classFilter);
    if (tab === "vetting") qs.set("status", "SUBMITTED");
    try {
      const [hw, ln] = await Promise.all([
        api<HomeworkRow[]>(`/api/homework${classFilter ? `?classId=${classFilter}` : ""}`),
        api<LessonRow[]>(`/api/lessons?${qs.toString()}`),
      ]);
      setHomework(hw);
      setLessons(ln);
    } catch (e) {
      toast.toast({ title: "Failed to load", description: (e as Error).message, variant: "error" });
    }
  }, [classFilter, tab, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api<Meta>("/api/meta").then(setMeta).catch(() => {}); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, classId: classFilter });
    setModal(true);
  }

  function openEdit(r: HomeworkRow | LessonRow) {
    setEditing({ id: r.id });
    if ("title" in r) {
      setForm({ ...EMPTY_FORM, classId: classFilter, title: r.title, description: r.description ?? "", dueDate: r.dueDate?.slice(0, 10) ?? "" });
    } else {
      setForm({
        ...EMPTY_FORM,
        classId: classFilter,
        subjectId: r.subject?.id ? r.subject.id : "",
        topic: r.topic,
        week: r.week ? String(r.week) : "",
        duration: r.duration ?? "",
        objectives: r.objectives ?? "",
        resources: r.resources ?? "",
        activityIntro: r.activityIntro ?? "",
        activityMain: r.activityMain ?? "",
        activityPlenary: r.activityPlenary ?? "",
        homework: r.homework ?? "",
      });
    }
    setModal(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (tab === "homework") {
        if (editing) {
          await api(`/api/homework/${editing.id}`, { method: "PUT", body: JSON.stringify({ title: form.title, description: form.description, dueDate: form.dueDate }) });
          toast.toast({ title: "Homework updated", variant: "success" });
        } else {
          await api("/api/homework", { method: "POST", body: JSON.stringify({ classId: form.classId, subjectId: form.subjectId, title: form.title, description: form.description, dueDate: form.dueDate }) });
          toast.toast({ title: "Homework assigned", variant: "success" });
        }
      } else {
        const body = {
          classId: form.classId,
          subjectId: form.subjectId,
          topic: form.topic,
          week: Number(form.week) || undefined,
          duration: form.duration,
          objectives: form.objectives,
          resources: form.resources,
          activityIntro: form.activityIntro,
          activityMain: form.activityMain,
          activityPlenary: form.activityPlenary,
          homework: form.homework,
        };
        if (editing) {
          await api(`/api/lessons/${editing.id}`, { method: "PUT", body: JSON.stringify(body) });
          toast.toast({ title: "Lesson note updated", variant: "success" });
        } else {
          await api("/api/lessons", { method: "POST", body: JSON.stringify(body) });
          toast.toast({ title: "Lesson note saved as draft", variant: "success" });
        }
      }
      setModal(false);
      load();
    } catch (e) {
      toast.toast({ title: "Save failed", description: (e as Error).message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string, kind: "homework" | "lessons") {
    if (!confirm(`Delete this ${kind === "homework" ? "homework" : "lesson note"}?`)) return;
    try {
      await api(`/api/${kind}/${id}`, { method: "DELETE" });
      toast.toast({ title: "Deleted", variant: "success" });
      load();
    } catch (e) {
      toast.toast({ title: "Delete failed", description: (e as Error).message, variant: "error" });
    }
  }

  async function submitNote(id: string) {
    try {
      await api(`/api/lessons/${id}`, { method: "POST", body: JSON.stringify({ action: "submit" }) });
      toast.toast({ title: "Submitted for vetting", description: "The headteacher has been notified to review it.", variant: "success" });
      load();
    } catch (e) {
      toast.toast({ title: "Submit failed", description: (e as Error).message, variant: "error" });
    }
  }

  async function loadSamples() {
    setSamplesOpen(true);
    try {
      const res = await api<{ samples: Sample[]; subjects: string[] }>("/api/lessons/samples");
      setSamples(res.samples);
      setSampleSubjects(res.subjects);
    } catch (e) {
      toast.toast({ title: "Failed to load samples", description: (e as Error).message, variant: "error" });
      setSamplesOpen(false);
    }
  }

  useEffect(() => {
    if (!samplesOpen) return;
    const qs = new URLSearchParams();
    if (sampleLevel) qs.set("level", sampleLevel);
    if (sampleSubject) qs.set("subject", sampleSubject);
    if (sampleQ) qs.set("q", sampleQ);
    api<{ samples: Sample[] }>(`/api/lessons/samples?${qs.toString()}`).then((res) => setSamples(res.samples)).catch(() => {});
  }, [sampleLevel, sampleSubject, sampleQ, samplesOpen]);

  async function useSample(s: Sample) {
    try {
      await api("/api/lessons/from-sample", {
        method: "POST",
        body: JSON.stringify({ key: s.key, classId: form.classId || classFilter || null, subjectId: form.subjectId || null }),
      });
      setSamplesOpen(false);
      toast.toast({ title: "Sample added", description: `"${s.topic}" is now your draft — edit it to fit your class, then submit for vetting.`, variant: "success" });
      load();
    } catch (e) {
      toast.toast({ title: "Failed to add sample", description: (e as Error).message, variant: "error" });
    }
  }

  async function review(id: string, verdict: "APPROVED" | "REJECTED") {
    if (verdict === "APPROVED" && vetRating < 1) {
      toast.toast({ title: "Rating needed", description: "Give a 1–5 rating when approving.", variant: "error" });
      return;
    }
    try {
      await api(`/api/lessons/${id}`, { method: "POST", body: JSON.stringify({ action: "review", verdict, comment: vetComment, rating: vetRating || undefined }) });
      toast.toast({ title: verdict === "APPROVED" ? "Lesson note approved" : "Lesson note rejected", variant: "success" });
      setVetting(null);
      load();
    } catch (e) {
      toast.toast({ title: "Review failed", description: (e as Error).message, variant: "error" });
    }
  }

  async function returnNote(id: string) {
    try {
      await api(`/api/lessons/${id}`, { method: "POST", body: JSON.stringify({ action: "return", comment: vetComment }) });
      toast.toast({ title: "Returned for revision", variant: "success" });
      setVetting(null);
      load();
    } catch (e) {
      toast.toast({ title: "Failed to return", description: (e as Error).message, variant: "error" });
    }
  }

  const isHomework = tab === "homework";
  const isVetting = tab === "vetting";

  const filteredLessons = lessons.filter((l) => (statusFilter ? l.status === statusFilter : true));

  return (
    <div>
      <PageHeader
        title="Teacher Tools"
        subtitle="Homework, lesson notes with headteacher vetting, and built-in GES/NaCCA sample lesson plans"
        action={
          !isVetting ? (
            <div className="flex gap-2">
              {tab === "lessons" && <Button variant="outline" onClick={loadSamples}><BookMarked className="h-4 w-4" /> From samples</Button>}
              <Button onClick={openCreate}><Plus className="h-4 w-4" /> New {isHomework ? "Homework" : "Lesson Note"}</Button>
            </div>
          ) : undefined
        }
      />

      <div className="mb-5 flex gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
        <button onClick={() => setTab("homework")} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${isHomework ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50"}`}>
          <ClipboardList className="h-4 w-4" /> Homework
        </button>
        <button onClick={() => setTab("lessons")} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === "lessons" ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50"}`}>
          <BookMarked className="h-4 w-4" /> Lesson Notes
        </button>
        <button onClick={() => { setTab("vetting"); setStatusFilter(""); }} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${isVetting ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50"}`}>
          <Eye className="h-4 w-4" /> Headteacher Vetting
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Select className="w-56" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
          <option value="">All classes</option>
          {meta.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        {tab === "lessons" && (
          <Select className="w-44" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="DRAFT">Drafts</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </Select>
        )}
        {isVetting && <Badge tone="amber">{lessons.length} note(s) awaiting review</Badge>}
      </div>

      {/* ── Homework tab ─────────────────────────────────────────────── */}
      {isHomework && (homework.length === 0 ? <EmptyState title="No homework assigned" action={<Button onClick={openCreate}>Assign homework</Button>} /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Homework</th><th>Class</th><th>Subject</th><th>Due</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {homework.map((h) => (
                <tr key={h.id}>
                  <td>
                    <p className="font-semibold text-slate-800">{h.title}</p>
                    {h.description && <p className="text-xs text-slate-500">{h.description}</p>}
                  </td>
                  <td>{h.class.name}</td>
                  <td><Badge tone="violet">{h.subject.name}</Badge></td>
                  <td className="text-sm">{fmtDate(h.dueDate)}</td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(h)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => remove(h.id, "homework")} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* ── Lesson Notes tab ─────────────────────────────────────────── */}
      {tab === "lessons" && (filteredLessons.length === 0 ? (
        <EmptyState
          title="No lesson notes yet"
          hint="Write your own or start from a built-in GES/NaCCA sample, then submit for headteacher vetting."
          action={<div className="flex gap-2"><Button variant="outline" onClick={loadSamples}><BookMarked className="h-4 w-4" /> From samples</Button><Button onClick={openCreate}>Write a lesson note</Button></div>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredLessons.map((l) => (
            <div key={l.id} className="card flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800">{l.topic}</p>
                  <p className="text-xs text-slate-400">
                    {l.class?.name ?? "—"} · {l.subject?.name ?? "—"}{l.week ? ` · Week ${l.week}` : ""}{l.duration ? ` · ${l.duration}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {l.status === "APPROVED" && l.rating ? (
                    <span className="mr-1 flex items-center gap-0.5 text-amber-500">
                      {Array.from({ length: l.rating }).map((_, i) => <Star key={i} className="h-3 w-3 fill-current" />)}
                    </span>
                  ) : null}
                  <Badge tone={STATUS_TONE[l.status] ?? "slate"}>{l.status}</Badge>
                </div>
              </div>

              {l.objectives && <p className="mt-2 text-sm text-slate-600"><strong className="text-slate-500">Objectives:</strong> {l.objectives}</p>}
              {l.activityIntro && <p className="mt-1 text-sm text-slate-500"><strong className="text-slate-400">Starter:</strong> {l.activityIntro}</p>}
              {l.activityMain && <p className="mt-1 line-clamp-2 text-sm text-slate-500"><strong className="text-slate-400">Main:</strong> {l.activityMain}</p>}
              {l.teacher && <p className="mt-2 text-xs text-slate-400">by {l.teacher.fullName}{l.reviewedBy ? ` · vetted by ${l.reviewedBy.fullName}` : ""}</p>}
              {l.reviewComment && <p className="mt-1 rounded-lg bg-slate-50 p-2 text-xs text-slate-500"><strong className="text-slate-400">Review:</strong> {l.reviewComment}</p>}

              <div className="mt-auto flex gap-1 pt-3">
                {l.status === "DRAFT" || l.status === "REJECTED" ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => openEdit(l)}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                    <Button size="sm" onClick={() => submitNote(l.id)}><Send className="h-3.5 w-3.5" /> Submit for vetting</Button>
                    <button onClick={() => remove(l.id, "lessons")} className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                  </>
                ) : (
                  <button onClick={() => setVetting(l)} className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Eye className="h-4 w-4" /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* ── Vetting tab ──────────────────────────────────────────────── */}
      {isVetting && (lessons.length === 0 ? (
        <EmptyState title="Nothing awaiting review" hint="When teachers submit lesson notes they appear here for the headteacher to vet." />
      ) : (
        <div className="space-y-3">
          {lessons.map((l) => (
            <div key={l.id} className="card flex flex-wrap items-center justify-between gap-3 p-5">
              <div className="min-w-0">
                <p className="font-semibold text-slate-800">{l.topic}</p>
                <p className="text-xs text-slate-400">
                  {l.class?.name ?? "—"} · {l.subject?.name ?? "—"}{l.week ? ` · Week ${l.week}` : ""} · by {l.teacher?.fullName ?? "unknown"} · submitted {l.submittedAt ? fmtDate(l.submittedAt) : ""}
                </p>
                {l.objectives && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{l.objectives}</p>}
              </div>
              <Button onClick={() => setVetting(l)}><Eye className="h-4 w-4" /> Review</Button>
            </div>
          ))}
        </div>
      ))}

      {/* ── Create / edit modal ──────────────────────────────────────── */}
      <Modal open={modal} onClose={() => setModal(false)} title={isHomework ? (editing ? "Edit Homework" : "Assign Homework") : (editing ? "Edit Lesson Note" : "New Lesson Note")} wide>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          {!editing && (
            <>
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
            </>
          )}
          {isHomework ? (
            <>
              <Field label="Title *" className="sm:col-span-2"><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Exercise 4 — Fractions" /></Field>
              <Field label="Description" className="sm:col-span-2"><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
              <Field label="Due date"><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></Field>
            </>
          ) : (
            <>
              <Field label="Topic *" className="sm:col-span-2"><Input required value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} /></Field>
              <Field label="Week"><Input type="number" min="1" value={form.week} onChange={(e) => setForm({ ...form, week: e.target.value })} /></Field>
              <Field label="Duration"><Input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="e.g. 40 minutes" /></Field>
              <Field label="Objectives" className="sm:col-span-2"><Textarea rows={2} value={form.objectives} onChange={(e) => setForm({ ...form, objectives: e.target.value })} placeholder="What learners will be able to do by the end of the lesson" /></Field>
              <Field label="Teaching & learning resources" className="sm:col-span-2"><Input value={form.resources} onChange={(e) => setForm({ ...form, resources: e.target.value })} placeholder="e.g. charts, real objects, flashcards" /></Field>
              <Field label="Starter / previous knowledge" className="sm:col-span-2"><Textarea rows={2} value={form.activityIntro} onChange={(e) => setForm({ ...form, activityIntro: e.target.value })} /></Field>
              <Field label="Main activity" className="sm:col-span-2"><Textarea rows={3} value={form.activityMain} onChange={(e) => setForm({ ...form, activityMain: e.target.value })} /></Field>
              <Field label="Plenary / assessment" className="sm:col-span-2"><Textarea rows={2} value={form.activityPlenary} onChange={(e) => setForm({ ...form, activityPlenary: e.target.value })} /></Field>
              <Field label="Homework" className="sm:col-span-2"><Textarea rows={2} value={form.homework} onChange={(e) => setForm({ ...form, homework: e.target.value })} /></Field>
            </>
          )}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Save</Button>
          </div>
        </form>
      </Modal>

      {/* ── Samples modal ────────────────────────────────────────────── */}
      <Modal open={samplesOpen} onClose={() => setSamplesOpen(false)} title="Built-in sample lesson notes (GES / NaCCA format)" wide>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Select className="w-44" value={sampleLevel} onChange={(e) => setSampleLevel(e.target.value)}>
              <option value="">All levels</option>
              {["KG", "Primary", "JHS", "SHS"].map((l) => <option key={l} value={l}>{l}</option>)}
            </Select>
            <Select className="w-52" value={sampleSubject} onChange={(e) => setSampleSubject(e.target.value)}>
              <option value="">All subjects</option>
              {sampleSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Input className="w-56" placeholder="Search topics…" value={sampleQ} onChange={(e) => setSampleQ(e.target.value)} />
            <a href="/api/lessons/samples/pdf/all" className="ml-auto">
              <Button size="sm" variant="outline"><Download className="h-3.5 w-3.5" /> Download all as PDFs</Button>
            </a>
          </div>
          <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
            {samples.length === 0 ? <EmptyState title="No samples match" hint="Try clearing the filters." /> : samples.map((s) => (
              <div key={s.key} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{s.topic}</p>
                    <p className="text-xs text-slate-400"><Badge tone="blue">{s.subject}</Badge> <Badge tone="violet">{s.level}</Badge> Week {s.week} · {s.duration}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={`/api/lessons/samples/${s.key}/pdf`} title="Download this sample as PDF">
                      <Button size="sm" variant="ghost"><FileDown className="h-3.5 w-3.5" /></Button>
                    </a>
                    <Button size="sm" onClick={() => useSample(s)}><Plus className="h-3.5 w-3.5" /> Use</Button>
                  </div>
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-slate-500">{s.objectives}</p>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* ── Vetting review modal ─────────────────────────────────────── */}
      <Modal open={!!vetting} onClose={() => setVetting(null)} title="Review lesson note" wide>
        {vetting && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={STATUS_TONE[vetting.status] ?? "slate"}>{vetting.status}</Badge>
              <Badge tone="blue">{vetting.subject?.name ?? "—"}</Badge>
              <Badge tone="violet">{vetting.class?.name ?? "—"}</Badge>
              {vetting.week ? <Badge tone="slate">Week {vetting.week}</Badge> : null}
              {vetting.duration ? <Badge tone="slate">{vetting.duration}</Badge> : null}
            </div>
            <h3 className="text-lg font-bold text-slate-900">{vetting.topic}</h3>
            <p className="text-xs text-slate-400">by {vetting.teacher?.fullName ?? "unknown"}{vetting.submittedAt ? ` · submitted ${fmtDate(vetting.submittedAt)}` : ""}</p>

            {[
              { label: "Objectives", value: vetting.objectives },
              { label: "Teaching & learning resources", value: vetting.resources },
              { label: "Starter / previous knowledge", value: vetting.activityIntro },
              { label: "Main activity", value: vetting.activityMain },
              { label: "Plenary / assessment", value: vetting.activityPlenary },
              { label: "Homework", value: vetting.homework },
            ].map((s) => s.value ? (
              <div key={s.label} className="rounded-xl border border-slate-200 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{s.label}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{s.value}</p>
              </div>
            ) : null)}

            {vetting.reviewedBy && (
              <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                <p><strong>Last reviewed by {vetting.reviewedBy.fullName}</strong>{vetting.reviewedAt ? ` · ${fmtDate(vetting.reviewedAt)}` : ""}{vetting.rating ? ` · ${vetting.rating}/5 stars` : ""}</p>
                {vetting.reviewComment && <p className="mt-1">{vetting.reviewComment}</p>}
              </div>
            )}

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Your review</p>
              <div className="mt-2 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setVetRating(n)} className={`rounded-lg p-1 transition ${n <= vetRating ? "text-amber-500" : "text-slate-300 hover:text-amber-300"}`}>
                    <Star className={`h-6 w-6 ${n <= vetRating ? "fill-current" : ""}`} />
                  </button>
                ))}
                <span className="ml-2 text-xs text-slate-400">rating (required to approve)</span>
              </div>
              <Textarea rows={2} className="mt-2" placeholder="Comment for the teacher…" value={vetComment} onChange={(e) => setVetComment(e.target.value)} />
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => returnNote(vetting.id)}><RotateCcw className="h-3.5 w-3.5" /> Return for revision</Button>
                <Button size="sm" variant="danger" onClick={() => review(vetting.id, "REJECTED")}><X className="h-3.5 w-3.5" /> Reject</Button>
                <Button size="sm" onClick={() => review(vetting.id, "APPROVED")}><Check className="h-3.5 w-3.5" /> Approve</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

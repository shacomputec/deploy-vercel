"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Download, FileSpreadsheet, FileUp, Layers, Pencil, Plus, Settings2, Trash2 } from "lucide-react";
import { api } from "@/lib/client";
import { fmtDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/admin/page-header";
import { useToast } from "@/components/ui/toast";

type Meta = {
  classes: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
  terms: { id: string; name: string; academicYear: { name: string } }[];
};
type Assessment = {
  id: string; title: string; type: string; maxScore: number; date: string | null;
  subject: { name: string }; class: { name: string }; term: { name: string };
  _count: { records: number };
};
type ScoreRow = { student: { id: string; fullName: string; admissionNo: string }; score: number | null };

type Marksheet = {
  classId: string; termId: string; className: string;
  subjects: { id: string; name: string }[];
  students: { id: string; fullName: string; admissionNo: string }[];
  cells: { studentId: string; subjectId: string; class: number | null; exam: number | null }[];
};

const SBA_COMPONENTS = ["classWork", "projectWork", "classTest", "practicals", "homework"] as const;
const SBA_LABELS: Record<string, string> = {
  classWork: "Class Work", projectWork: "Project Work", classTest: "Class Test", practicals: "Practicals", homework: "Homework",
};
const SBA_SHORT: Record<string, string> = { classWork: "CW", projectWork: "PW", classTest: "CT", practicals: "PR", homework: "HW" };

type SbaSheet = {
  classId: string; termId: string; className: string; termName: string;
  weights: Record<string, number>;
  subjects: { id: string; name: string }[];
  students: { id: string; fullName: string; admissionNo: string }[];
  cells: { studentId: string; subjectId: string; classWork: number | null; projectWork: number | null; classTest: number | null; practicals: number | null; homework: number | null; total: number | null }[];
  aggregates: Record<string, number | null>;
};

export default function AssessmentsPage() {
  const toast = useToast();
  const [meta, setMeta] = useState<Meta>({ classes: [], subjects: [], terms: [] });
  const [list, setList] = useState<Assessment[]>([]);
  const [classFilter, setClassFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ title: "", type: "SBA", classId: "", subjectId: "", termId: "", maxScore: "100", weight: "", date: "" });
  const [editing, setEditing] = useState<{ id: string; title: string } | null>(null);
  const [entry, setEntry] = useState<{ assessment: Assessment; rows: ScoreRow[] } | null>(null);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msOpen, setMsOpen] = useState(false);
  const [msClass, setMsClass] = useState("");
  const [msTerm, setMsTerm] = useState("");
  const [msData, setMsData] = useState<Marksheet | null>(null);
  const [msCells, setMsCells] = useState<Record<string, { class: string; exam: string }>>({});
  const [msSnapshot, setMsSnapshot] = useState<Record<string, { class: string; exam: string }>>({});
  const [msLoading, setMsLoading] = useState(false);
  const [msSaving, setMsSaving] = useState(false);
  const [sbaOpen, setSbaOpen] = useState(false);
  const [sbaClass, setSbaClass] = useState("");
  const [sbaTerm, setSbaTerm] = useState("");
  const [sbaData, setSbaData] = useState<SbaSheet | null>(null);
  const [sbaCells, setSbaCells] = useState<Record<string, Record<string, string>>>({});
  const [sbaSnapshot, setSbaSnapshot] = useState<Record<string, Record<string, string>>>({});
  const [sbaWeights, setSbaWeights] = useState<Record<string, string>>({});
  const [sbaLoading, setSbaLoading] = useState(false);
  const [sbaSaving, setSbaSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const url = `/api/assessments${classFilter ? `?classId=${classFilter}` : ""}`;
      const data = await api<Assessment[]>(url);
      setList(data);
    } catch (e) {
      toast.toast({ title: "Failed to load", description: (e as Error).message, variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [classFilter, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api<Meta>("/api/meta").then(setMeta).catch(() => {}); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        ...createForm,
        maxScore: Number(createForm.maxScore),
        weight: createForm.weight !== "" ? Number(createForm.weight) : undefined,
      };
      if (editing) {
        await api(`/api/assessments/${editing.id}`, { method: "PUT", body: JSON.stringify(body) });
        toast.toast({ title: "Assessment updated", variant: "success" });
      } else {
        await api("/api/assessments", { method: "POST", body: JSON.stringify(body) });
        toast.toast({ title: "Assessment created", variant: "success" });
      }
      setCreateOpen(false);
      setEditing(null);
      setCreateForm({ title: "", type: "SBA", classId: "", subjectId: "", termId: "", maxScore: "100", weight: "", date: "" });
      load();
    } catch (e) {
      toast.toast({ title: editing ? "Update failed" : "Create failed", description: (e as Error).message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function startEdit(a: Assessment) {
    try {
      const full = await api<Assessment & { classId: string; subjectId: string; termId: string; weight: number | null }>(`/api/assessments/${a.id}`);
      setCreateForm({
        title: full.title,
        type: full.type,
        classId: full.classId,
        subjectId: full.subjectId,
        termId: full.termId,
        maxScore: String(full.maxScore),
        weight: full.weight != null ? String(full.weight) : "",
        date: full.date ?? "",
      });
      setEditing({ id: a.id, title: a.title });
      setCreateOpen(true);
    } catch (e) {
      toast.toast({ title: "Failed to load", description: (e as Error).message, variant: "error" });
    }
  }

  async function openEntry(a: Assessment) {
    try {
      const data = await api<Assessment & { classStudents: { id: string; fullName: string; admissionNo: string }[]; records: { studentId: string; score: number }[] }>(`/api/assessments/${a.id}`);
      const rows = data.classStudents.map((s) => {
        const rec = data.records.find((r) => r.studentId === s.id);
        return { student: s, score: rec?.score ?? null };
      });
      const m: Record<string, string> = {};
      for (const r of rows) if (r.score !== null) m[r.student.id] = String(r.score);
      setScores(m);
      setEntry({ assessment: a, rows });
    } catch (e) {
      toast.toast({ title: "Failed to open", description: (e as Error).message, variant: "error" });
    }
  }

  async function saveScores() {
    if (!entry) return;
    setSaving(true);
    try {
      const records = entry.rows
        .map((r) => ({ studentId: r.student.id, score: scores[r.student.id] !== undefined && scores[r.student.id] !== "" ? Number(scores[r.student.id]) : 0 }))
        .filter((r) => !Number.isNaN(r.score));
      await api(`/api/assessments/${entry.assessment.id}/scores`, { method: "POST", body: JSON.stringify({ assessmentId: entry.assessment.id, records }) });
      toast.toast({ title: "Scores saved", variant: "success" });
      setEntry(null); load();
    } catch (e) {
      toast.toast({ title: "Save failed", description: (e as Error).message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function loadMs() {
    if (!msClass || !msTerm) return;
    setMsLoading(true);
    try {
      const data = await api<Marksheet>(`/api/assessments/marksheet?classId=${msClass}&termId=${msTerm}`);
      setMsData(data);
      const m: Record<string, { class: string; exam: string }> = {};
      for (const c of data.cells) {
        m[`${c.studentId}:${c.subjectId}`] = {
          class: c.class !== null ? String(c.class) : "",
          exam: c.exam !== null ? String(c.exam) : "",
        };
      }
      setMsCells(m);
      setMsSnapshot(m);
    } catch (e) {
      toast.toast({ title: "Failed to load mark sheet", description: (e as Error).message, variant: "error" });
    } finally {
      setMsLoading(false);
    }
  }

  async function saveMs() {
    if (!msData) return;
    setMsSaving(true);
    try {
      // Only send cells the user actually changed (blank = clear that component)
      const cells: { studentId: string; subjectId: string; class: number | null; exam: number | null }[] = [];
      for (const s of msData.students) {
        for (const subj of msData.subjects) {
          const k = `${s.id}:${subj.id}`;
          const cur = msCells[k] ?? { class: "", exam: "" };
          const prev = msSnapshot[k] ?? { class: "", exam: "" };
          const classChanged = (cur.class ?? "") !== (prev.class ?? "");
          const examChanged = (cur.exam ?? "") !== (prev.exam ?? "");
          if (!classChanged && !examChanged) continue;
          cells.push({
            studentId: s.id,
            subjectId: subj.id,
            class: classChanged && cur.class !== "" ? Number(cur.class) : null,
            exam: examChanged && cur.exam !== "" ? Number(cur.exam) : null,
          });
        }
      }
      if (!cells.length) {
        toast.toast({ title: "No changes", description: "Nothing was modified.", variant: "info" });
        return;
      }
      await api("/api/assessments/marksheet", {
        method: "POST",
        body: JSON.stringify({ classId: msData.classId, termId: msData.termId, cells }),
      });
      toast.toast({ title: "Mark sheet saved", description: `${cells.length} cell(s) updated — now live in the report cards.`, variant: "success" });
      await loadMs();
      load();
    } catch (e) {
      toast.toast({ title: "Save failed", description: (e as Error).message, variant: "error" });
    } finally {
      setMsSaving(false);
    }
  }

  async function loadSba() {
    if (!sbaClass || !sbaTerm) return;
    setSbaLoading(true);
    try {
      const data = await api<SbaSheet>(`/api/assessments/sba?classId=${sbaClass}&termId=${sbaTerm}`);
      setSbaData(data);
      const m: Record<string, Record<string, string>> = {};
      for (const c of data.cells) {
        m[`${c.studentId}:${c.subjectId}`] = {};
        for (const k of SBA_COMPONENTS) {
          const v = c[k];
          if (v !== null && v !== undefined) m[`${c.studentId}:${c.subjectId}`][k] = String(v);
        }
      }
      setSbaCells(m);
      setSbaSnapshot(m);
      setSbaWeights(Object.fromEntries(SBA_COMPONENTS.map((k) => [k, String(data.weights[k] ?? 20)])));
    } catch (e) {
      toast.toast({ title: "Failed to load SBA sheet", description: (e as Error).message, variant: "error" });
    } finally {
      setSbaLoading(false);
    }
  }

  function sbaTotalOf(v: Record<string, string>, weights: Record<string, string>): string {
    let sum = 0, wsum = 0;
    for (const k of SBA_COMPONENTS) {
      const raw = v[k];
      if (raw === undefined || raw === "") continue;
      const n = Number(raw);
      if (!Number.isFinite(n)) continue;
      const w = Number(weights[k] ?? 20) || 0;
      sum += Math.max(0, Math.min(100, n)) * w;
      wsum += w;
    }
    if (!wsum) return "";
    return (Math.round((sum / wsum) * 100) / 100).toFixed(1);
  }

  async function saveSba() {
    if (!sbaData) return;
    setSbaSaving(true);
    try {
      const rows: Record<string, unknown>[] = [];
      for (const s of sbaData.students) {
        for (const subj of sbaData.subjects) {
          const k = `${s.id}:${subj.id}`;
          const cur = sbaCells[k] ?? {};
          const prev = sbaSnapshot[k] ?? {};
          const changed = SBA_COMPONENTS.some((c) => (cur[c] ?? "") !== (prev[c] ?? ""));
          if (!changed) continue;
          const row: Record<string, unknown> = { studentId: s.id, subjectId: subj.id };
          let any = false;
          for (const c of SBA_COMPONENTS) {
            const v = cur[c];
            row[c] = v !== undefined && v !== "" ? Number(v) : null;
            if (v !== undefined && v !== "") any = true;
          }
          if (!any && !SBA_COMPONENTS.some((c) => (prev[c] ?? "") !== "")) continue; // was & still empty
          rows.push(row);
        }
      }
      if (!rows.length && sbaWeightsChanged()) {
        // only weights changed — still save them
      }
      if (!rows.length && !sbaWeightsChanged()) {
        toast.toast({ title: "No changes", description: "Nothing was modified.", variant: "info" });
        return;
      }
      await api("/api/assessments/sba", {
        method: "POST",
        body: JSON.stringify({
          classId: sbaData.classId,
          termId: sbaData.termId,
          rows,
          weights: Object.fromEntries(SBA_COMPONENTS.map((k) => [k, Number(sbaWeights[k] ?? 20)])),
        }),
      });
      toast.toast({ title: "SBA sheet saved", description: `${rows.length} subject cell(s) updated — live on the report cards.`, variant: "success" });
      await loadSba();
      load();
    } catch (e) {
      toast.toast({ title: "Save failed", description: (e as Error).message, variant: "error" });
    } finally {
      setSbaSaving(false);
    }
  }

  function sbaWeightsChanged(): boolean {
    if (!sbaData) return false;
    return SBA_COMPONENTS.some((k) => (sbaWeights[k] ?? "") !== String(sbaData.weights[k] ?? 20));
  }

  async function uploadScores(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("assessmentId", entry!.assessment.id);
    try {
      const data = await fetch("/api/results/upload", { method: "POST", body: fd }).then((r) => r.json());
      if (!data.ok) throw new Error(data.error ?? "Upload failed");
      toast.toast({ title: "Scores imported", description: `${data.data.imported} rows imported${data.data.skipped.length ? `, ${data.data.skipped.length} skipped (unknown admission numbers)` : ""}`, variant: "success" });
      openEntry(entry!.assessment);
    } catch (err) {
      toast.toast({ title: "Upload failed", description: (err as Error).message, variant: "error" });
    }
    e.target.value = "";
  }

  async function sbaExport(format: "csv" | "xlsx", template = false) {
    if (!sbaData) return;
    try {
      const res = await fetch(`/api/assessments/sba/export?classId=${sbaData.classId}&termId=${sbaData.termId}&format=${format}${template ? "&template=1" : ""}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = blob.type.includes("csv")
        ? `sba-${sbaData.className.replace(/\W+/g, "-").toLowerCase()}-${template ? "template" : "export"}.csv`
        : `sba-${sbaData.className.replace(/\W+/g, "-").toLowerCase()}-${template ? "template" : "export"}.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.toast({ title: template ? "SBA template downloaded" : "SBA sheet exported", description: template ? "Fill it in and use Import to load it back." : `${sbaData.students.length} students × ${sbaData.subjects.length} subjects`, variant: "success" });
    } catch (err) {
      toast.toast({ title: "Export failed", description: (err as Error).message, variant: "error" });
    }
  }

  async function sbaImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !sbaData) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("classId", sbaData.classId);
    fd.append("termId", sbaData.termId);
    try {
      const data = await fetch("/api/assessments/sba/import", { method: "POST", body: fd }).then((r) => r.json());
      if (!data.ok) throw new Error(data.error ?? "Import failed");
      toast.toast({ title: "SBA sheet imported", description: `${data.data.imported} cells saved · ${data.data.cleared} cleared${data.data.skipped.length ? ` · ${data.data.skipped.length} skipped` : ""}`, variant: "success" });
      await loadSba();
    } catch (err) {
      toast.toast({ title: "Import failed", description: (err as Error).message, variant: "error" });
    }
    e.target.value = "";
  }

  async function downloadTemplate() {
    if (!entry) return;
    try {
      const res = await fetch(`/api/results/upload?assessmentId=${entry.assessment.id}`);
      if (!res.ok) throw new Error("Template download failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `scores-template-${entry.assessment.title.replace(/\W+/g, "-").toLowerCase()}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      toast.toast({ title: "Template failed", description: (err as Error).message, variant: "error" });
    }
  }

  async function remove(a: Assessment) {
    if (!confirm(`Delete "${a.title}" and all its scores?`)) return;
    try {
      await api(`/api/assessments/${a.id}`, { method: "DELETE" });
      toast.toast({ title: "Assessment deleted", variant: "success" });
      load();
    } catch (e) {
      toast.toast({ title: "Delete failed", description: (e as Error).message, variant: "error" });
    }
  }

  const filteredSubjects = useMemo(() => meta.subjects, [meta.subjects]);

  return (
    <div>
      <PageHeader
        title="Assessments"
        subtitle="School-Based Assessments (SBA) and end-of-term examinations"
        action={<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setSbaOpen(true)}><Layers className="h-4 w-4" /> SBA Sheet</Button><Button variant="outline" onClick={() => setMsOpen(true)}><FileSpreadsheet className="h-4 w-4" /> Mark Sheet</Button><Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> New Assessment</Button></div>}
      />

      <div className="card mb-4 flex flex-wrap items-center gap-3 p-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Filter</span>
        <Select className="w-56" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
          <option value="">All classes</option>
          {meta.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        {!loading && (
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
            <ClipboardCheck className="h-3.5 w-3.5" /> {list.length} assessment{list.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {loading ? <div className="card p-8"><div className="skeleton h-4 w-full" /></div> :
      list.length === 0 ? <EmptyState title="No assessments yet" action={<Button onClick={() => setCreateOpen(true)}>Create one</Button>} /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Assessment</th><th>Type</th><th>Class</th><th>Subject</th><th>Term</th><th>Max</th><th>Scores</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id}>
                  <td className="font-medium text-slate-800">{a.title}</td>
                  <td><Badge tone={a.type === "SBA" ? "violet" : "amber"}>{a.type === "SBA" ? "SBA" : "Exam"}</Badge></td>
                  <td>{a.class.name}</td>
                  <td>{a.subject.name}</td>
                  <td className="text-xs">{a.term.name}</td>
                  <td>{a.maxScore}</td>
                  <td><Badge tone="blue">{a._count.records}</Badge></td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <button onClick={() => startEdit(a)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Edit assessment details"><Settings2 className="h-4 w-4" /></button>
                      <button onClick={() => openEntry(a)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Enter scores"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => remove(a)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Delete"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={createOpen} onClose={() => { setCreateOpen(false); setEditing(null); }} title={editing ? `Edit Assessment — ${editing.title}` : "New Assessment"} wide>
        <form onSubmit={create} className="grid gap-4 sm:grid-cols-2">
          <Field label="Title *"><Input required value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })} placeholder="e.g. SBA 1, End-of-Term Exam" /></Field>
          <Field label="Type *">
            <Select value={createForm.type} onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}>
              <option value="SBA">School-Based Assessment (SBA)</option>
              <option value="EXAM">End-of-Term Exam</option>
            </Select>
          </Field>
          <Field label="Class *">
            <Select required value={createForm.classId} onChange={(e) => setCreateForm({ ...createForm, classId: e.target.value })}>
              <option value="">Select…</option>
              {meta.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Subject *">
            <Select required value={createForm.subjectId} onChange={(e) => setCreateForm({ ...createForm, subjectId: e.target.value })}>
              <option value="">Select…</option>
              {filteredSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label="Term *">
            <Select required value={createForm.termId} onChange={(e) => setCreateForm({ ...createForm, termId: e.target.value })}>
              <option value="">Select…</option>
              {meta.terms.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.academicYear.name}</option>)}
            </Select>
          </Field>
          <Field label="Max score"><Input type="number" min="1" value={createForm.maxScore} onChange={(e) => setCreateForm({ ...createForm, maxScore: e.target.value })} /></Field>
          <Field label="Weight" hint="Optional contribution weight (defaults to 100)."><Input type="number" min="0" step="0.5" value={createForm.weight} onChange={(e) => setCreateForm({ ...createForm, weight: e.target.value })} placeholder="100" /></Field>
          <Field label="Date"><Input type="date" value={createForm.date} onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })} /></Field>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => { setCreateOpen(false); setEditing(null); }}>Cancel</Button>
            <Button type="submit" loading={saving}>{editing ? <ClipboardCheck className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{editing ? "Save Changes" : "Create"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!entry} onClose={() => setEntry(null)} title={`Scores — ${entry?.assessment.title}`} subtitle={`${entry?.assessment.class.name} · ${entry?.assessment.subject.name} · ${entry?.assessment.term.name}`} wide>        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="btn-outline btn-sm cursor-pointer">
              <FileUp className="h-4 w-4" /> Import CSV / Excel
              <input type="file" accept=".csv,.xlsx" className="hidden" onChange={uploadScores} />
            </label>
            <button className="btn-ghost btn-sm" onClick={downloadTemplate}><Download className="h-4 w-4" /> Template</button>
          </div>
          <span className="text-xs text-slate-400">Columns: AdmissionNo, Score — .csv or .xlsx</span>
        </div>
        <div className="max-h-[45vh] overflow-y-auto">
          <table className="table">
            <thead><tr><th>Student</th><th>Admission No</th><th className="w-40">Score / {entry?.assessment.maxScore}</th></tr></thead>
            <tbody>
              {entry?.rows.map((r) => (
                <tr key={r.student.id}>
                  <td className="font-medium text-slate-800">{r.student.fullName}</td>
                  <td className="font-mono text-xs">{r.student.admissionNo}</td>
                  <td>
                    <Input
                      type="number"
                      min="0"
                      max={entry?.assessment.maxScore}
                      value={scores[r.student.id] ?? ""}
                      onChange={(e) => setScores({ ...scores, [r.student.id]: e.target.value })}
                      placeholder="—"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setEntry(null)}>Cancel</Button>
          <Button onClick={saveScores} loading={saving}>Save All Scores</Button>
        </div>
      </Modal>

      <Modal open={sbaOpen} onClose={() => { setSbaOpen(false); setSbaData(null); }} title="SBA Component Sheet" subtitle="Class Work + Project Work + Class Test + Practicals + Homework → weighted SBA total (0–100). The total ÷ 2 appears on the report card as Class Exercise (50%)." wide>
        <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <Select value={sbaClass} onChange={(e) => { setSbaClass(e.target.value); setSbaData(null); }}>
            <option value="">Select class…</option>
            {meta.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select value={sbaTerm} onChange={(e) => { setSbaTerm(e.target.value); setSbaData(null); }}>
            <option value="">Select term…</option>
            {meta.terms.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.academicYear.name}</option>)}
          </Select>
          <Button type="button" onClick={loadSba} loading={sbaLoading} disabled={!sbaClass || !sbaTerm}>Load</Button>
        </div>
        {sbaData && (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <label className="btn-outline btn-sm cursor-pointer">
                <FileUp className="h-4 w-4" /> Import CSV / Excel
                <input type="file" accept=".csv,.xlsx" className="hidden" onChange={sbaImport} />
              </label>
              <button className="btn-ghost btn-sm" onClick={() => sbaExport("csv")}><Download className="h-4 w-4" /> Export CSV</button>
              <button className="btn-ghost btn-sm" onClick={() => sbaExport("xlsx")}><Download className="h-4 w-4" /> Export Excel</button>
              <button className="btn-ghost btn-sm" onClick={() => sbaExport("csv", true)}><Download className="h-4 w-4" /> Blank Template</button>
              <span className="ml-auto text-[11px] text-slate-400">Template columns: AdmissionNo, Subject, Class Work, Project Work, Class Test, Practicals, Homework</span>
            </div>
            <div className="mb-3 flex flex-wrap items-center gap-4 rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Component weights (sum 100%):</p>
              {SBA_COMPONENTS.map((k) => (
                <label key={k} className="flex items-center gap-1.5 text-xs text-slate-600">
                  {SBA_SHORT[k]}
                  <Input type="number" min={0} max={100} value={sbaWeights[k] ?? ""} onChange={(e) => setSbaWeights((w) => ({ ...w, [k]: e.target.value }))} className="h-7 w-14 px-1.5 text-center text-xs" />
                  <span className="text-slate-400">%</span>
                </label>
              ))}
              <span className="text-[11px] text-slate-400">Weights are a school-wide setting (senior staff only).</span>
            </div>
            <div className="max-h-[50vh] overflow-auto rounded-xl border border-slate-200">
              <table className="table">
                <thead>
                  <tr>
                    <th rowSpan={2} className="sticky left-0 z-10 min-w-44 bg-white text-left">Student Name</th>
                    {sbaData.subjects.map((s) => (
                      <th key={s.id} colSpan={6} className="border-l border-slate-200 text-center">{s.name}</th>
                    ))}
                    <th rowSpan={2} className="border-l border-slate-200 bg-amber-50 text-center text-amber-800">Aggregate (Σ)</th>
                  </tr>
                  <tr>
                    {sbaData.subjects.map((s) => (
                      <Fragment key={s.id}>
                        {SBA_COMPONENTS.map((k) => (
                          <th key={k} className="border-l border-slate-200 bg-slate-50 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500" title={SBA_LABELS[k]}>{SBA_SHORT[k]}</th>
                        ))}
                        <th className="border-l border-slate-200 bg-emerald-50 text-center text-[10px] font-bold text-emerald-700">Total</th>
                      </Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sbaData.students.map((s) => {
                    // Live aggregate: Σ of the student's subject totals (updates as you type)
                    const liveAgg = sbaData.subjects.reduce((sum, subj) => {
                      const v = sbaCells[`${s.id}:${subj.id}`] ?? {};
                      const t = sbaTotalOf(v, sbaWeights);
                      return t ? sum + Number(t) : sum;
                    }, 0);
                    const agg = liveAgg > 0 ? Math.round(liveAgg * 10) / 10 : (sbaData.aggregates[s.id] ?? null);
                    return (
                      <tr key={s.id}>
                        <td className="sticky left-0 z-10 bg-white font-medium text-slate-800">
                          {s.fullName}
                          <span className="block text-[10px] font-normal text-slate-400">{s.admissionNo}</span>
                        </td>
                        {sbaData.subjects.map((subj) => {
                          const v = sbaCells[`${s.id}:${subj.id}`] ?? {};
                          const total = sbaTotalOf(v, sbaWeights);
                          return (
                            <Fragment key={subj.id}>
                              {SBA_COMPONENTS.map((k) => (
                                <td key={k} className="border-l border-slate-200 p-1">
                                  <Input type="number" min={0} max={100} value={v[k] ?? ""} onChange={(e) => setSbaCells((m) => ({ ...m, [`${s.id}:${subj.id}`]: { ...v, [k]: e.target.value } }))} placeholder="—" className="h-8 w-14 px-1.5 text-center text-sm" />
                                </td>
                              ))}
                              <td className="border-l border-slate-200 bg-emerald-50/60 p-1 text-center text-sm font-bold text-emerald-700">{total || "—"}</td>
                            </Fragment>
                          );
                        })}
                        <td className="border-l border-slate-200 bg-amber-50/60 p-1 text-center text-sm font-bold text-amber-800">{agg ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-400">Each component is a mark out of 100. The weighted total (0–100) is the class score the report card halves into the 50% Class Exercise column.</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setSbaOpen(false)}>Close</Button>
              <Button onClick={saveSba} loading={sbaSaving}>Save SBA Sheet</Button>
            </div>
          </>
        )}
      </Modal>

      <Modal open={msOpen} onClose={() => { setMsOpen(false); setMsData(null); }} title="Class Mark Sheet" subtitle="One row per student — enter the Class (50%) and Exam (50%) score for each subject, just like the printed layout." wide>
        <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <Select value={msClass} onChange={(e) => { setMsClass(e.target.value); setMsData(null); }}>
            <option value="">Select class…</option>
            {meta.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select value={msTerm} onChange={(e) => { setMsTerm(e.target.value); setMsData(null); }}>
            <option value="">Select term…</option>
            {meta.terms.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.academicYear.name}</option>)}
          </Select>
          <Button type="button" onClick={loadMs} loading={msLoading} disabled={!msClass || !msTerm}>Load</Button>
        </div>
        {msData && (
          <>
            <div className="max-h-[50vh] overflow-auto rounded-xl border border-slate-200">
              <table className="table">
                <thead>
                  <tr>
                    <th rowSpan={2} className="sticky left-0 z-10 min-w-44 bg-white text-left">Student Name</th>
                    {msData.subjects.map((s) => (
                      <th key={s.id} colSpan={2} className="border-l border-slate-200 text-center">{s.name}</th>
                    ))}
                  </tr>
                  <tr>
                    {msData.subjects.map((s) => (
                      <Fragment key={s.id}>
                        <th className="border-l border-slate-200 bg-slate-50 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">Class 50%</th>
                        <th className="border-l border-slate-200 bg-slate-50 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">Exam 50%</th>
                      </Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {msData.students.map((s) => (
                    <tr key={s.id}>
                      <td className="sticky left-0 z-10 bg-white font-medium text-slate-800">
                        {s.fullName}
                        <span className="block text-[10px] font-normal text-slate-400">{s.admissionNo}</span>
                      </td>
                      {msData.subjects.map((subj) => {
                        const v = msCells[`${s.id}:${subj.id}`] ?? { class: "", exam: "" };
                        return (
                          <Fragment key={subj.id}>
                            <td className="border-l border-slate-200 p-1">
                              <Input type="number" min={0} max={100} value={v.class} onChange={(e) => setMsCells((m) => ({ ...m, [`${s.id}:${subj.id}`]: { ...v, class: e.target.value } }))} placeholder="—" className="h-8 px-2 text-center text-sm" />
                            </td>
                            <td className="border-l border-slate-200 p-1">
                              <Input type="number" min={0} max={100} value={v.exam} onChange={(e) => setMsCells((m) => ({ ...m, [`${s.id}:${subj.id}`]: { ...v, exam: e.target.value } }))} placeholder="—" className="h-8 px-2 text-center text-sm" />
                            </td>
                          </Fragment>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-400">The combined score (Class 50% + Exam 50%) drives the report-card grade. A blank cell leaves that component unset.</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setMsOpen(false)}>Close</Button>
              <Button onClick={saveMs} loading={msSaving}>Save Mark Sheet</Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

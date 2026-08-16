"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Eye, FileText, FileSpreadsheet, Globe, GlobeLock, Mail, MessageSquareText, PencilLine, Phone, PlusCircle, Printer, RefreshCw, Send, Sparkles } from "lucide-react";
import { api } from "@/lib/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/admin/page-header";
import { useToast } from "@/components/ui/toast";
import { ReportCardView } from "@/components/reports/report-card-view";
import type { ComputedReport } from "@/lib/report";

type Meta = {
  classes: { id: string; name: string }[];
  terms: { id: string; name: string; academicYear: { name: string } }[];
};
type ReportRow = {
  id: string; position: number | null; totalPercentage: number | null;
  published: boolean; promotionStatus: string | null;
  student: { id: string; fullName: string; admissionNo: string };
};
type StudentRow = { id: string; fullName: string; admissionNo: string };

export default function ReportsPage() {
  const toast = useToast();
  const [meta, setMeta] = useState<Meta>({ classes: [], terms: [] });
  const [classId, setClassId] = useState("");
  const [termId, setTermId] = useState("");
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<{ report: ComputedReport; schoolName: string; motto: string | null; logo: string | null; vacationDate: string | null; reopeningDate: string | null } | null>(null);
  const [previewReportId, setPreviewReportId] = useState<string | null>(null);
  const [comments, setComments] = useState<{ id: string; studentName: string; teacherComment: string; headComment: string; conduct: string } | null>(null);
  const [commentForm, setCommentForm] = useState({ teacherComment: "", headComment: "", conduct: "GOOD" });
  const [sendModal, setSendModal] = useState<{ mode: "all" | "one"; reportIds: string[]; studentLabel: string } | null>(null);
  const [sendChannels, setSendChannels] = useState<{ EMAIL: boolean; WHATSAPP: boolean }>({ EMAIL: true, WHATSAPP: true });
  const [sendNote, setSendNote] = useState("");
  const [sending, setSending] = useState(false);
  const [scores, setScores] = useState<{ report: ReportRow; subjects: { subjectId: string; subject: string; classScore: number | null; examScore: number | null }[] } | null>(null);
  const [scoresForm, setScoresForm] = useState<Record<string, { class: string; exam: string }>>({});
  const [scoresSnapshot, setScoresSnapshot] = useState<Record<string, { class: string; exam: string }>>({});
  const [scoresSaving, setScoresSaving] = useState(false);
  const [scoresVersion, setScoresVersion] = useState<string | null>(null); // optimistic lock
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [aiCommentLoading, setAiCommentLoading] = useState(false);

  useEffect(() => { api<Meta>("/api/meta").then(setMeta).catch(() => {}); }, []);

  const load = useCallback(async () => {
    if (!classId || !termId) { setReports([]); setStudents([]); return; }
    setLoading(true);
    try {
      const data = await api<{ reportCards: ReportRow[]; students: StudentRow[] }>(`/api/reports?classId=${classId}&termId=${termId}`);
      setReports(data.reportCards);
      setStudents(data.students);
    } catch (e) {
      toast.toast({ title: "Failed to load", description: (e as Error).message, variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [classId, termId, toast]);

  useEffect(() => { load(); }, [load]);

  async function generate() {
    if (!classId || !termId) return;
    setGenerating(true);
    try {
      await api("/api/reports", { method: "POST", body: JSON.stringify({ classId, termId }) });
      toast.toast({ title: "Report cards generated", variant: "success" });
      load();
    } catch (e) {
      toast.toast({ title: "Generation failed", description: (e as Error).message, variant: "error" });
    } finally {
      setGenerating(false);
    }
  }

  async function publishAll(published: boolean) {
    if (!classId || !termId) return;
    try {
      await api("/api/reports/publish-all", { method: "POST", body: JSON.stringify({ classId, termId, published }) });
      toast.toast({ title: published ? "Results published" : "Results hidden", variant: "success" });
      load();
    } catch (e) {
      toast.toast({ title: "Action failed", description: (e as Error).message, variant: "error" });
    }
  }

  async function togglePublish(r: ReportRow) {
    try {
      await api(`/api/reports/${r.id}`, { method: "POST", body: JSON.stringify({ published: !r.published }) });
      load();
    } catch (e) {
      toast.toast({ title: "Action failed", description: (e as Error).message, variant: "error" });
    }
  }

  async function openPreview(r: ReportRow) {
    try {
      const data = await api<{ data: ComputedReport; school: { name: string; motto: string | null; logo: string | null } }>(`/api/reports/${r.id}`);
      setPreviewReportId(r.id);
      setPreview({
        report: data.data,
        schoolName: data.school.name,
        motto: data.school.motto,
        logo: data.school.logo,
        vacationDate: null,
        reopeningDate: null,
      });
    } catch (e) {
      toast.toast({ title: "Failed to open", description: (e as Error).message, variant: "error" });
    }
  }

  async function openComments(r: ReportRow) {
    try {
      const data = await api<{ teacherComment: string | null; headComment: string | null; conduct: string | null }>(`/api/reports/${r.id}`);
      setComments({ id: r.id, studentName: r.student.fullName, teacherComment: data.teacherComment ?? "", headComment: data.headComment ?? "", conduct: data.conduct ?? "GOOD" });
      setCommentForm({ teacherComment: data.teacherComment ?? "", headComment: data.headComment ?? "", conduct: data.conduct ?? "GOOD" });
    } catch (e) {
      toast.toast({ title: "Failed to open", description: (e as Error).message, variant: "error" });
    }
  }

  async function generateAiComment() {
    if (!comments) return;
    setAiCommentLoading(true);
    try {
      const data = await api<{ comment: string }>(`/api/reports/${comments.id}/ai-comment`, {
        method: "POST",
        body: JSON.stringify({ conduct: commentForm.conduct }),
      });
      setCommentForm((f) => ({ ...f, teacherComment: data.comment }));
      toast.toast({ title: "AI comment generated", description: "Review and edit it before saving — it is not saved automatically.", variant: "success" });
    } catch (e) {
      toast.toast({ title: "Generation failed", description: (e as Error).message, variant: "error" });
    } finally {
      setAiCommentLoading(false);
    }
  }

  async function saveComments() {
    if (!comments) return;
    try {
      await api(`/api/reports/${comments.id}`, { method: "POST", body: JSON.stringify(commentForm) });
      toast.toast({ title: "Comments saved", description: `Updated for ${comments.studentName}`, variant: "success" });
      setComments(null);
    } catch (e) {
      toast.toast({ title: "Save failed", description: (e as Error).message, variant: "error" });
    }
  }

  async function openScores(r: ReportRow) {
    try {
      const data = await api<{ data: ComputedReport; updatedAt: string }>(`/api/reports/${r.id}`);
      setScoresVersion(data.updatedAt);
      const subjects = data.data.results.map((res) => ({
        subjectId: res.subjectId,
        subject: res.subject,
        classScore: res.classScore,
        examScore: res.examScore,
      }));
      const m: Record<string, { class: string; exam: string }> = {};
      for (const s of subjects) {
        m[s.subjectId] = { class: s.classScore != null ? String(s.classScore) : "", exam: s.examScore != null ? String(s.examScore) : "" };
      }
      setScoresForm(m);
      setScoresSnapshot(JSON.parse(JSON.stringify(m)));
      setScores({ report: r, subjects });
    } catch (e) {
      toast.toast({ title: "Failed to open", description: (e as Error).message, variant: "error" });
    }
  }

  async function saveScores() {
    if (!scores) return;
    setScoresSaving(true);
    try {
      // Only send subjects the admin actually changed — untouched subjects keep
      // their exact records (protects against accidental clears on save).
      const subjects = scores.subjects.flatMap((s) => {
        const v = scoresForm[s.subjectId] ?? { class: "", exam: "" };
        const prev = scoresSnapshot[s.subjectId] ?? { class: "", exam: "" };
        const classChanged = (v.class ?? "") !== (prev.class ?? "");
        const examChanged = (v.exam ?? "") !== (prev.exam ?? "");
        if (!classChanged && !examChanged) return [];
        return [{
          subjectId: s.subjectId,
          class: classChanged && v.class !== "" ? Number(v.class) : null,
          exam: examChanged && v.exam !== "" ? Number(v.exam) : null,
        }];
      });
      if (!subjects.length) {
        toast.toast({ title: "No changes", description: "Nothing was modified.", variant: "info" });
        return;
      }
      await api(`/api/reports/${scores.report.id}/scores`, {
        method: "POST",
        // Optimistic lock: rejected with 409 if the report changed meanwhile.
        body: JSON.stringify({ subjects, expectedUpdatedAt: scoresVersion ?? undefined }),
      });
      toast.toast({ title: "Scores saved", description: "Report card recomputed — grades, totals and position updated.", variant: "success" });
      setScores(null);
      load();
    } catch (e) {
      toast.toast({ title: "Save failed", description: (e as Error).message, variant: "error" });
    } finally {
      setScoresSaving(false);
    }
  }

  async function regenerateOne(r: ReportRow) {
    setRegenerating(r.id);
    try {
      await api("/api/reports", { method: "POST", body: JSON.stringify({ classId, termId, studentIds: [r.student.id] }) });
      toast.toast({ title: "Report regenerated", description: `Recomputed ${r.student.fullName} from the current assessment scores.`, variant: "success" });
      load();
    } catch (e) {
      toast.toast({ title: "Regenerate failed", description: (e as Error).message, variant: "error" });
    } finally {
      setRegenerating(null);
    }
  }

  async function exportMarkSheet(format: "csv" | "xlsx" = "csv") {
    if (!classId || !termId) return;
    try {
      const res = await fetch(`/api/reports/export?classId=${classId}&termId=${termId}&format=${format}`);
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Export failed");
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `report-cards-${new Date().toISOString().slice(0, 10)}.${format === "xlsx" ? "xlsx" : "csv"}`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.toast({ title: "Mark sheet exported", description: `${reports.length} students · every subject (Class %, Exam %, Total, Grade)`, variant: "success" });
    } catch (e) {
      toast.toast({ title: "Export failed", description: (e as Error).message, variant: "error" });
    }
  }

  async function sendResults() {
    if (!sendModal) return;
    const channels = (["EMAIL", "WHATSAPP"] as const).filter((c) => sendChannels[c]);
    if (!channels.length) return;
    setSending(true);
    try {
      const body = sendModal.mode === "one"
        ? { reportIds: sendModal.reportIds, channels, note: sendNote }
        : { classId, termId, channels, note: sendNote };
      const data = await api<{ sent: Record<string, number>; reports: number; failed: number }>("/api/reports/send", { method: "POST", body: JSON.stringify(body) });
      const sentTotal = Object.values(data.sent).reduce((a, b) => a + b, 0);
      toast.toast({
        title: "Reports sent",
        description: `${sentTotal} delivered for ${data.reports} report card(s) via ${channels.join(" + ")}`,
        variant: "success",
      });
      setSendModal(null);
      setSendNote("");
    } catch (e) {
      toast.toast({ title: "Send failed", description: (e as Error).message, variant: "error" });
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Report Cards"
        subtitle="Generate level-aware report cards (KG → SHS), then publish for the result checker"
      />

      <div className="card mb-6 flex flex-wrap items-end gap-4 p-5">
        <Field label="Class" className="min-w-56">
          <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Select class…</option>
            {meta.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Term" className="min-w-56">
          <Select value={termId} onChange={(e) => setTermId(e.target.value)}>
            <option value="">Select term…</option>
            {meta.terms.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.academicYear.name}</option>)}
          </Select>
        </Field>
        <Button onClick={generate} loading={generating} disabled={!classId || !termId}>
          <PlusCircle className="h-4 w-4" /> Generate All
        </Button>
        <div className="flex gap-2 sm:ml-auto">
          <Button variant="outline" onClick={() => window.open(`/reports/print/class/${classId}/${termId}`, "_blank", "noopener")} disabled={!reports.length}><Printer className="h-4 w-4" /> Print All (A4 PDF)</Button>
          <Button variant="outline" onClick={() => window.open(`/reports/print/class-summary/${classId}/${termId}`, "_blank", "noopener")} disabled={!reports.length} title="One A4 cover sheet: every student's position, total % and grade for this class + term"><FileSpreadsheet className="h-4 w-4" /> Summary Sheet</Button>
          <Button variant="outline" onClick={() => { setSendChannels({ EMAIL: true, WHATSAPP: true }); setSendNote(""); setSendModal({ mode: "all", reportIds: [], studentLabel: `${reports.length} students` }); }} disabled={!reports.length}><Send className="h-4 w-4" /> Send Results</Button>
          <Button variant="outline" onClick={() => exportMarkSheet("csv")} disabled={!reports.length}><Download className="h-4 w-4" /> Export Mark Sheet</Button>
          <Button variant="outline" onClick={() => publishAll(true)} disabled={!reports.length}><Globe className="h-4 w-4" /> Publish All</Button>
          <Button variant="ghost" onClick={() => publishAll(false)} disabled={!reports.length}><GlobeLock className="h-4 w-4" /> Hide All</Button>
        </div>
      </div>

      {loading ? <div className="card p-8"><div className="skeleton h-4 w-full" /></div> :
      !classId || !termId ? <EmptyState title="Select a class and term" hint="Then generate report cards for all students." /> :
      reports.length === 0 ? (
        <EmptyState
          title={`No report cards for this class/term (${students.length} students)`}
          hint="Enter assessment scores first, then generate."
          action={<Button onClick={generate}>Generate Report Cards</Button>}
        />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>#</th><th>Student</th><th>Admission No</th><th>Total %</th><th>Position</th><th>Status</th><th>Published</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td className="text-slate-400">{r.position ?? "—"}</td>
                  <td className="font-semibold text-slate-800">{r.student.fullName}</td>
                  <td className="font-mono text-xs">{r.student.admissionNo}</td>
                  <td className="font-semibold">{r.totalPercentage?.toFixed(1) ?? "—"}</td>
                  <td>{r.position ? `${r.position} of ${reports.length}` : "—"}</td>
                  <td><Badge tone={r.promotionStatus === "PROMOTED" ? "green" : r.promotionStatus === "CONDITIONAL" ? "amber" : "red"}>{r.promotionStatus ?? "—"}</Badge></td>
                  <td>{r.published ? <Badge tone="green">Live</Badge> : <Badge tone="slate">Hidden</Badge>}</td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <button onClick={() => { setSendChannels({ EMAIL: true, WHATSAPP: true }); setSendNote(""); setSendModal({ mode: "one", reportIds: [r.id], studentLabel: r.student.fullName }); }} className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600" title="Send result via email / WhatsApp"><Send className="h-4 w-4" /></button>
                      <button onClick={() => openScores(r)} className="rounded-lg p-2 text-slate-400 hover:bg-violet-50 hover:text-violet-600" title="Edit scores / grades"><PencilLine className="h-4 w-4" /></button>
                      <button onClick={() => regenerateOne(r)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Regenerate from assessment scores"><RefreshCw className={`h-4 w-4 ${regenerating === r.id ? "animate-spin" : ""}`} /></button>
                      <button onClick={() => openComments(r)} className="rounded-lg p-2 text-slate-400 hover:bg-amber-50 hover:text-amber-600" title="Edit comments / conduct"><MessageSquareText className="h-4 w-4" /></button>
                      <button onClick={() => openPreview(r)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Preview / print"><Eye className="h-4 w-4" /></button>
                      <button onClick={() => togglePublish(r)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title={r.published ? "Unpublish" : "Publish"}>
                        {r.published ? <GlobeLock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!sendModal} onClose={() => setSendModal(null)} title="Send Report Results" subtitle={`Deliver the report card link for ${sendModal?.studentLabel ?? ""} to their parents via email and/or WhatsApp — the secure result-checker portal keeps scores private.`}>
        {sendModal && (
          <div className="space-y-4">
            <Field label="Channels *">
              <div className="flex flex-wrap gap-2">
                {([["EMAIL", "Email", Mail], ["WHATSAPP", "WhatsApp", Phone]] as const).map(([key, label, Icon]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSendChannels((s) => ({ ...s, [key]: !s[key] }))}
                    className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-all ${sendChannels[key] ? "border-primary bg-primary-soft text-primary shadow-sm" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"}`}
                  >
                    <Icon className="h-4 w-4" /> {label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Note from school (optional)" hint="Appended to the message parents receive.">
              <Textarea rows={3} value={sendNote} onChange={(e) => setSendNote(e.target.value)} placeholder="e.g. Please collect the printed copy from the office. — Management" />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setSendModal(null)}>Cancel</Button>
              <Button onClick={sendResults} loading={sending} disabled={!sendChannels.EMAIL && !sendChannels.WHATSAPP}>
                <Send className="h-4 w-4" /> Send Report{sendModal.mode === "one" ? "" : "s"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!comments} onClose={() => setComments(null)} title={`Comments — ${comments?.studentName}`} subtitle="Teacher's comment, headteacher's comment and conduct appear on the printed report card.">
        {comments && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Teacher's comment</label>
                <button
                  type="button"
                  onClick={generateAiComment}
                  disabled={aiCommentLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 disabled:opacity-60"
                  title="Write a comment from the student's scores (offline-friendly; uses your AI key when configured)"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {aiCommentLoading ? "Writing…" : "AI comment"}
                </button>
              </div>
              <Textarea rows={3} value={commentForm.teacherComment} onChange={(e) => setCommentForm({ ...commentForm, teacherComment: e.target.value })} placeholder="A very good effort…" />
              <p className="text-[11px] text-slate-400">AI suggestions use the student's actual scores and are never saved until you press “Save Comments”.</p>
            </div>
            <Field label="Headteacher's comment">
              <Textarea rows={3} value={commentForm.headComment} onChange={(e) => setCommentForm({ ...commentForm, headComment: e.target.value })} placeholder="Keep it up…" />
            </Field>
            <Field label="Conduct">
              <Select value={commentForm.conduct} onChange={(e) => setCommentForm({ ...commentForm, conduct: e.target.value })}>
                {["EXCELLENT", "VERY GOOD", "GOOD", "FAIR", "POOR"].map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setComments(null)}>Cancel</Button>
              <Button onClick={saveComments}>Save Comments</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!scores} onClose={() => setScores(null)} title={`Edit Scores — ${scores?.report.student.fullName ?? ""}`} subtitle="Class (50%) and Exam (50%) per subject. Only edited subjects are saved — the class score replaces every SBA record for that subject (same rule as the mark sheet), then the report card is recomputed instantly." wide>
        {scores && (
          <div className="space-y-4">
            <div className="max-h-[55vh] overflow-y-auto rounded-xl border border-slate-200">
              <table className="table">
                <thead>
                  <tr>
                    <th className="text-left">Subject</th>
                    <th className="w-36">Class Score</th>
                    <th className="w-36">Exam Score</th>
                    <th className="w-28 text-center">Total (50/50)</th>
                  </tr>
                </thead>
                <tbody>
                  {scores.subjects.map((s) => {
                    const v = scoresForm[s.subjectId] ?? { class: "", exam: "" };
                    const total = v.class !== "" && v.exam !== "" ? (Number(v.class) * 0.5 + Number(v.exam) * 0.5).toFixed(1) : "—";
                    return (
                      <tr key={s.subjectId}>
                        <td className="font-medium text-slate-800">{s.subject}</td>
                        <td><Input type="number" min={0} max={100} value={v.class} onChange={(e) => setScoresForm((m) => ({ ...m, [s.subjectId]: { ...v, class: e.target.value } }))} placeholder="—" className="h-8 px-2 text-center text-sm" /></td>
                        <td><Input type="number" min={0} max={100} value={v.exam} onChange={(e) => setScoresForm((m) => ({ ...m, [s.subjectId]: { ...v, exam: e.target.value } }))} placeholder="—" className="h-8 px-2 text-center text-sm" /></td>
                        <td className="text-center font-semibold text-emerald-700">{total}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-400">Leave a box blank to clear that component. Scores are written through to the assessments, so regeneration stays consistent.</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setScores(null)}>Cancel</Button>
              <Button onClick={saveScores} loading={scoresSaving}><PencilLine className="h-4 w-4" /> Save & Recompute</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!preview} onClose={() => setPreview(null)} title="Report Card Preview" wide>
        {preview && (
          <div className="max-h-[70vh] overflow-y-auto print-area">
            <div className="mb-4 flex justify-end gap-2 no-print">
              <Button variant="outline" onClick={() => window.open(`/reports/print/${previewReportId}`, "_blank", "noopener")}><Printer className="h-4 w-4" /> Print / Save PDF (A4)</Button>
            </div>
            <ReportCardView report={preview.report} schoolName={preview.schoolName} motto={preview.motto} logo={preview.logo} />
          </div>
        )}
      </Modal>
    </div>
  );
}

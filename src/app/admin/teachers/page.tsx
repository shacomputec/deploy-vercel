"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Eye, FileText, FolderLock, KeyRound, Lock, Pencil, Plus, Search, Trash2, UploadCloud } from "lucide-react";
import { PortalAccountModal } from "@/components/admin/portal-account-modal";
import { api } from "@/lib/client";
import { fmtDate, maskPhone } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty";
import { Avatar } from "@/components/ui/avatar";
import { PageHeader } from "@/components/admin/page-header";
import { useToast } from "@/components/ui/toast";

type Teacher = {
  id: string; staffId: string; fullName: string; gender: string | null;
  phone: string | null; email: string | null; mainSubject: string | null;
  rank: string | null; salaryGrade: string | null; highestProfQual: string | null;
  ntcReg: string | null; ssfNumber: string | null; status: string;
  dateOfBirth: string | null; gradeType: string | null; gradeLevel: string | null;
  otherSubjects: string | null; highestAcadQual: string | null; specialization: string | null;
  institution: string | null; yearCompleted: number | null;
  dateOfFirstAppointment: string | null; dateOfLastPromotion: string | null; datePosted: string | null;
  hometown: string | null; district: string | null; region: string | null;
  ghanaCard: string | null; emergencyContact: string | null; association: string | null;
  religion: string | null; maritalStatus: string | null; teachingPeriodsPerWeek: number | null;
  classTeacherOf: { name: string }[];
};

type FormState = {
  staffId: string; fullName: string; gender: string; phone: string; email: string;
  dateOfBirth: string; rank: string; gradeType: string; gradeLevel: string; salaryGrade: string;
  mainSubject: string; otherSubjects: string; highestProfQual: string; highestAcadQual: string;
  ssfNumber: string; ntcReg: string; specialization: string; institution: string; yearCompleted: string;
  dateOfFirstAppointment: string; dateOfLastPromotion: string; datePosted: string;
  hometown: string; district: string; region: string; ghanaCard: string; emergencyContact: string;
  association: string; religion: string; maritalStatus: string; teachingPeriodsPerWeek: string;
};

const empty: FormState = {
  staffId: "", fullName: "", gender: "MALE", phone: "", email: "", dateOfBirth: "",
  rank: "", gradeType: "", gradeLevel: "", salaryGrade: "", mainSubject: "", otherSubjects: "",
  highestProfQual: "", highestAcadQual: "", ssfNumber: "", ntcReg: "", specialization: "",
  institution: "", yearCompleted: "", dateOfFirstAppointment: "", dateOfLastPromotion: "",
  datePosted: "", hometown: "", district: "", region: "", ghanaCard: "", emergencyContact: "",
  association: "", religion: "", maritalStatus: "", teachingPeriodsPerWeek: "",
};

function toForm(t: Teacher): FormState {
  return {
    staffId: t.staffId, fullName: t.fullName, gender: t.gender ?? "MALE",
    phone: t.phone ?? "", email: t.email ?? "", dateOfBirth: (t.dateOfBirth ?? "").slice(0, 10),
    rank: t.rank ?? "", gradeType: t.gradeType ?? "", gradeLevel: t.gradeLevel ?? "",
    salaryGrade: t.salaryGrade ?? "", mainSubject: t.mainSubject ?? "", otherSubjects: t.otherSubjects ?? "",
    highestProfQual: t.highestProfQual ?? "", highestAcadQual: t.highestAcadQual ?? "",
    ssfNumber: t.ssfNumber ?? "", ntcReg: t.ntcReg ?? "", specialization: t.specialization ?? "",
    institution: t.institution ?? "", yearCompleted: t.yearCompleted?.toString() ?? "",
    dateOfFirstAppointment: (t.dateOfFirstAppointment ?? "").slice(0, 10),
    dateOfLastPromotion: (t.dateOfLastPromotion ?? "").slice(0, 10),
    datePosted: (t.datePosted ?? "").slice(0, 10),
    hometown: t.hometown ?? "", district: t.district ?? "", region: t.region ?? "",
    ghanaCard: t.ghanaCard ?? "", emergencyContact: t.emergencyContact ?? "",
    association: t.association ?? "", religion: t.religion ?? "", maritalStatus: t.maritalStatus ?? "",
    teachingPeriodsPerWeek: t.teachingPeriodsPerWeek?.toString() ?? "",
  };
}

type Doc = { id: string; category: string | null; fileName: string; size: number; createdAt: string };

const DOC_SLOTS: { category: string; label: string }[] = [
  { category: "HIGHEST_PROF_QUAL", label: "Highest Professional Qualification" },
  { category: "FIRST_APPOINTMENT", label: "Date of First Appointment" },
  { category: "NTC_RED", label: "NTC / RED Number" },
  { category: "SPECIALIZATION", label: "Area of Specialization" },
  { category: "INSTITUTION", label: "Highest University / College Attended" },
  { category: "COLLEGE_COMPLETION", label: "Year Completed College" },
  { category: "LAST_PROMOTION", label: "Date of Last Promotion" },
  { category: "GHANA_CARD", label: "Ghana Card Number" },
];

export default function TeachersPage() {
  const toast = useToast();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | { mode: "create" } | { mode: "edit"; teacher: Teacher }>(null);
  const [view, setView] = useState<Teacher | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  const [acctFor, setAcctFor] = useState<Teacher | null>(null);
  const [canManageUsers, setCanManageUsers] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<Teacher[]>("/api/teachers");
      setTeachers(q ? data.filter((t) => t.fullName.toLowerCase().includes(q.toLowerCase()) || t.staffId.toLowerCase().includes(q.toLowerCase())) : data);
    } catch (e) {
      toast.toast({ title: "Failed to load", description: (e as Error).message, variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [q, toast]);

  useEffect(() => {
    api<{ perms?: Record<string, string[]>; roleName?: string }>("/api/auth/me")
      .then((m) => setCanManageUsers(m.roleName === "developer" || !!m.perms?.["users"]?.includes("update") || !!m.perms?.["users"]?.includes("manage")))
      .catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal?.mode === "edit") {
        await api(`/api/teachers/${modal.teacher.id}`, { method: "PUT", body: JSON.stringify(form) });
        toast.toast({ title: "Teacher updated", variant: "success" });
      } else {
        await api("/api/teachers", { method: "POST", body: JSON.stringify(form) });
        toast.toast({ title: "Teacher added", variant: "success" });
      }
      setModal(null); setForm(empty); load();
    } catch (e) {
      toast.toast({ title: "Save failed", description: (e as Error).message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function openView(t: Teacher) {
    setView(t);
    setDocsLoading(true);
    setDocs([]);
    try {
      setDocs(await api(`/api/teachers/${t.id}/documents`));
    } catch { /* ignore */ } finally {
      setDocsLoading(false);
    }
  }

  async function uploadDoc(e: React.ChangeEvent<HTMLInputElement>, category: string) {
    const file = e.target.files?.[0];
    if (!file || !view) return;
    setUploading(category);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", category);
      const res = await fetch(`/api/teachers/${view.id}/documents`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Upload failed");
      toast.toast({ title: "Document uploaded", description: "Encrypted with AES-256-GCM at rest.", variant: "success" });
      setDocs((d) => [data.data, ...d]);
    } catch (err) {
      toast.toast({ title: "Upload failed", description: (err as Error).message, variant: "error" });
    } finally {
      setUploading(null);
      e.target.value = "";
    }
  }

  async function downloadDoc(docId: string) {
    if (!view) return;
    try {
      const res = await fetch(`/api/teachers/${view.id}/documents?docId=${docId}`, { method: "PUT" });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = docs.find((d) => d.id === docId)?.fileName ?? "document";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      toast.toast({ title: "Download failed", description: (err as Error).message, variant: "error" });
    }
  }

  async function deleteDoc(docId: string) {
    if (!view) return;
    if (!confirm("Delete this confidential document permanently?")) return;
    try {
      await api(`/api/teachers/${view.id}/documents?docId=${docId}`, { method: "DELETE" });
      toast.toast({ title: "Document deleted", variant: "success" });
      setDocs((d) => d.filter((x) => x.id !== docId));
    } catch (err) {
      toast.toast({ title: "Delete failed", description: (err as Error).message, variant: "error" });
    }
  }

  async function remove(t: Teacher) {
    if (!confirm(`Delete ${t.fullName}?`)) return;
    try {
      await api(`/api/teachers/${t.id}`, { method: "DELETE" });
      toast.toast({ title: "Teacher deleted", variant: "success" });
      load();
    } catch (e) {
      toast.toast({ title: "Delete failed", description: (e as Error).message, variant: "error" });
    }
  }

  const docFor = (category: string) => docs.find((d) => d.category === category);

  return (
    <div>
      <PageHeader
        title="Teachers"
        subtitle="Teaching staff and confidential profiles"
        action={<Button onClick={() => { setForm(empty); setModal({ mode: "create" }); }}><Plus className="h-4 w-4" /> Add Teacher</Button>}
      />
      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input className="pl-9" placeholder="Search by name or Staff ID…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? <div className="card p-8"><div className="skeleton h-4 w-full" /></div> :
      teachers.length === 0 ? <EmptyState title="No teachers found" /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Teacher</th><th>Staff ID</th><th>Main Subject</th><th>Qualification</th><th>Form Teacher Of</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar name={t.fullName} />
                      <div><p className="font-semibold text-slate-800">{t.fullName}</p><p className="text-xs text-slate-400">{maskPhone(t.phone)}</p></div>
                    </div>
                  </td>
                  <td className="font-mono text-xs">{t.staffId}</td>
                  <td>{t.mainSubject ?? "—"}</td>
                  <td className="text-xs">{t.highestProfQual ?? "—"}</td>
                  <td className="text-xs">{t.classTeacherOf.map((c) => c.name).join(", ") || "—"}</td>
                  <td><StatusBadge status={t.status} /></td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openView(t)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="View profile & documents"><Eye className="h-4 w-4" /></button>
                      {canManageUsers && <button onClick={() => setAcctFor(t)} className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600" title="Assign / reset login credentials"><KeyRound className="h-4 w-4" /></button>}
                      <button onClick={() => { setForm(toForm(t)); setModal({ mode: "edit", teacher: t }); }} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Edit"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => remove(t)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Delete"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === "edit" ? "Edit Teacher" : "Add Teacher"} subtitle="Confidential profile — all fields are stored securely." wide>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <Field label="Staff ID *"><Input required value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })} /></Field>
          <Field label="Full name *"><Input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></Field>
          <Field label="Date of birth"><Input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} /></Field>
          <Field label="Sex">
            <Select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option value="MALE">Male</option><option value="FEMALE">Female</option>
            </Select>
          </Field>
          <Field label="Rank"><Input value={form.rank} onChange={(e) => setForm({ ...form, rank: e.target.value })} placeholder="e.g. Principal Superintendent" /></Field>
          <Field label="Grade type"><Input value={form.gradeType} onChange={(e) => setForm({ ...form, gradeType: e.target.value })} placeholder="e.g. Professional" /></Field>
          <Field label="Grade and level"><Input value={form.gradeLevel} onChange={(e) => setForm({ ...form, gradeLevel: e.target.value })} /></Field>
          <Field label="Salary grade"><Input value={form.salaryGrade} onChange={(e) => setForm({ ...form, salaryGrade: e.target.value })} placeholder="e.g. G01" /></Field>
          <Field label="Main subject"><Input value={form.mainSubject} onChange={(e) => setForm({ ...form, mainSubject: e.target.value })} /></Field>
          <Field label="Other subjects"><Input value={form.otherSubjects} onChange={(e) => setForm({ ...form, otherSubjects: e.target.value })} /></Field>
          <Field label="Highest professional qualification"><Input value={form.highestProfQual} onChange={(e) => setForm({ ...form, highestProfQual: e.target.value })} /></Field>
          <Field label="Highest academic qualification"><Input value={form.highestAcadQual} onChange={(e) => setForm({ ...form, highestAcadQual: e.target.value })} /></Field>
          <Field label="SSF number"><Input value={form.ssfNumber} onChange={(e) => setForm({ ...form, ssfNumber: e.target.value })} /></Field>
          <Field label="Staff email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Date of first appointment"><Input type="date" value={form.dateOfFirstAppointment} onChange={(e) => setForm({ ...form, dateOfFirstAppointment: e.target.value })} /></Field>
          <Field label="Staff telephone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="NTC / RED number"><Input value={form.ntcReg} onChange={(e) => setForm({ ...form, ntcReg: e.target.value })} /></Field>
          <Field label="Area of specialization"><Input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} /></Field>
          <Field label="Highest university / college attended"><Input value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} /></Field>
          <Field label="Year completed college"><Input type="number" min={1950} max={2100} value={form.yearCompleted} onChange={(e) => setForm({ ...form, yearCompleted: e.target.value })} /></Field>
          <Field label="Date of last promotion"><Input type="date" value={form.dateOfLastPromotion} onChange={(e) => setForm({ ...form, dateOfLastPromotion: e.target.value })} /></Field>
          <Field label="Date posted to present station"><Input type="date" value={form.datePosted} onChange={(e) => setForm({ ...form, datePosted: e.target.value })} /></Field>
          <Field label="Home town"><Input value={form.hometown} onChange={(e) => setForm({ ...form, hometown: e.target.value })} /></Field>
          <Field label="Home town district"><Input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} /></Field>
          <Field label="Home town region"><Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} /></Field>
          <Field label="Ghana Card number"><Input value={form.ghanaCard} onChange={(e) => setForm({ ...form, ghanaCard: e.target.value })} /></Field>
          <Field label="Emergency contact"><Input value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} /></Field>
          <Field label="Association type"><Input value={form.association} onChange={(e) => setForm({ ...form, association: e.target.value })} placeholder="e.g. GNAT, NAGRAT, CCT" /></Field>
          <Field label="Religion"><Input value={form.religion} onChange={(e) => setForm({ ...form, religion: e.target.value })} /></Field>
          <Field label="Marital status"><Input value={form.maritalStatus} onChange={(e) => setForm({ ...form, maritalStatus: e.target.value })} /></Field>
          <Field label="Periods per week"><Input type="number" min={0} max={60} value={form.teachingPeriodsPerWeek} onChange={(e) => setForm({ ...form, teachingPeriodsPerWeek: e.target.value })} /></Field>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
            <Button type="submit" loading={saving}>Save</Button>
          </div>
        </form>
      </Modal>

      <PortalAccountModal
        open={!!acctFor}
        onClose={() => setAcctFor(null)}
        kind="teacher"
        recordId={acctFor?.id ?? ""}
        personName={acctFor?.fullName ?? ""}
        recordEmail={acctFor?.email}
        onChanged={load}
      />

      <Modal open={!!view} onClose={() => setView(null)} title="Confidential Profile" wide>
        {view && (
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["Full name", view.fullName], ["Staff ID", view.staffId], ["Date of birth", fmtDate(view.dateOfBirth)],
              ["Sex", view.gender === "FEMALE" ? "Female" : view.gender ? "Male" : "—"], ["Rank", view.rank],
              ["Grade type", view.gradeType], ["Grade and level", view.gradeLevel], ["Salary grade", view.salaryGrade],
              ["Main subject", view.mainSubject], ["Other subjects", view.otherSubjects],
              ["Highest professional qualification", view.highestProfQual], ["Highest academic qualification", view.highestAcadQual],
              ["SSF number", view.ssfNumber], ["Staff email", view.email], ["Staff telephone", view.phone],
              ["NTC / RED number", view.ntcReg], ["Area of specialization", view.specialization],
              ["Highest university / college", view.institution], ["Year completed college", view.yearCompleted?.toString()],
              ["Date of first appointment", fmtDate(view.dateOfFirstAppointment)], ["Date of last promotion", fmtDate(view.dateOfLastPromotion)],
              ["Date posted to present station", fmtDate(view.datePosted)], ["Home town", view.hometown],
              ["Home town district", view.district], ["Home town region", view.region],
              ["Ghana Card number", view.ghanaCard], ["Emergency contact", view.emergencyContact],
              ["Association type", view.association], ["Religion", view.religion],
              ["Marital status", view.maritalStatus], ["Periods per week", view.teachingPeriodsPerWeek?.toString()],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-slate-50 px-4 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{k}</p>
                <p className="mt-0.5 text-sm font-medium text-slate-700">{v ?? "—"}</p>
              </div>
            ))}

            <div className="sm:col-span-2 mt-2 rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-700"><FolderLock className="h-4 w-4 text-emerald-600" /> Confidential Documents (PDF)</h4>
                <span className="flex items-center gap-1.5 text-xs text-slate-400"><Lock className="h-3 w-3" /> AES-256-GCM encrypted at rest</span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {DOC_SLOTS.map((slot) => {
                  const doc = docFor(slot.category);
                  return (
                    <label key={slot.category} className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 transition ${doc ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-slate-50 hover:border-slate-300"}`}>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                          {doc ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" /> : <UploadCloud className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
                          {slot.label}
                        </span>
                        <span className="block truncate pl-5 text-[11px] text-slate-400">{doc ? doc.fileName : "Click to upload PDF"}</span>
                      </span>
                      <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" className="hidden" onChange={(e) => uploadDoc(e, slot.category)} disabled={uploading !== null} />
                    </label>
                  );
                })}
              </div>
              <div className="mt-3 space-y-2">
                {docsLoading ? <p className="text-xs text-slate-400">Loading…</p> : docs.length === 0 ? (
                  <p className="text-xs text-slate-400">No documents yet. Upload certificates, appointment letters or confidential records above.</p>
                ) : docs.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                    <p className="flex min-w-0 items-center gap-2 text-sm text-slate-700"><FileText className="h-4 w-4 shrink-0 text-slate-400" /><span className="truncate">{d.fileName}</span><span className="shrink-0 text-xs text-slate-400">{(d.size / 1024).toFixed(0)} KB</span></p>
                    <div className="flex shrink-0 gap-1">
                      <button onClick={() => downloadDoc(d.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600" title="Download (decrypt)">Download</button>
                      <button onClick={() => deleteDoc(d.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Delete"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

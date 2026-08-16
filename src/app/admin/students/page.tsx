"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, FileUp, KeyRound, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { PortalAccountModal } from "@/components/admin/portal-account-modal";
import { api, ClientError } from "@/lib/client";
import { fmtDate, ageFrom, maskPhone } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty";
import { Avatar } from "@/components/ui/avatar";
import { PageHeader } from "@/components/admin/page-header";
import { useToast } from "@/components/ui/toast";

type Student = {
  id: string; admissionNo: string; fullName: string; gender: string;
  dateOfBirth: string | null; classId: string | null; phone: string | null;
  status: string; photo: string | null; nhisNumber: string | null; ghanaCard: string | null;
  updatedAt: string;
  class: { id: string; name: string; level: { name: string } } | null;
};
type Meta = { levels: { id: string; name: string }[]; classes: { id: string; name: string; levelId: string; level: { code: string } }[] };

const emptyForm = { fullName: "", gender: "MALE", dateOfBirth: "", classId: "", phone: "", religion: "", ghanaCard: "", nhisNumber: "" };

export default function StudentsPage() {
  const toast = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [meta, setMeta] = useState<Meta>({ levels: [], classes: [] });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [modal, setModal] = useState<null | { mode: "create" } | { mode: "edit"; student: Student }>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [acctFor, setAcctFor] = useState<Student | null>(null);
  const [canManageUsers, setCanManageUsers] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    try {
      const url = new URL("/api/students", window.location.origin);
      if (q) url.searchParams.set("q", q);
      if (classFilter) url.searchParams.set("classId", classFilter);
      const data = await api<{ students: Student[] }>(url.pathname + url.search);
      setStudents(data.students);
    } catch (e) {
      toast.toast({ title: "Failed to load students", description: (e as Error).message, variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [q, classFilter, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api<Meta>("/api/meta").then(setMeta).catch(() => {});
    api<{ perms?: Record<string, string[]>; roleName?: string }>("/api/auth/me")
      .then((m) => setCanManageUsers(m.roleName === "developer" || !!m.perms?.["users"]?.includes("update") || !!m.perms?.["users"]?.includes("manage")))
      .catch(() => {});
  }, []);

  const classesOfLevel = useMemo(
    () => (modal && "student" in modal && modal.student.classId ? meta.classes : meta.classes),
    [meta.classes, modal]
  );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal?.mode === "edit") {
        await api(`/api/students/${modal.student.id}`, {
          method: "PUT",
          // Optimistic lock: the version we loaded — rejected with 409 if someone
          // else saved this student while the edit form was open.
          body: JSON.stringify({ ...form, expectedUpdatedAt: modal.student.updatedAt }),
        });
        toast.toast({ title: "Student updated", variant: "success" });
      } else {
        await api("/api/students", { method: "POST", body: JSON.stringify(form) });
        toast.toast({ title: "Student added", description: "A new admission number was generated.", variant: "success" });
      }
      setModal(null);
      setForm(emptyForm);
      load();
    } catch (e) {
      toast.toast({ title: "Save failed", description: (e as Error).message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function remove(s: Student) {
    if (!confirm(`Delete ${s.fullName}? This removes all their records.`)) return;
    try {
      await api(`/api/students/${s.id}`, { method: "DELETE" });
      toast.toast({ title: "Student deleted", variant: "success" });
      load();
    } catch (e) {
      toast.toast({ title: "Delete failed", description: (e as Error).message, variant: "error" });
    }
  }

  const openCreate = () => { setForm(emptyForm); setModal({ mode: "create" }); };

  async function importStudents(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/students/import", { method: "POST", body: fd });
      const data = (await res.json()) as { ok?: boolean; error?: string; data?: { created: number; updated: number; skipped: string[] } };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Import failed");
      toast.toast({
        title: "Import complete",
        description: `${data.data?.created ?? 0} added · ${data.data?.updated ?? 0} updated${data.data?.skipped?.length ? ` · ${data.data.skipped.length} skipped` : ""}`,
        variant: "success",
      });
      load();
    } catch (err) {
      toast.toast({ title: "Import failed", description: (err as Error).message, variant: "error" });
    } finally {
      setImporting(false);
      if (importRef.current) importRef.current.value = "";
    }
  }

  async function exportCsv() {
    try {
      const url = new URL("/api/students/export", window.location.origin);
      if (classFilter) url.searchParams.set("classId", classFilter);
      const res = await fetch(url.pathname + url.search);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `students-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      toast.toast({ title: "Export failed", description: (e as Error).message, variant: "error" });
    }
  }
  const openEdit = (s: Student) => {
    setForm({
      fullName: s.fullName, gender: s.gender, dateOfBirth: s.dateOfBirth ? s.dateOfBirth.slice(0, 10) : "",
      classId: s.classId ?? "", phone: s.phone ?? "", religion: "", ghanaCard: s.ghanaCard ?? "", nhisNumber: s.nhisNumber ?? "",
    });
    setModal({ mode: "edit", student: s });
  };

  // KG → Basic 9 students identify with their NHIS number; SHS students use the
  // Ghana Card. The form labels follow the class the student is being placed in.
  const idFieldLabel = useMemo(() => {
    const cls = meta.classes.find((c) => c.id === form.classId);
    const code = cls?.level?.code ?? "";
    if (code === "SHS") return { label: "Ghana Card No. (SHS)", hint: "Enter the student's Ghana Card number (SHS students)." };
    if (code) return { label: "NHIS Number (KG–Basic 9)", hint: "Enter the student's National Health Insurance Scheme number (KG–Basic 9)." };
    return { label: "NHIS / Ghana Card No.", hint: "NHIS for KG–Basic 9, Ghana Card for SHS — the field follows the class level." };
  }, [meta.classes, form.classId]);

  return (
    <div>
      <PageHeader
        title="Students"
        subtitle={`${students.length} students`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4" /> Export CSV</Button>
            <Button variant="outline" onClick={() => importRef.current?.click()} loading={importing}><FileUp className="h-4 w-4" /> Import CSV / Excel</Button>
            <input ref={importRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={importStudents} />
            <Button onClick={openCreate}><Plus className="h-4 w-4" /> Add Student</Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9" placeholder="Search by name…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select className="w-56" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
          <option value="">All classes</option>
          {meta.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </div>

      {loading ? (
        <div className="card p-8"><div className="skeleton h-4 w-full" /></div>
      ) : students.length === 0 ? (
        <EmptyState title="No students found" hint="Add your first student or adjust the filters." action={<Button onClick={openCreate}>Add Student</Button>} />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Student</th><th>Admission No</th><th>Class</th><th>Age</th><th>Phone</th><th>Status</th><th className="text-right">Actions</th></tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar name={s.fullName} src={s.photo} />
                      <div>
                        <p className="font-semibold text-slate-800">{s.fullName}</p>
                        <p className="text-xs text-slate-400">{s.gender === "MALE" ? "Male" : "Female"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="font-mono text-xs">{s.admissionNo}</td>
                  <td>{s.class ? <Badge tone="blue">{s.class.name}</Badge> : <span className="text-slate-300">Unassigned</span>}</td>
                  <td>{ageFrom(s.dateOfBirth) ?? "—"}</td>
                  <td className="text-xs">{maskPhone(s.phone)}</td>
                  <td><StatusBadge status={s.status} /></td>
                  <td>
                    <div className="flex justify-end gap-1">
                      {canManageUsers && <button onClick={() => setAcctFor(s)} className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600" title="Assign / reset login credentials"><KeyRound className="h-4 w-4" /></button>}
                      <button onClick={() => openEdit(s)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Edit"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => remove(s)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Delete"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PortalAccountModal
        open={!!acctFor}
        onClose={() => setAcctFor(null)}
        kind="student"
        recordId={acctFor?.id ?? ""}
        personName={acctFor?.fullName ?? ""}
        onChanged={load}
      />

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === "edit" ? `Edit ${"student" in modal! ? (modal as { student: Student }).student.fullName : ""}` : "Add New Student"}
        subtitle="Admission numbers are generated automatically."
        wide
      >
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name *"><Input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></Field>
          <Field label="Gender *">
            <Select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option value="MALE">Male</option><option value="FEMALE">Female</option>
            </Select>
          </Field>
          <Field label="Date of birth"><Input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} /></Field>
          <Field label="Class">
            <Select value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}>
              <option value="">Unassigned</option>
              {classesOfLevel.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0244 000 000" /></Field>
          <Field label="Religion"><Input value={form.religion} onChange={(e) => setForm({ ...form, religion: e.target.value })} /></Field>
          <Field label={idFieldLabel.label} className="sm:col-span-2" hint={idFieldLabel.hint}>
            <Input value={form.nhisNumber} onChange={(e) => setForm({ ...form, nhisNumber: e.target.value })} placeholder={idFieldLabel.label.includes("NHIS") ? "e.g. 4710012345678" : "e.g. GHA-000000000-0"} />
          </Field>
          <Field label="Ghana Card No. (only for SHS)" className="sm:col-span-2" hint="Fill this instead of NHIS when the student is in Senior High School.">
            <Input value={form.ghanaCard} onChange={(e) => setForm({ ...form, ghanaCard: e.target.value })} placeholder="e.g. GHA-000000000-0" />
          </Field>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
            <Button type="submit" loading={saving}>{modal?.mode === "edit" ? "Save Changes" : "Add Student"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

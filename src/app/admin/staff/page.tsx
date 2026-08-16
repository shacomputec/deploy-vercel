"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { api } from "@/lib/client";
import { maskPhone } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty";
import { Avatar } from "@/components/ui/avatar";
import { PageHeader } from "@/components/admin/page-header";
import { useToast } from "@/components/ui/toast";

type Staff = {
  id: string; staffId: string; fullName: string; department: string | null;
  designation: string | null; phone: string | null; email: string | null; status: string;
};

const empty = { staffId: "", fullName: "", gender: "MALE", phone: "", email: "", department: "", designation: "" };
const DEPARTMENTS = ["Administration", "Accounts", "ICT", "Clinic", "Library", "Catering", "Security", "Transport", "Boarding"];

export default function StaffPage() {
  const toast = useToast();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | { mode: "create" } | { mode: "edit"; staff: Staff }>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<Staff[]>("/api/staff");
      setStaff(q ? data.filter((s) => s.fullName.toLowerCase().includes(q.toLowerCase()) || s.department?.toLowerCase().includes(q.toLowerCase())) : data);
    } catch (e) {
      toast.toast({ title: "Failed to load", description: (e as Error).message, variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [q, toast]);

  useEffect(() => { load(); }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal?.mode === "edit") {
        await api(`/api/staff/${modal.staff.id}`, { method: "PUT", body: JSON.stringify(form) });
      } else {
        await api("/api/staff", { method: "POST", body: JSON.stringify(form) });
      }
      toast.toast({ title: modal?.mode === "edit" ? "Staff updated" : "Staff added", variant: "success" });
      setModal(null); setForm(empty); load();
    } catch (e) {
      toast.toast({ title: "Save failed", description: (e as Error).message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function remove(s: Staff) {
    if (!confirm(`Delete ${s.fullName}?`)) return;
    try {
      await api(`/api/staff/${s.id}`, { method: "DELETE" });
      toast.toast({ title: "Staff deleted", variant: "success" });
      load();
    } catch (e) {
      toast.toast({ title: "Delete failed", description: (e as Error).message, variant: "error" });
    }
  }

  return (
    <div>
      <PageHeader
        title="Support Staff"
        subtitle="Non-teaching staff across all departments"
        action={<Button onClick={() => { setForm(empty); setModal({ mode: "create" }); }}><Plus className="h-4 w-4" /> Add Staff</Button>}
      />
      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input className="pl-9" placeholder="Search staff or department…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? <div className="card p-8"><div className="skeleton h-4 w-full" /></div> :
      staff.length === 0 ? <EmptyState title="No staff records" /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Staff</th><th>Staff ID</th><th>Department</th><th>Designation</th><th>Phone</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id}>
                  <td><div className="flex items-center gap-3"><Avatar name={s.fullName} /><p className="font-semibold text-slate-800">{s.fullName}</p></div></td>
                  <td className="font-mono text-xs">{s.staffId}</td>
                  <td>{s.department ?? "—"}</td>
                  <td className="text-xs">{s.designation ?? "—"}</td>
                  <td className="text-xs">{maskPhone(s.phone)}</td>
                  <td><StatusBadge status={s.status} /></td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <button onClick={() => { setForm({ staffId: s.staffId, fullName: s.fullName, gender: "MALE", phone: s.phone ?? "", email: s.email ?? "", department: s.department ?? "", designation: s.designation ?? "" }); setModal({ mode: "edit", staff: s }); }} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => remove(s)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === "edit" ? "Edit Staff" : "Add Staff"}>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <Field label="Staff ID *"><Input required value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })} /></Field>
          <Field label="Full name *"><Input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></Field>
          <Field label="Department">
            <Select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
              <option value="">Select…</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </Select>
          </Field>
          <Field label="Designation"><Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
            <Button type="submit" loading={saving}>Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

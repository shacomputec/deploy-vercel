"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Pencil, Plus, Search, Trash2, Users2 } from "lucide-react";
import { PortalAccountModal } from "@/components/admin/portal-account-modal";
import { api } from "@/lib/client";
import { maskPhone } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty";
import { Avatar } from "@/components/ui/avatar";
import { PageHeader } from "@/components/admin/page-header";
import { useToast } from "@/components/ui/toast";

type Parent = {
  id: string; fullName: string; phone: string; email: string | null;
  occupation: string | null; relationship: string | null;
  children: { student: { id: string; fullName: string; admissionNo: string; class: { name: string } | null } }[];
};

const empty = { fullName: "", phone: "", email: "", occupation: "", relationship: "GUARDIAN" };

export default function ParentsPage() {
  const toast = useToast();
  const [parents, setParents] = useState<Parent[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | { mode: "create" } | { mode: "edit"; parent: Parent }>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [acctFor, setAcctFor] = useState<Parent | null>(null);
  const [canManageUsers, setCanManageUsers] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<Parent[]>(`/api/parents${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      setParents(data);
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
        await api(`/api/parents/${modal.parent.id}`, { method: "PUT", body: JSON.stringify(form) });
        toast.toast({ title: "Parent updated", variant: "success" });
      } else {
        await api("/api/parents", { method: "POST", body: JSON.stringify(form) });
        toast.toast({ title: "Parent added", variant: "success" });
      }
      setModal(null); setForm(empty); load();
    } catch (e) {
      toast.toast({ title: "Save failed", description: (e as Error).message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function remove(p: Parent) {
    if (!confirm(`Delete ${p.fullName}?`)) return;
    try {
      await api(`/api/parents/${p.id}`, { method: "DELETE" });
      toast.toast({ title: "Parent deleted", variant: "success" });
      load();
    } catch (e) {
      toast.toast({ title: "Delete failed", description: (e as Error).message, variant: "error" });
    }
  }

  return (
    <div>
      <PageHeader
        title="Parents & Guardians"
        subtitle={`${parents.length} records`}
        action={<Button onClick={() => { setForm(empty); setModal({ mode: "create" }); }}><Plus className="h-4 w-4" /> Add Parent</Button>}
      />
      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input className="pl-9" placeholder="Search by name or phone…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? <div className="card p-8"><div className="skeleton h-4 w-full" /></div> :
      parents.length === 0 ? <EmptyState title="No parents found" /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Parent</th><th>Phone</th><th>Occupation</th><th>Children</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {parents.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar name={p.fullName} />
                      <div>
                        <p className="font-semibold text-slate-800">{p.fullName}</p>
                        <p className="text-xs text-slate-400">{p.relationship}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-xs">{maskPhone(p.phone)}</td>
                  <td className="text-xs">{p.occupation ?? "—"}</td>
                  <td>
                    {p.children.length === 0 ? <span className="text-slate-300">—</span> : (
                      <div className="flex flex-wrap gap-1">
                        {p.children.map((c) => (
                          <Badge key={c.student.id} tone="blue">{c.student.fullName.split(" ").slice(-1)[0]}</Badge>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="flex justify-end gap-1">
                      {canManageUsers && <button onClick={() => setAcctFor(p)} className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600" title="Assign / reset login credentials"><KeyRound className="h-4 w-4" /></button>}
                      <button onClick={() => { setForm({ fullName: p.fullName, phone: p.phone, email: p.email ?? "", occupation: p.occupation ?? "", relationship: p.relationship ?? "GUARDIAN" }); setModal({ mode: "edit", parent: p }); }} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Edit"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => remove(p)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Delete"><Trash2 className="h-4 w-4" /></button>
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
        kind="parent"
        recordId={acctFor?.id ?? ""}
        personName={acctFor?.fullName ?? ""}
        recordEmail={acctFor?.email}
        onChanged={load}
      />

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === "edit" ? "Edit Parent" : "Add Parent"} subtitle="Parents can be linked to multiple students.">
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name *"><Input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></Field>
          <Field label="Phone *"><Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Occupation"><Input value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} /></Field>
          <Field label="Relationship">
            <Select value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })}>
              <option value="FATHER">Father</option><option value="MOTHER">Mother</option><option value="GUARDIAN">Guardian</option>
            </Select>
          </Field>
          <div className="flex items-end justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
            <Button type="submit" loading={saving}><Users2 className="h-4 w-4" /> Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

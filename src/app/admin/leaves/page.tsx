"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Check, Plus, Trash2, X } from "lucide-react";
import { EmptyState } from "@/components/ui/empty";
import { api } from "@/lib/client";
import { fmtDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/admin/page-header";
import { useToast } from "@/components/ui/toast";

type Leave = {
  id: string;
  type: string;
  from: string;
  to: string;
  days: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote: string | null;
  decidedAt: string | null;
  createdAt: string;
  staff: { id: string; fullName: string; staffId: string; department: string | null; designation: string | null };
  decidedBy: { fullName: string } | null;
};

type StaffOption = { id: string; fullName: string; staffId: string; department: string | null };

const TYPE_STYLES: Record<string, { tone: "blue" | "amber" | "red" | "green" | "violet" | "slate"; label: string }> = {
  ANNUAL: { tone: "blue", label: "Annual" },
  SICK: { tone: "red", label: "Sick" },
  MATERNITY: { tone: "violet", label: "Maternity" },
  PATERNITY: { tone: "violet", label: "Paternity" },
  STUDY: { tone: "green", label: "Study" },
  UNPAID: { tone: "amber", label: "Unpaid" },
  OTHER: { tone: "slate", label: "Other" },
};

export default function LeavesPage() {
  const toast = useToast();
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [reqModal, setReqModal] = useState(false);
  const [form, setForm] = useState({ staffId: "", type: "ANNUAL", from: "", to: "", reason: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const q = statusFilter ? `?status=${statusFilter}` : "";
      setLeaves(await api<Leave[]>("/api/leaves" + q));
    } catch (e) {
      toast.toast({ title: "Failed to load leaves", description: (e as Error).message, variant: "error" });
    }
  }, [statusFilter, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api<StaffOption[]>("/api/staff?take=2000")
      .then(setStaff)
      .catch(() => {});
  }, []);

  async function requestLeave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/api/leaves", { method: "POST", body: JSON.stringify(form) });
      toast.toast({ title: "Leave requested", description: "HR will review it shortly.", variant: "success" });
      setReqModal(false);
      setForm({ staffId: "", type: "ANNUAL", from: "", to: "", reason: "" });
      load();
    } catch (err) {
      toast.toast({ title: "Request failed", description: (err as Error).message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function decide(id: string, status: "APPROVED" | "REJECTED") {
    const note = status === "REJECTED" ? prompt("Reason for rejection (optional):") : null;
    if (status === "REJECTED" && note === null) return;
    try {
      await api(`/api/leaves/${id}`, { method: "PUT", body: JSON.stringify({ status, note: note ?? undefined }) });
      toast.toast({ title: status === "APPROVED" ? "Leave approved" : "Leave rejected", variant: "success" });
      load();
    } catch (err) {
      toast.toast({ title: "Action failed", description: (err as Error).message, variant: "error" });
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this leave record permanently?")) return;
    try {
      await api(`/api/leaves/${id}`, { method: "DELETE" });
      load();
    } catch (err) {
      toast.toast({ title: "Delete failed", description: (err as Error).message, variant: "error" });
    }
  }

  const pending = leaves.filter((l) => l.status === "PENDING").length;
  const approved = leaves.filter((l) => l.status === "APPROVED").length;
  const daysOut = leaves.filter((l) => l.status === "APPROVED").reduce((a, l) => a + l.days, 0);

  return (
    <div>
      <PageHeader
        title="Staff Leave"
        subtitle={`${pending} pending · ${approved} approved · ${daysOut} approved days on record`}
        action={<Button onClick={() => setReqModal(true)}><Plus className="h-4 w-4" /> Request Leave</Button>}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Pending requests", value: pending, cls: "text-amber-600" },
          { label: "Approved", value: approved, cls: "text-emerald-600" },
          { label: "Approved days (recorded)", value: daysOut, cls: "text-primary" },
        ].map((s) => (
          <div key={s.label} className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{s.label}</p>
            <p className={`mt-1 text-3xl font-extrabold ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
        {[["", "All"], ["PENDING", "Pending"], ["APPROVED", "Approved"], ["REJECTED", "Rejected"]].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${statusFilter === key ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {leaves.length === 0 ? (
        <EmptyState
          title="No leave requests"
          hint="Staff can request leave from their portal — or request on their behalf here."
          action={<Button onClick={() => setReqModal(true)}><Plus className="h-4 w-4" /> Request Leave</Button>}
        />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Staff</th><th>Type</th><th>Period</th><th>Days</th><th>Reason</th>
                <th>Status</th><th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map((l) => (
                <tr key={l.id}>
                  <td>
                    <div>
                      <p className="font-medium text-slate-800">{l.staff.fullName}</p>
                      <p className="text-xs text-slate-400">{l.staff.staffId}{l.staff.department ? ` · ${l.staff.department}` : ""}</p>
                    </div>
                  </td>
                  <td><Badge tone={TYPE_STYLES[l.type]?.tone ?? "slate"}>{TYPE_STYLES[l.type]?.label ?? l.type}</Badge></td>
                  <td className="text-xs">{fmtDate(l.from)} → {fmtDate(l.to)}</td>
                  <td className="font-semibold">{l.days}</td>
                  <td className="max-w-[220px]">
                    <p className="truncate text-xs text-slate-500" title={l.reason}>{l.reason}</p>
                    {l.adminNote && <p className="truncate text-[11px] italic text-slate-400" title={l.adminNote}>Note: {l.adminNote}</p>}
                  </td>
                  <td>
                    {l.status === "PENDING" ? (
                      <Badge tone="amber">Pending</Badge>
                    ) : l.status === "APPROVED" ? (
                      <Badge tone="green">Approved</Badge>
                    ) : (
                      <Badge tone="red">Rejected</Badge>
                    )}
                    {l.decidedBy && (
                      <p className="mt-0.5 text-[10px] text-slate-400">by {l.decidedBy.fullName}</p>
                    )}
                  </td>
                  <td>
                    <div className="flex justify-end gap-1">
                      {l.status === "PENDING" && (
                        <>
                          <button onClick={() => decide(l.id, "APPROVED")} className="rounded-lg p-2 text-emerald-500 hover:bg-emerald-50" title="Approve">
                            <Check className="h-4 w-4" />
                          </button>
                          <button onClick={() => decide(l.id, "REJECTED")} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50" title="Reject">
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <button onClick={() => remove(l.id)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={reqModal} onClose={() => setReqModal(false)} title="Request Leave" subtitle="Pick the staff member (or leave blank for your own profile) and the dates.">
        <form onSubmit={requestLeave} className="space-y-4">
          <Field label="Staff member">
            <Select value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })}>
              <option value="">My own profile (self-service)</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.fullName} ({s.staffId}){s.department ? ` — ${s.department}` : ""}</option>)}
            </Select>
          </Field>
          <Field label="Leave type *">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="ANNUAL">Annual leave</option>
              <option value="SICK">Sick leave</option>
              <option value="MATERNITY">Maternity</option>
              <option value="PATERNITY">Paternity</option>
              <option value="STUDY">Study leave</option>
              <option value="UNPAID">Unpaid leave</option>
              <option value="OTHER">Other</option>
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="From *"><Input required type="date" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} /></Field>
            <Field label="To *"><Input required type="date" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} /></Field>
          </div>
          <Field label="Reason *"><Textarea required rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Why is this leave needed?" /></Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setReqModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}><CalendarClock className="h-4 w-4" /> Submit Request</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

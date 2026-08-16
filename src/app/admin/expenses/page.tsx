"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Receipt, Trash2, TrendingDown } from "lucide-react";
import { api } from "@/lib/client";
import { fmtDate, ghs } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/admin/page-header";
import { useToast } from "@/components/ui/toast";

type Expense = {
  id: string; title: string; amount: number; category: string | null; date: string; note: string | null;
};

const CATEGORIES = ["Salaries", "Utilities", "Maintenance", "Teaching Materials", "Feeding", "Transport", "Sports", "Events", "Other"];

export default function ExpensesPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState({ title: "", amount: "", category: "Other", date: new Date().toISOString().slice(0, 10), note: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ rows: Expense[]; total: number }>(`/api/expenses?month=${month}`);
      setRows(data.rows);
      setTotal(data.total);
    } catch (e) {
      toast.toast({ title: "Failed to load", description: (e as Error).message, variant: "error" });
    }
  }, [month, toast]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({ title: "", amount: "", category: "Other", date: new Date().toISOString().slice(0, 10), note: "" });
    setModal(true);
  }

  function openEdit(r: Expense) {
    setEditing(r);
    setForm({ title: r.title, amount: String(r.amount), category: r.category ?? "Other", date: r.date.slice(0, 10), note: r.note ?? "" });
    setModal(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api(`/api/expenses/${editing.id}`, { method: "PUT", body: JSON.stringify({ ...form, amount: Number(form.amount) }) });
        toast.toast({ title: "Expense updated", variant: "success" });
      } else {
        await api("/api/expenses", { method: "POST", body: JSON.stringify({ ...form, amount: Number(form.amount) }) });
        toast.toast({ title: "Expense recorded", variant: "success" });
      }
      setModal(false);
      load();
    } catch (e) {
      toast.toast({ title: "Save failed", description: (e as Error).message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function remove(r: Expense) {
    if (!confirm(`Delete expense "${r.title}" (${ghs(r.amount)})?`)) return;
    try {
      await api(`/api/expenses/${r.id}`, { method: "DELETE" });
      toast.toast({ title: "Expense deleted", variant: "success" });
      load();
    } catch (e) {
      toast.toast({ title: "Delete failed", description: (e as Error).message, variant: "error" });
    }
  }

  const byCategory = Object.fromEntries(
    CATEGORIES.map((c) => [c, rows.filter((r) => (r.category ?? "Other") === c).reduce((a, r) => a + r.amount, 0)])
  );

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle="Record school expenditure — the accountant's ledger"
        action={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Record Expense</Button>}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs font-medium text-slate-400">Month total</p>
          <p className="mt-1 flex items-center gap-2 text-2xl font-bold text-rose-600"><TrendingDown className="h-5 w-5" /> {ghs(total)}</p>
        </div>
        {CATEGORIES.slice(0, 3).map((c) => (
          <div key={c} className="card p-4">
            <p className="text-xs font-medium text-slate-400">{c}</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">{ghs(byCategory[c] ?? 0)}</p>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-48" />
      </div>

      {rows.length === 0 ? <EmptyState title="No expenses this month" action={<Button onClick={openCreate}>Record one</Button>} /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Expense</th><th>Category</th><th>Date</th><th>Amount</th><th>Note</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="font-semibold text-slate-800">{r.title}</td>
                  <td><Badge tone="blue">{r.category ?? "Other"}</Badge></td>
                  <td className="text-sm">{fmtDate(r.date)}</td>
                  <td className="font-semibold text-rose-600">{ghs(r.amount)}</td>
                  <td className="text-xs text-slate-500">{r.note}</td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(r)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => remove(r)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Edit Expense" : "Record Expense"}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Title *"><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Electricity bill" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount (GHS) *"><Input required type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            <Field label="Category">
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Date"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          </div>
          <Field label="Note"><Textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}><Receipt className="h-4 w-4" /> {editing ? "Save" : "Record"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

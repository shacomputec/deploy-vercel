"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Banknote, BellRing, HandCoins, Plus, Printer, Receipt, Trash2, Wallet } from "lucide-react";
import { EmptyState } from "@/components/ui/empty";
import { api } from "@/lib/client";
import { ghs, fmtDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/admin/page-header";
import { useToast } from "@/components/ui/toast";

type FeeItem = { id: string; name: string; amount: number; mandatory: boolean; level: { id: string; name: string } | null };
type Payment = { id: string; receiptNo: string; amount: number; method: string; date: string; reference: string | null; student: { id: string; fullName: string; admissionNo: string; classId: string | null } };
type Meta = { levels: { id: string; name: string }[]; classes: { id: string; name: string }[]; terms: { id: string; name: string; isCurrent: boolean; academicYear: { name: string } }[] };
type Student = { id: string; fullName: string; admissionNo: string; classId: string | null; class: { id: string; name: string; level: { id: string; name: string } } | null };
type Expense = { id: string; title: string; amount: number; category: string | null; date: string };

export default function FeesPage() {
  const toast = useToast();
  const [fees, setFees] = useState<FeeItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [meta, setMeta] = useState<Meta>({ levels: [], classes: [], terms: [] });
  const [students, setStudents] = useState<Student[]>([]);
  const [payClass, setPayClass] = useState("");
  const [tab, setTab] = useState<"fees" | "billing" | "payments">("fees");
  const currentTerm = meta.terms.find((t) => t.isCurrent) ?? meta.terms[0] ?? null;

  async function sendArrearsReminders() {
    if (!payClass) return;
    setReminding(true);
    try {
      const data = await api<{ reminded: number; total: number; sent: Record<string, number>; unreachable: { student: string; balance: number }[] }>(
        "/api/fees/remind",
        { method: "POST", body: JSON.stringify({ classId: payClass }) }
      );
      const chans = Object.entries(data.sent).filter(([, n]) => n > 0).map(([c, n]) => `${c} ${n}`).join(" + ") || "none";
      toast.toast({
        title: "Reminders sent",
        description: `${data.reminded} parent contact(s) reminded (${chans})` + (data.unreachable.length ? ` · ${data.unreachable.length} student(s) have no parent contact.` : ""),
        variant: "success",
      });
    } catch (e) {
      toast.toast({ title: "Reminder failed", description: (e as Error).message, variant: "error" });
    } finally {
      setReminding(false);
    }
  }
  const [feeModal, setFeeModal] = useState(false);
  const [feeForm, setFeeForm] = useState({ name: "", levelId: "", amount: "", mandatory: true });
  const [payModal, setPayModal] = useState(false);
  const [payForm, setPayForm] = useState({ studentId: "", amount: "", method: "MOMO", reference: "", note: "" });
  const [saving, setSaving] = useState(false);
  const [reminding, setReminding] = useState(false);

  const load = useCallback(async () => {
    try {
      const [f, p, e] = await Promise.all([
        api<FeeItem[]>("/api/fees"),
        api<Payment[]>("/api/payments?take=5000"),
        api<{ rows: Expense[]; total: number }>("/api/expenses"),
      ]);
      setFees(f);
      setPayments(p);
      setExpenses(e.rows);
    } catch (e) {
      toast.toast({ title: "Failed to load", description: (e as Error).message, variant: "error" });
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api<Meta>("/api/meta").then(setMeta).catch(() => {});
    loadStudents("");
  }, []);

  // When a class is picked, every name in that class appears so the payer can
  // be selected directly (no need to search across the whole school).
  const loadStudents = useCallback(async (classId: string) => {
    try {
      const q = classId ? `?classId=${encodeURIComponent(classId)}&take=2000` : "?take=2000";
      const d = await api<{ students: Student[] }>("/api/students" + q);
      setStudents(d.students);
    } catch {
      /* ignore */
    }
  }, []);

  const onPayClassChange = (classId: string) => {
    setPayClass(classId);
    setPayForm((f) => ({ ...f, studentId: "" }));
    loadStudents(classId);
  };

  async function addFee(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/api/fees", { method: "POST", body: JSON.stringify({ ...feeForm, amount: Number(feeForm.amount) }) });
      toast.toast({ title: "Fee added", variant: "success" });
      setFeeModal(false);
      setFeeForm({ name: "", levelId: "", amount: "", mandatory: true });
      load();
    } catch (e) {
      toast.toast({ title: "Add failed", description: (e as Error).message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function addPayment(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/api/payments", { method: "POST", body: JSON.stringify({ ...payForm, amount: Number(payForm.amount) }) });
      toast.toast({ title: "Payment recorded", description: "A receipt number was issued.", variant: "success" });
      setPayModal(false);
      setPayForm({ studentId: "", amount: "", method: "MOMO", reference: "", note: "" });
      setPayClass("");
      load();
    } catch (e) {
      toast.toast({ title: "Payment failed", description: (e as Error).message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function removeFee(f: FeeItem) {
    if (!confirm(`Delete fee "${f.name}"?`)) return;
    try {
      await api(`/api/fees/${f.id}`, { method: "DELETE" });
      load();
    } catch (e) {
      toast.toast({ title: "Delete failed", description: (e as Error).message, variant: "error" });
    }
  }

  // ── Billing: expected (mandatory fees for the student's level) vs paid ──
  const billingRows = useMemo(() => {
    if (!payClass) return [];
    const paidByStudent = new Map<string, number>();
    for (const p of payments) {
      paidByStudent.set(p.student.id, (paidByStudent.get(p.student.id) ?? 0) + p.amount);
    }
    return students
      .filter((s) => s.classId === payClass)
      .map((s) => {
        const levelId = s.class?.level.id ?? null;
        const expected = fees
          .filter((f) => f.mandatory && (f.level === null || f.level.id === levelId))
          .reduce((a, f) => a + f.amount, 0);
        const paid = paidByStudent.get(s.id) ?? 0;
        return { student: s, expected, paid, balance: Math.max(0, expected - paid), surplus: Math.max(0, paid - expected) };
      })
      .sort((a, b) => b.balance - a.balance || a.student.fullName.localeCompare(b.student.fullName));
  }, [payClass, students, fees, payments]);

  const collected = payments.reduce((a, p) => a + p.amount, 0);
  const spent = expenses.reduce((a, e) => a + e.amount, 0);
  const inArrears = billingRows.filter((r) => r.balance > 0).length;
  const arrearsTotal = billingRows.reduce((a, r) => a + r.balance, 0);

  const openCollect = (studentId: string) => {
    setPayClass(students.find((s) => s.id === studentId)?.classId ?? payClass);
    setPayForm((f) => ({ ...f, studentId }));
    setPayModal(true);
  };

  return (
    <div>
      <PageHeader
        title="Fees & Payments"
        subtitle={`${ghs(collected)} collected · ${ghs(spent)} expenses · net ${ghs(collected - spent)}`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setFeeModal(true)}><Plus className="h-4 w-4" /> Add Fee Item</Button>
            <Button onClick={() => setPayModal(true)}><Wallet className="h-4 w-4" /> Record Payment</Button>
          </div>
        }
      />

      {/* Finance strip */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Collected (receipts)", value: ghs(collected), cls: "text-emerald-600", icon: Wallet },
          { label: "Expenses", value: ghs(spent), cls: "text-rose-600", icon: Banknote },
          { label: "Net position", value: ghs(collected - spent), cls: collected >= spent ? "text-primary" : "text-rose-600", icon: HandCoins },
          { label: "In arrears (selected class)", value: `${inArrears} student${inArrears === 1 ? "" : "s"} · ${ghs(arrearsTotal)}`, cls: inArrears ? "text-amber-600" : "text-emerald-600", icon: Receipt },
        ].map((s) => (
          <div key={s.label} className="card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{s.label}</p>
              <s.icon className="h-4 w-4 text-slate-300" />
            </div>
            <p className={`mt-1 text-2xl font-extrabold ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-5 flex gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
        {([["fees", "Fee Structure"], ["billing", "Billing & Arrears"], ["payments", "Payments"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === key ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "fees" ? (
        fees.length === 0 ? (
          <EmptyState title="No fee items yet" hint="Add tuition, levies and other charges — parents see them at checkout." action={<Button onClick={() => setFeeModal(true)}><Plus className="h-4 w-4" /> Add Fee Item</Button>} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Fee</th><th>Level</th><th>Amount</th><th>Type</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {fees.map((f) => (
                  <tr key={f.id}>
                    <td className="font-medium text-slate-800">{f.name}</td>
                    <td>{f.level?.name ?? "All levels"}</td>
                    <td className="font-semibold">{ghs(f.amount)}</td>
                    <td>{f.mandatory ? <Badge tone="green">Mandatory</Badge> : <Badge tone="slate">Optional</Badge>}</td>
                    <td><div className="flex justify-end"><button onClick={() => removeFee(f)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button></div></td>
                  </tr>
                ))}
                <tr className="bg-emerald-50/60 font-semibold">
                  <td colSpan={2}>Total (all levels)</td>
                  <td className="text-emerald-700">{ghs(fees.reduce((a, f) => a + f.amount, 0))}</td>
                  <td colSpan={2} />
                </tr>
              </tbody>
            </table>
          </div>
        )
      ) : tab === "billing" ? (
        <div className="space-y-4">
          <div className="card flex flex-wrap items-center gap-3 p-5">
            <div className="w-full max-w-xs">
              <Select value={payClass} onChange={(e) => onPayClassChange(e.target.value)}>
                <option value="">Select a class…</option>
                {meta.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <Button variant="outline" size="sm" disabled={!payClass || !currentTerm} onClick={() => window.open(`/reports/print/fee-receipts/${payClass}/${currentTerm.id}`, "_blank", "noopener")} title={`Print one official receipt per student · ${currentTerm?.name ?? ""} ${currentTerm?.academicYear?.name ?? ""}`}>
              <Printer className="h-4 w-4" /> Print Receipts
            </Button>
            <Button variant="outline" size="sm" disabled={!payClass || inArrears === 0} loading={reminding} onClick={sendArrearsReminders} title="SMS + WhatsApp + email the parents of students with an outstanding balance (via the school's own messaging keys)">
              <BellRing className="h-4 w-4" /> Remind arrears ({inArrears})
            </Button>
            <p className="text-xs text-slate-500">
              Expected = mandatory fee items for each student's level. Paid = all receipts on record. Arrears = expected − paid.
            </p>
          </div>
          {!payClass ? (
            <EmptyState title="Pick a class to bill" hint="Choose a class above — every student in it appears with their expected amount, paid total and arrears." />
          ) : billingRows.length === 0 ? (
            <EmptyState title="No students in this class" hint="Add students to the class first." />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Student</th><th>Class</th><th>Expected</th><th>Paid</th><th>Balance</th><th className="text-right">Action</th></tr>
                </thead>
                <tbody>
                  {billingRows.map((r) => (
                    <tr key={r.student.id} className={r.balance > 0 ? "bg-amber-50/40" : ""}>
                      <td>
                        <div>
                          <p className="font-medium text-slate-800">{r.student.fullName}</p>
                          <p className="text-xs text-slate-400">{r.student.admissionNo}</p>
                        </div>
                      </td>
                      <td className="text-xs">{r.student.class?.name ?? "—"}</td>
                      <td className="font-semibold">{ghs(r.expected)}</td>
                      <td className="font-semibold text-emerald-700">{ghs(r.paid)}</td>
                      <td>
                        {r.balance > 0 ? (
                          <Badge tone="amber">{ghs(r.balance)} owing</Badge>
                        ) : (
                          <Badge tone="green">{r.surplus > 0 ? `Cleared (+${ghs(r.surplus)})` : "Cleared"}</Badge>
                        )}
                      </td>
                      <td>
                        <div className="flex justify-end">
                          <Button size="sm" variant="outline" onClick={() => openCollect(r.student.id)} disabled={r.balance === 0}>
                            <Wallet className="h-3.5 w-3.5" /> Collect
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-semibold">
                    <td colSpan={2}>Class totals</td>
                    <td>{ghs(billingRows.reduce((a, r) => a + r.expected, 0))}</td>
                    <td className="text-emerald-700">{ghs(billingRows.reduce((a, r) => a + r.paid, 0))}</td>
                    <td className="text-amber-700">{ghs(arrearsTotal)} owing</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        payments.length === 0 ? (
          <EmptyState title="No payments recorded" hint="Record cash, MoMo, card or bank payments — receipts are issued automatically." action={<Button onClick={() => setPayModal(true)}><Wallet className="h-4 w-4" /> Record Payment</Button>} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Receipt</th><th>Student</th><th>Amount</th><th>Method</th><th>Date</th><th>Reference</th></tr></thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="font-mono text-xs">{p.receiptNo}</td>
                    <td>
                      <div>
                        <p className="font-medium text-slate-800">{p.student.fullName}</p>
                        <p className="text-xs text-slate-400">{p.student.admissionNo}</p>
                      </div>
                    </td>
                    <td className="font-semibold text-emerald-700">{ghs(p.amount)}</td>
                    <td><Badge tone={p.method === "MOMO" ? "amber" : "blue"}>{p.method}</Badge></td>
                    <td className="text-xs">{fmtDate(p.date)}</td>
                    <td className="text-xs">{p.reference ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      <Modal open={feeModal} onClose={() => setFeeModal(false)} title="Add Fee Item">
        <form onSubmit={addFee} className="space-y-4">
          <Field label="Fee name *"><Input required value={feeForm.name} onChange={(e) => setFeeForm({ ...feeForm, name: e.target.value })} placeholder="e.g. Tuition, PTA Levy" /></Field>
          <Field label="Level">
            <Select value={feeForm.levelId} onChange={(e) => setFeeForm({ ...feeForm, levelId: e.target.value })}>
              <option value="">All levels</option>
              {meta.levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </Select>
          </Field>
          <Field label="Amount (GHS) *"><Input required type="number" min="0" step="0.5" value={feeForm.amount} onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={feeForm.mandatory} onChange={(e) => setFeeForm({ ...feeForm, mandatory: e.target.checked })} className="h-4 w-4 rounded" />
            Mandatory fee
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setFeeModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Add Fee</Button>
          </div>
        </form>
      </Modal>

      <Modal open={payModal} onClose={() => setPayModal(false)} title="Record Payment" subtitle="A receipt number is generated automatically.">
        <form onSubmit={addPayment} className="space-y-4">
          <Field label="Class" hint="Pick the class to list its students, or leave blank to search all.">
            <Select value={payClass} onChange={(e) => onPayClassChange(e.target.value)}>
              <option value="">All classes</option>
              {meta.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Student *">
            <Select required value={payForm.studentId} onChange={(e) => setPayForm({ ...payForm, studentId: e.target.value })}>
              <option value="">Select student…</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.fullName} ({s.admissionNo}){s.classId === null ? " (unassigned)" : ""}</option>)}
            </Select>
          </Field>
          <Field label="Amount (GHS) *"><Input required type="number" min="0" step="0.5" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} /></Field>
          <Field label="Method *">
            <Select value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}>
              <option value="CASH">Cash</option><option value="MOMO">Mobile Money</option>
              <option value="CARD">Card</option><option value="BANK">Bank Transfer</option>
              <option value="PAYSTACK">Paystack</option>
            </Select>
          </Field>
          <Field label="Transaction reference"><Input value={payForm.reference} onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} placeholder="e.g. MoMo transaction ID" /></Field>
          <Field label="Note"><Input value={payForm.note} onChange={(e) => setPayForm({ ...payForm, note: e.target.value })} placeholder="e.g. First term tuition" /></Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setPayModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}><Receipt className="h-4 w-4" /> Record & Issue Receipt</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

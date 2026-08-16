"use client";

import { useCallback, useEffect, useState } from "react";
import { Banknote, ChevronDown, Play, Trash2, CheckCircle2, Scale as ScaleIcon, Wallet } from "lucide-react";
import { api } from "@/lib/client";
import { fmtDate, ghs, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/admin/page-header";
import { CrudPage } from "@/components/admin/crud-page";
import { useToast } from "@/components/ui/toast";
import { OPERATIONS_BY_ROUTE } from "@/lib/crud-configs";

type PayrollRun = {
  id: string; month: string; label: string | null; status: string;
  totalGross: number; totalDeductions: number; totalNet: number;
  entriesCount: number; processedAt: string | null; createdAt: string;
};
type PayrollEntry = {
  id: string; employeeType: string; employeeName: string; staffId: string | null;
  basic: number; allowance: number; gross: number; ssf: number; tax: number;
  deductions: number; net: number; status: string;
};

const STATUS_TONE: Record<string, "green" | "blue" | "slate" | "amber"> = {
  PAID: "green", PROCESSED: "blue", DRAFT: "slate", PENDING: "amber",
};

export default function PayrollPage() {
  const toast = useToast();
  const [tab, setTab] = useState<"runs" | "scales">("runs");
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [processing, setProcessing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [entries, setEntries] = useState<Record<string, PayrollEntry[]>>({});
  const [loadingRun, setLoadingRun] = useState<string | null>(null);
  const [payModal, setPayModal] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payTarget, setPayTarget] = useState<PayrollRun | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<PayrollRun[]>("/api/payroll/runs");
      setRuns(data);
    } catch (e) {
      toast.toast({ title: "Failed to load", description: (e as Error).message, variant: "error" });
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function processRun() {
    setProcessing(true);
    try {
      const run = await api<PayrollRun>("/api/payroll/runs", { method: "POST", body: JSON.stringify({ month }) });
      toast.toast({ title: "Payroll processed", description: `${run.entriesCount} employees — net ${ghs(run.totalNet)}`, variant: "success" });
      setPayTarget(run);
      setPayModal(true);
      load();
    } catch (e) {
      toast.toast({ title: "Processing failed", description: (e as Error).message, variant: "error" });
    } finally {
      setProcessing(false);
    }
  }

  async function toggleRun(r: PayrollRun) {
    if (expanded === r.id) { setExpanded(null); return; }
    setExpanded(r.id);
    if (!entries[r.id]) {
      setLoadingRun(r.id);
      try {
        const detail = await api<{ entries: PayrollEntry[] }>(`/api/payroll/runs/${r.id}`);
        setEntries((e) => ({ ...e, [r.id]: detail.entries }));
      } catch (err) {
        toast.toast({ title: "Failed to load run", description: (err as Error).message, variant: "error" });
      } finally {
        setLoadingRun(null);
      }
    }
  }

  async function markPaid(r: PayrollRun) {
    if (!confirm(`Mark ${r.label ?? r.month} as paid (${r.entriesCount} employees)?`)) return;
    setPaying(true);
    try {
      await api(`/api/payroll/runs/${r.id}/pay`, { method: "POST", body: JSON.stringify({}) });
      toast.toast({ title: "Run marked as paid", variant: "success" });
      setPayModal(false);
      load();
    } catch (e) {
      toast.toast({ title: "Failed", description: (e as Error).message, variant: "error" });
    } finally {
      setPaying(false);
    }
  }

  async function removeRun(r: PayrollRun) {
    if (!confirm(`Delete payroll run ${r.label ?? r.month}? This cannot be undone.`)) return;
    try {
      await api(`/api/payroll/runs/${r.id}`, { method: "DELETE" });
      toast.toast({ title: "Run deleted", variant: "success" });
      load();
    } catch (e) {
      toast.toast({ title: "Delete failed", description: (e as Error).message, variant: "error" });
    }
  }

  const totals = runs.reduce(
    (a, r) => ({ gross: a.gross + r.totalGross, net: a.net + r.totalNet, deductions: a.deductions + r.totalDeductions }),
    { gross: 0, net: 0, deductions: 0 }
  );

  return (
    <div>
      <PageHeader
        title="Payroll & HR"
        subtitle="Salary scales, monthly payroll runs and payslips — GHS"
        action={
          <div className="flex items-center gap-2">
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-44" />
            <Button onClick={processRun} loading={processing}><Play className="h-4 w-4" /> Process Payroll</Button>
          </div>
        }
      />

      <div className="mb-5 flex gap-1 rounded-xl bg-white p-1 shadow-sm">
        <button onClick={() => setTab("runs")} className={cn("flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition", tab === "runs" ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50")}>
          <Banknote className="h-4 w-4" /> Payroll Runs
        </button>
        <button onClick={() => setTab("scales")} className={cn("flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition", tab === "scales" ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50")}>
          <ScaleIcon className="h-4 w-4" /> Salary Scales
        </button>
      </div>

      {tab === "scales" ? (
        <CrudPage cfg={OPERATIONS_BY_ROUTE.get("payroll/scales")!} />
      ) : (
        <>
          {runs.length > 0 && (
            <div className="mb-5 grid gap-3 sm:grid-cols-3">
              <div className="card p-4">
                <p className="text-xs font-medium text-slate-400">Total gross</p>
                <p className="mt-1 text-2xl font-bold text-slate-800">{ghs(totals.gross)}</p>
              </div>
              <div className="card p-4">
                <p className="text-xs font-medium text-slate-400">Total deductions (SSF + tax)</p>
                <p className="mt-1 text-2xl font-bold text-rose-600">{ghs(totals.deductions)}</p>
              </div>
              <div className="card p-4">
                <p className="text-xs font-medium text-slate-400">Total net pay</p>
                <p className="mt-1 flex items-center gap-2 text-2xl font-bold text-emerald-600"><Wallet className="h-5 w-5" /> {ghs(totals.net)}</p>
              </div>
            </div>
          )}

          {runs.length === 0 ? <EmptyState title="No payroll runs yet" hint="Pick a month and click “Process Payroll” to generate payslips for all active teachers & staff." /> : (
            <div className="space-y-3">
              {runs.map((r) => (
                <div key={r.id} className="card overflow-hidden">
                  <button onClick={() => toggleRun(r)} className="flex w-full items-center gap-4 p-4 text-left transition hover:bg-slate-50">
                    <ChevronDown className={cn("h-5 w-5 shrink-0 text-slate-400 transition-transform", expanded === r.id && "rotate-180")} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800">{r.label ?? r.month}</p>
                      <p className="text-xs text-slate-400">{r.month} · {r.entriesCount} employees · processed {r.processedAt ? fmtDate(r.processedAt) : "—"}</p>
                    </div>
                    <div className="hidden gap-6 sm:flex">
                      <div><p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Gross</p><p className="text-sm font-semibold">{ghs(r.totalGross)}</p></div>
                      <div><p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Net</p><p className="text-sm font-semibold text-emerald-600">{ghs(r.totalNet)}</p></div>
                    </div>
                    <Badge tone={STATUS_TONE[r.status] ?? "slate"}>{r.status}</Badge>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      {r.status !== "PAID" && (
                        <button onClick={() => { setPayTarget(r); setPayModal(true); }} className="rounded-lg p-2 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600" title="Mark as paid"><CheckCircle2 className="h-4 w-4" /></button>
                      )}
                      <button onClick={() => removeRun(r)} className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" title="Delete run"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </button>

                  {expanded === r.id && (
                    <div className="border-t border-slate-100">
                      {loadingRun === r.id ? <div className="p-4"><div className="skeleton h-4 w-full" /></div> :
                      entries[r.id] ? (
                        <div className="table-wrap !rounded-none !border-0">
                          <table className="table">
                            <thead><tr><th>Employee</th><th>Type</th><th>Basic</th><th>Allowance</th><th>Gross</th><th>SSF</th><th>Tax</th><th>Deductions</th><th>Net Pay</th><th>Status</th></tr></thead>
                            <tbody>
                              {entries[r.id].map((e) => (
                                <tr key={e.id}>
                                  <td className="font-semibold text-slate-800">{e.employeeName}<span className="ml-2 text-xs font-normal text-slate-400">{e.staffId}</span></td>
                                  <td><Badge tone={e.employeeType === "TEACHER" ? "blue" : "slate"}>{e.employeeType}</Badge></td>
                                  <td>{ghs(e.basic)}</td>
                                  <td>{ghs(e.allowance)}</td>
                                  <td className="font-medium">{ghs(e.gross)}</td>
                                  <td>{ghs(e.ssf)}</td>
                                  <td>{ghs(e.tax)}</td>
                                  <td className="text-rose-600">{ghs(e.deductions)}</td>
                                  <td className="font-semibold text-emerald-600">{ghs(e.net)}</td>
                                  <td><Badge tone={e.status === "PAID" ? "green" : "amber"}>{e.status}</Badge></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <Modal open={payModal} onClose={() => setPayModal(false)} title="Confirm payment">
        {payTarget && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-4 text-sm">
              <p className="font-semibold text-slate-800">{payTarget.label ?? payTarget.month}</p>
              <p className="mt-1 text-slate-500">{payTarget.entriesCount} employees · net <span className="font-bold text-emerald-600">{ghs(payTarget.totalNet)}</span></p>
            </div>
            <p className="text-sm text-slate-500">Mark this run as paid? Each payslip entry will be updated to <b>PAID</b> and can be printed from the expanded run.</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setPayModal(false)}>Cancel</Button>
              <Button type="button" onClick={() => payTarget && markPaid(payTarget)} loading={paying}><CheckCircle2 className="h-4 w-4" /> Confirm Payment</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

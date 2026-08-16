"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, History, Rocket, TrendingUp } from "lucide-react";
import { api } from "@/lib/client";
import { fmtDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/admin/page-header";
import { useToast } from "@/components/ui/toast";

type Meta = {
  classes: { id: string; name: string }[];
  terms: { id: string; name: string; academicYear: { name: string } }[];
};
type PromotionRow = {
  id: string; status: string; remark: string | null; createdAt: string;
  student: { fullName: string; admissionNo: string };
  fromClass: { name: string };
  toClass: { name: string } | null;
};

export default function PromotionsPage() {
  const toast = useToast();
  const [meta, setMeta] = useState<Meta>({ classes: [], terms: [] });
  const [classId, setClassId] = useState("");
  const [termId, setTermId] = useState("");
  const [onlyPromoted, setOnlyPromoted] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ promoted: number; repeated: number; results: { student: string; status: string; toClass: string | null }[] } | null>(null);
  const [history, setHistory] = useState<PromotionRow[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => { api<Meta>("/api/meta").then(setMeta).catch(() => {}); }, []);

  const loadHistory = useCallback(async () => {
    try {
      const data = await api<PromotionRow[]>("/api/promotions?classId=" + (classId || ""));
      setHistory(data);
    } catch { /* ignore */ }
  }, [classId]);

  useEffect(() => { if (showHistory) loadHistory(); }, [showHistory, loadHistory]);

  async function runPromotion() {
    if (!classId || !termId) return;
    setRunning(true);
    setResult(null);
    try {
      const data = await api<{ promoted: number; repeated: number; results: { student: string; status: string; toClass: string | null }[] }>("/api/promotions", {
        method: "POST",
        body: JSON.stringify({ classId, termId, onlyPromoted }),
      });
      setResult(data);
      toast.toast({ title: "Promotion run complete", description: `${data.promoted} promoted · ${data.repeated} repeating`, variant: "success" });
    } catch (e) {
      toast.toast({ title: "Promotion failed", description: (e as Error).message, variant: "error" });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Promotion"
        subtitle="Year-end bulk promotion — students move to the next class based on report-card status."
        action={<Button variant="outline" onClick={() => setShowHistory(!showHistory)}><History className="h-4 w-4" /> {showHistory ? "Hide history" : "Promotion history"}</Button>}
      />

      <div className="card mb-6 p-5">
        <div className="flex flex-wrap items-end gap-4">
          <Field label="Class" className="min-w-56">
            <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">Select class…</option>
              {meta.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Term (report cards)" className="min-w-56">
            <Select value={termId} onChange={(e) => setTermId(e.target.value)}>
              <option value="">Select term…</option>
              {meta.terms.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.academicYear.name}</option>)}
            </Select>
          </Field>
          <Field label="Move conditional students too?">
            <Select value={String(onlyPromoted)} onChange={(e) => setOnlyPromoted(e.target.value === "true")}>
              <option value="true">No — only full passes</option>
              <option value="false">Yes — include conditional</option>
            </Select>
          </Field>
          <Button onClick={runPromotion} loading={running} disabled={!classId || !termId}>
            <Rocket className="h-4 w-4" /> Run Promotion
          </Button>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Students at the final level (e.g. SHS 3) are marked <strong>Graduated</strong> instead of being moved. Re-running is idempotent.
        </p>
      </div>

      {result && (
        <div className="card mb-6 border-emerald-200 bg-emerald-50/50 p-5">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-emerald-600" />
              <div>
                <p className="text-2xl font-bold text-emerald-700">{result.promoted}</p>
                <p className="text-xs text-emerald-600">Promoted</p>
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{result.repeated}</p>
              <p className="text-xs text-amber-600">Repeating</p>
            </div>
          </div>
          <div className="mt-4 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white">
            <table className="table">
              <thead><tr><th>Student</th><th>Outcome</th><th>Next class</th></tr></thead>
              <tbody>
                {result.results.map((r, i) => (
                  <tr key={i}>
                    <td className="font-medium text-slate-800">{r.student}</td>
                    <td><Badge tone={r.status === "PROMOTED" ? "green" : "amber"}>{r.status}</Badge></td>
                    <td className="text-sm">{r.toClass ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showHistory ? (
        history.length === 0 ? <EmptyState title="No promotions yet" hint="Run a promotion above to record year-end movement." /> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Student</th><th>From</th><th>To</th><th>Status</th><th>Remark</th><th>Date</th></tr></thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td>
                      <p className="font-semibold text-slate-800">{h.student.fullName}</p>
                      <p className="font-mono text-xs text-slate-400">{h.student.admissionNo}</p>
                    </td>
                    <td className="text-sm">{h.fromClass.name}</td>
                    <td className="text-sm flex items-center gap-1">{h.toClass?.name ?? <span className="text-emerald-600">Graduated</span>}<ArrowRight className="h-3 w-3 text-slate-300" /></td>
                    <td><Badge tone={h.status === "PROMOTED" ? "green" : h.status === "CONDITIONAL" ? "amber" : "red"}>{h.status}</Badge></td>
                    <td className="text-xs text-slate-500">{h.remark}</td>
                    <td className="text-xs">{fmtDateTime(h.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}
    </div>
  );
}

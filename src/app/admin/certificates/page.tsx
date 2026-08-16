"use client";

import { useCallback, useEffect, useState } from "react";
import { Award, Printer } from "lucide-react";
import { api } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/admin/page-header";
import { useToast } from "@/components/ui/toast";
import { CertificateView, type CertificateData } from "@/components/reports/certificate-view";

type Meta = {
  classes: { id: string; name: string }[];
  terms: { id: string; name: string; academicYear: { name: string } }[];
};
type ReportRow = {
  id: string; position: number | null; onRoll: number | null; promotionStatus: string | null; totalPercentage: number | null;
  student: { id: string; fullName: string; admissionNo: string; gender: string };
};

export default function CertificatesPage() {
  const toast = useToast();
  const [meta, setMeta] = useState<Meta>({ classes: [], terms: [] });
  const [classId, setClassId] = useState("");
  const [termId, setTermId] = useState("");
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [type, setType] = useState<"PROGRESS" | "COMPLETION">("PROGRESS");
  const [school, setSchool] = useState({ name: "", motto: null as string | null, yearName: "" });
  const [cert, setCert] = useState<CertificateData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api<Meta>("/api/meta").then(setMeta).catch(() => {}); }, []);

  const load = useCallback(async () => {
    if (!classId || !termId) return;
    setLoading(true);
    try {
      const data = await api<{ reportCards: ReportRow[] }>(`/api/reports?classId=${classId}&termId=${termId}`);
      const s = await api<{ name: string; motto: string | null }>("/api/school");
      const term = meta.terms.find((t) => t.id === termId);
      setReports(data.reportCards);
      setSchool({ name: s.name, motto: s.motto, yearName: term?.academicYear.name ?? "" });
    } catch (e) {
      toast.toast({ title: "Failed to load", description: (e as Error).message, variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [classId, termId, meta.terms, toast]);

  useEffect(() => { load(); }, [load]);

  function openCert(r: ReportRow) {
    const term = meta.terms.find((t) => t.id === termId);
    const cls = meta.classes.find((c) => c.id === classId);
    setCert({
      studentName: r.student.fullName,
      admissionNo: r.student.admissionNo,
      gender: r.student.gender,
      className: cls?.name ?? "",
      yearName: school.yearName,
      termName: term?.name ?? "",
      position: r.position,
      onRoll: r.onRoll,
      promotionStatus: r.promotionStatus,
      totalPercent: r.totalPercentage,
      schoolName: school.name,
      motto: school.motto,
    });
  }

  return (
    <div>
      <PageHeader
        title="Certificates"
        subtitle="Generate and print beautiful A4 certificates from report-card results."
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
        <Field label="Certificate type">
          <Select value={type} onChange={(e) => setType(e.target.value as "PROGRESS" | "COMPLETION")}>
            <option value="PROGRESS">Achievement (per term)</option>
            <option value="COMPLETION">Completion</option>
          </Select>
        </Field>
      </div>

      {loading ? <div className="card p-8"><div className="skeleton h-4 w-full" /></div> :
      !classId || !termId ? <EmptyState title="Select a class and term" hint="Certificates are generated from generated report cards." /> :
      reports.length === 0 ? <EmptyState title="No report cards for this class/term" hint="Generate report cards first in Report Cards." /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((r) => (
            <button key={r.id} onClick={() => openCert(r)} className="card group p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lg">
              <Award className="h-8 w-8 text-amber-500" />
              <p className="mt-3 font-semibold text-slate-800 group-hover:text-primary">{r.student.fullName}</p>
              <p className="font-mono text-xs text-slate-400">{r.student.admissionNo}</p>
              <p className="mt-2 text-xs text-slate-500">
                Position {r.position ?? "—"} of {r.onRoll ?? "—"} · {r.totalPercentage?.toFixed(1) ?? "—"}%
              </p>
            </button>
          ))}
        </div>
      )}

      <Modal open={!!cert} onClose={() => setCert(null)} title="Certificate Preview" wide>
        {cert && (
          <div>
            <div className="mb-4 flex justify-end no-print">
              <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print / Save PDF</Button>
            </div>
            <CertificateView data={cert} type={type} />
          </div>
        )}
      </Modal>
    </div>
  );
}

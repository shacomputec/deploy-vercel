"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Inbox, Printer, Trash2 } from "lucide-react";
import { api } from "@/lib/client";
import { fmtDate, fmtDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/admin/page-header";
import { useToast } from "@/components/ui/toast";

type Doc = { id: string; category: string; fileName: string; size: number };

type App = {
  id: string; referenceNo: string; fullName: string; gender: string | null;
  dateOfBirth: string | null; nhisNumber: string | null; weighingCardNumber: string | null;
  previousSchool: string | null; previousSchoolClass: string | null; parentName: string;
  parentPhone: string; parentEmail: string | null; parentOccupation: string | null;
  address: string | null; digitalAddress: string | null;
  message: string | null; status: string; submittedAt: string;
  level: { name: string }; class: { name: string } | null;
  student: { id: string; admissionNo: string; fullName: string } | null;
  documents: Doc[];
};

type ApproveResult = {
  app?: App;
  student?: { id: string; admissionNo: string; fullName: string };
  created?: boolean;
};

const DOC_LABELS: Record<string, string> = {
  BIRTH_CERTIFICATE: "Birth Certificate", PASSPORT_PHOTO: "Passport Picture",
  WEIGHING_CARD: "Weighing Card", PREVIOUS_REPORT: "Previous Report",
};

const STATUS_TONE: Record<string, "amber" | "green" | "red"> = { PENDING: "amber", APPROVED: "green", REJECTED: "red" };

export default function AdmissionsAdminPage() {
  const toast = useToast();
  const [apps, setApps] = useState<App[]>([]);
  const [view, setView] = useState<App | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api<App[]>("/api/admissions");
      setApps(data);
    } catch (e) {
      toast.toast({ title: "Failed to load", description: (e as Error).message, variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function setStatus(a: App, status: string) {
    try {
      const res = await api<ApproveResult>(`/api/admissions/${a.id}`, { method: "PUT", body: JSON.stringify({ status }) });
      if (status === "APPROVED" && res.created) {
        toast.toast({
          title: "Application approved — student enrolled",
          description: `${res.student?.fullName} registered as ${res.student?.admissionNo}`,
          variant: "success",
        });
        // Keep the modal open so the office sees the enrolled banner below.
        if (res.app) setView(res.app);
      } else {
        toast.toast({ title: `Application ${status.toLowerCase()}`, variant: "success" });
        setView(null);
      }
      load();
    } catch (e) {
      toast.toast({ title: "Action failed", description: (e as Error).message, variant: "error" });
    }
  }

  async function downloadDoc(doc: Doc, app: App) {
    try {
      const res = await fetch(`/api/admissions/${app.id}/documents?docId=${doc.id}`);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = doc.fileName;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      toast.toast({ title: "Download failed", description: (err as Error).message, variant: "error" });
    }
  }

  async function remove(a: App) {
    if (!confirm(`Delete application ${a.referenceNo}?`)) return;
    try {
      await api(`/api/admissions/${a.id}`, { method: "DELETE" });
      load();
    } catch (e) {
      toast.toast({ title: "Delete failed", description: (e as Error).message, variant: "error" });
    }
  }

  const pending = apps.filter((a) => a.status === "PENDING").length;

  return (
    <div>
      <PageHeader title="Admission Applications" subtitle={`${pending} pending · ${apps.length} total`} />

      {loading ? <div className="card p-8"><div className="skeleton h-4 w-full" /></div> :
      apps.length === 0 ? <EmptyState title="No applications yet" hint="Applications submitted through the public website appear here." /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Reference</th><th>Child</th><th>Level</th><th>Parent / Contact</th><th>Date</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {apps.map((a) => (
                <tr key={a.id}>
                  <td className="font-mono text-xs">{a.referenceNo}</td>
                  <td>
                    <p className="font-semibold text-slate-800">{a.fullName}</p>
                    <p className="text-xs text-slate-400">{a.gender === "FEMALE" ? "Female" : "Male"}{a.dateOfBirth ? ` · ${fmtDate(a.dateOfBirth)}` : ""}</p>
                  </td>
                  <td>
                    <p className="font-semibold text-slate-800">{a.class?.name ?? a.level.name}</p>
                    <p className="text-xs text-slate-400">{a.class ? a.level.name : "Level"}</p>
                  </td>
                  <td>
                    <p className="text-sm text-slate-700">{a.parentName}</p>
                    <p className="text-xs text-slate-400">{a.parentPhone}{a.parentEmail ? ` · ${a.parentEmail}` : ""}</p>
                  </td>
                  <td className="text-xs">{fmtDateTime(a.submittedAt)}</td>
                  <td><Badge tone={STATUS_TONE[a.status]}>{a.status}</Badge></td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setView(a)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200">View</button>
                      <button onClick={() => remove(a)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!view} onClose={() => setView(null)} title={`Application ${view?.referenceNo}`} wide>
        {view && (
          <div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Child", view.fullName],
                ["Class applying for", view.class ? `${view.class.name} (${view.level.name})` : view.level.name],
                ["Gender", view.gender ?? "—"],
                ["Date of birth", fmtDate(view.dateOfBirth)], ["NHIS number", view.nhisNumber ?? "—"],
                ["Weighing card no.", view.weighingCardNumber ?? "—"],
                ["Previous school", view.previousSchool ?? "—"], ["Previous class", view.previousSchoolClass ?? "—"],
                ["Parent/guardian", view.parentName], ["Parent phone", view.parentPhone],
                ["Parent email", view.parentEmail ?? "—"], ["Parent occupation", view.parentOccupation ?? "—"],
                ["Residential address", view.address ?? "—"], ["Digital address", view.digitalAddress ?? "—"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-slate-50 px-4 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{k}</p>
                  <p className="mt-0.5 text-sm font-medium text-slate-700">{v}</p>
                </div>
              ))}
              <div className="sm:col-span-2 mt-1 rounded-xl border border-slate-200 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Uploaded documents</p>
                {view.documents.length === 0 ? (
                  <p className="mt-1 text-sm text-slate-400">No documents uploaded.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {view.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-700">{DOC_LABELS[doc.category] ?? doc.category}</p>
                          <p className="truncate text-xs text-slate-400">{doc.fileName} · {(doc.size / 1024).toFixed(0)} KB</p>
                        </div>
                        <button onClick={() => downloadDoc(doc, view)} className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600" title="Download"><Download className="h-4 w-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {view.student && (
              <div className="mt-3 rounded-lg bg-emerald-50 p-4 ring-1 ring-emerald-200">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  ✓ Student enrolled from this application
                </p>
                <p className="mt-1 text-sm text-emerald-800">
                  {view.student.fullName} · <span className="font-mono">{view.student.admissionNo}</span>
                  {" "}— already placed in {view.class ? view.class.name : "the level applied for"}.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={`/admissions/offer/${view.id}`}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    <Printer className="h-3.5 w-3.5" /> Offer Letter (A4 PDF)
                  </a>
                  <a href="/admin/students" className="inline-flex items-center rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
                    Open the Students list →
                  </a>
                </div>
              </div>
            )}
            {view.message && (
              <div className="mt-3 rounded-lg bg-amber-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Message</p>
                <p className="mt-1 text-sm text-amber-800">{view.message}</p>
              </div>
            )}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => window.open(`/admissions/print/${view.id}`, "_blank", "noopener")}><Printer className="h-4 w-4" /> Print / Save PDF (A4)</Button>
              {view.student ? (
                <Button disabled>Approved — student enrolled ✓</Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setStatus(view, "REJECTED")}>Reject</Button>
                  <Button onClick={() => setStatus(view, "APPROVED")}>Approve & Enroll Student</Button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

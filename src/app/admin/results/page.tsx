"use client";

import { useEffect, useState } from "react";
import { KeyRound, Eye, Smartphone } from "lucide-react";
import { api } from "@/lib/client";
import { fmtDateTime, maskPhone } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/admin/page-header";

type OtpLog = {
  id: string; phone: string; attempts: number; verified: boolean; expiresAt: string; createdAt: string;
  student: { fullName: string; admissionNo: string };
};
type AccessLog = {
  id: string; ip: string; userAgent: string | null; accessedAt: string;
  student: { fullName: string; admissionNo: string };
  reportCard: { totalPercentage: number | null } | null;
};

export default function ResultsAdminPage() {
  const [tab, setTab] = useState<"otp" | "access">("otp");
  const [otpLogs, setOtpLogs] = useState<OtpLog[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);

  useEffect(() => {
    api<OtpLog[]>("/api/results/logs?type=otp").then(setOtpLogs).catch(() => {});
    api<AccessLog[]>("/api/results/logs?type=access").then(setAccessLogs).catch(() => {});
  }, []);

  return (
    <div>
      <PageHeader
        title="Result Checker"
        subtitle="OTP security logs and result access analytics. Publish/unpublish report cards from the Report Cards page."
      />

      <div className="mb-5 flex gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
        {([["otp", "OTP Requests"], ["access", "Access Logs"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === key ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "otp" ? (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Student</th><th>Phone (masked)</th><th>Attempts</th><th>Status</th><th>Expires</th><th>Requested</th></tr></thead>
            <tbody>
              {otpLogs.map((l) => (
                <tr key={l.id}>
                  <td><div><p className="font-medium text-slate-800">{l.student.fullName}</p><p className="text-xs text-slate-400">{l.student.admissionNo}</p></div></td>
                  <td className="text-xs font-mono">{maskPhone(l.phone)}</td>
                  <td><Badge tone={l.attempts >= 5 ? "red" : l.attempts >= 3 ? "amber" : "slate"}>{l.attempts}/5</Badge></td>
                  <td>{l.verified ? <Badge tone="green">Verified</Badge> : <Badge tone="amber">Pending</Badge>}</td>
                  <td className="text-xs">{fmtDateTime(l.expiresAt)}</td>
                  <td className="text-xs">{fmtDateTime(l.createdAt)}</td>
                </tr>
              ))}
              {otpLogs.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-slate-400">No OTP requests yet</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Student</th><th>IP Address</th><th>User Agent</th><th>Report</th><th>Accessed</th></tr></thead>
            <tbody>
              {accessLogs.map((l) => (
                <tr key={l.id}>
                  <td><div><p className="font-medium text-slate-800">{l.student.fullName}</p><p className="text-xs text-slate-400">{l.student.admissionNo}</p></div></td>
                  <td className="font-mono text-xs">{l.ip}</td>
                  <td className="max-w-48 truncate text-xs" title={l.userAgent ?? ""}>{l.userAgent ?? "—"}</td>
                  <td>{l.reportCard ? <Badge tone="green">{l.reportCard.totalPercentage?.toFixed(1)}%</Badge> : <span className="text-xs text-slate-300">no download</span>}</td>
                  <td className="text-xs">{fmtDateTime(l.accessedAt)}</td>
                </tr>
              ))}
              {accessLogs.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-slate-400">No result access yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <KeyRound className="h-5 w-5 text-primary" />
          <p className="mt-2 text-sm font-semibold text-slate-800">OTP by SMS</p>
          <p className="mt-1 text-xs text-slate-400">6-digit codes, valid 5 minutes, HMAC-hashed at rest.</p>
        </div>
        <div className="card p-5">
          <Smartphone className="h-5 w-5 text-primary" />
          <p className="mt-2 text-sm font-semibold text-slate-800">Phone must match</p>
          <p className="mt-1 text-xs text-slate-400">Results are only sent to the phone registered for the student.</p>
        </div>
        <div className="card p-5">
          <Eye className="h-5 w-5 text-primary" />
          <p className="mt-2 text-sm font-semibold text-slate-800">Fully audited</p>
          <p className="mt-1 text-xs text-slate-400">Every request, attempt and access is logged with IP + user agent.</p>
        </div>
      </div>
    </div>
  );
}

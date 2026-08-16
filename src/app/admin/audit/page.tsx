"use client";

import { useEffect, useState } from "react";
import { ScrollText, ShieldCheck } from "lucide-react";
import { api } from "@/lib/client";
import { fmtDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/admin/page-header";

type Log = {
  id: string; action: string; entity: string; entityId: string | null; meta: string | null;
  ip: string | null; createdAt: string;
  user: { email: string; fullName: string } | null;
};

const ACTION_TONE: Record<string, "green" | "amber" | "red" | "blue" | "slate"> = {
  CREATE: "green", LOGIN: "blue", GENERATE: "blue", PUBLISH: "green", PUBLISH_ALL: "green",
  UPDATE: "amber", UPLOAD: "blue", LINK: "blue",
  DELETE: "red", UNPUBLISH: "slate", UNPUBLISH_ALL: "slate",
};

const LICENSE_ACTIONS = ["ISSUE_KEY", "ACTIVATE", "SEND_KEY", "REVOKE_KEY", "ROTATE_SECRET", "CREATE", "UPDATE", "DELETE"];

function actionOptions(security: boolean) {
  return security ? LICENSE_ACTIONS : ["CREATE", "UPDATE", "DELETE", "LOGIN", "PUBLISH", "PUBLISH_ALL", "UNPUBLISH", "GENERATE", "UPLOAD"];
}

export default function AuditPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [filter, setFilter] = useState("");
  const [security, setSecurity] = useState(false);
  const [isDev, setIsDev] = useState(false);

  useEffect(() => {
    api<{ role?: string }>("/api/auth/me").then((m) => setIsDev(m?.role === "developer")).catch(() => {});
  }, []);

  useEffect(() => {
    const q = security ? `?scope=security${filter ? `&action=${filter}` : ""}` : filter ? `?action=${filter}` : "";
    api<Log[]>(`/api/audit${q}`).then(setLogs).catch(() => {});
  }, [filter, security]);

  return (
    <div>
      <PageHeader
        title={security ? "Security & Licensing Trail" : "Audit Logs"}
        subtitle={security
          ? "Developer-only: license key lifecycle and role changes (issued keys, activations, sends, revokes, secret rotations)"
          : "Every create, update, delete, publish and login — tamper-evident trail"}
        action={
          <div className="flex items-center gap-2">
            {isDev && (
              <button
                type="button"
                onClick={() => { setSecurity((v) => !v); setFilter(""); }}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${security ? "border-violet-300 bg-violet-50 text-violet-700" : "border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-700"}`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Security & licensing
              </button>
            )}
            <select className="select w-48" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="">All actions</option>
              {actionOptions(security).map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        }
      />

      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Action</th><th>Module</th><th>User</th><th>Details</th><th>IP</th><th>When</th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td><Badge tone={ACTION_TONE[l.action] ?? "slate"}>{l.action}</Badge></td>
                <td className="font-medium text-slate-700">{l.entity}</td>
                <td className="text-xs">{l.user?.fullName ?? "system"}<span className="block text-slate-400">{l.user?.email}</span></td>
                <td className="max-w-64 truncate text-xs" title={l.meta ?? ""}>{l.meta ?? "—"}</td>
                <td className="font-mono text-xs">{l.ip ?? "—"}</td>
                <td className="whitespace-nowrap text-xs">{fmtDateTime(l.createdAt)}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={6} className="py-10 text-center text-slate-400"><ScrollText className="mx-auto mb-2 h-8 w-8 text-slate-300" />No audit entries yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

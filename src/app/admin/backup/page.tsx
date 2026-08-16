"use client";

import { useCallback, useEffect, useState } from "react";
import { Database, DatabaseBackup, Download, RotateCcw, Upload } from "lucide-react";
import { api } from "@/lib/client";
import { fmtDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/admin/page-header";
import { useToast } from "@/components/ui/toast";

type BackupFile = { name: string; size: number; mtime: string };

export default function BackupPage() {
  const toast = useToast();
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [restoring, setRestoring] = useState(false);

  const load = useCallback(async () => {
    try {
      setBackups(await api<BackupFile[]>("/api/backup", { method: "PUT" }));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function download() {
    try {
      const res = await fetch("/api/backup");
      if (!res.ok) throw new Error("Backup failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `ges-smis-backup-${new Date().toISOString().slice(0, 10)}.db`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.toast({ title: "Backup downloaded", variant: "success" });
    } catch (e) {
      toast.toast({ title: "Backup failed", description: (e as Error).message, variant: "error" });
    }
  }

  async function restore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm("Restore this backup? The current database will be copied to prisma/backups and REPLACED. A server restart is recommended afterwards.")) {
      e.target.value = "";
      return;
    }
    setRestoring(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/backup", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Restore failed");
      toast.toast({ title: "Backup restored", description: data.data?.note, variant: "success" });
      load();
    } catch (err) {
      toast.toast({ title: "Restore failed", description: (err as Error).message, variant: "error" });
    } finally {
      setRestoring(false);
      e.target.value = "";
    }
  }

  return (
    <div>
      <PageHeader title="Backup & Restore" subtitle="Download the full database, or restore from a previous backup." />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="card p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-ink"><DatabaseBackup className="h-5 w-5 text-primary" /> Download backup</h3>
          <p className="mt-2 text-sm text-slate-500">
            Exports the entire SQLite database (school data, users, results, content). Store the file somewhere safe — Google Drive, a USB drive or a network share.
          </p>
          <Button className="mt-4" onClick={download}><Download className="h-4 w-4" /> Download database</Button>
        </div>

        <div className="card p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-ink"><RotateCcw className="h-5 w-5 text-primary" /> Restore from backup</h3>
          <p className="mt-2 text-sm text-slate-500">
            Upload a previously downloaded <span className="font-mono">.db</span> file. The current database is automatically preserved in <span className="font-mono">prisma/backups/</span> first.
          </p>
          <label className="btn btn-primary mt-4 inline-flex cursor-pointer items-center gap-2">
            <Upload className="h-4 w-4" /> {restoring ? "Restoring…" : "Choose backup file"}
            <input type="file" accept=".db,.sqlite,.sqlite3" className="hidden" onChange={restore} disabled={restoring} />
          </label>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500"><Database className="h-4 w-4" /> Stored backups</h3>
        {backups.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
            No automatic backups stored yet — copies are kept here before every restore.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>File</th><th>Size</th><th>Created</th></tr></thead>
              <tbody>
                {backups.map((b) => (
                  <tr key={b.name}>
                    <td className="font-mono text-sm text-slate-700">{b.name}</td>
                    <td>{(b.size / 1024).toFixed(1)} KB</td>
                    <td className="text-sm">{fmtDateTime(b.mtime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

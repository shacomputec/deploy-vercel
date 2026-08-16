"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, Users } from "lucide-react";
import { api } from "@/lib/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/admin/page-header";
import { useToast } from "@/components/ui/toast";

type RoleRow = {
  id: string; name: string; displayName: string; level: number; isSystem: boolean;
  _count: { users: number };
  permissions: { permission: { id: string; module: string; action: string } }[];
};
type Permission = { id: string; module: string; action: string; label: string | null };

export default function RolesPage() {
  const toast = useToast();
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [edit, setEdit] = useState<RoleRow | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ roles: RoleRow[]; permissions: Permission[] }>("/api/roles");
      setRoles(data.roles);
      setPermissions(data.permissions);
    } catch (e) {
      toast.toast({ title: "Failed to load", description: (e as Error).message, variant: "error" });
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const modules = [...new Set(permissions.map((p) => p.module))];

  function openEditor(role: RoleRow) {
    setEdit(role);
    setSelected(new Set(role.permissions.map((p) => `${p.permission.module}:${p.permission.action}`)));
  }

  async function savePermissions() {
    if (!edit) return;
    setSaving(true);
    try {
      await api(`/api/roles/${edit.id}`, {
        method: "PUT",
        body: JSON.stringify({ permissions: [...selected] }),
      });
      toast.toast({ title: "Permissions updated", description: `${selected.size} grants for ${edit.displayName}`, variant: "success" });
      setEdit(null); load();
    } catch (e) {
      toast.toast({ title: "Save failed", description: (e as Error).message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div>
      <PageHeader
        title="Roles & Permissions"
        subtitle="Granular, editable Role-Based Access Control — every module and action"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((r) => (
          <div key={r.id} className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-ink">{r.displayName}</h3>
                <p className="text-xs text-slate-400">Level {r.level} · {r.name}</p>
              </div>
              <div className="flex items-center gap-2">
                {r.isSystem && <Badge tone="violet">System</Badge>}
                <span className="flex items-center gap-1 text-xs text-slate-400"><Users className="h-3.5 w-3.5" /> {r._count.users}</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {r.permissions.length} permission grants
            </p>
            <div className="mt-4 flex justify-end">
              <Button variant="outline" size="sm" disabled={r.isSystem} onClick={() => openEditor(r)}>
                <ShieldCheck className="h-4 w-4" /> Edit Permissions
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={`Permissions — ${edit?.displayName}`} subtitle="System roles cannot be edited. Check/uncheck to grant or revoke access." wide>
        {edit && (
          <div className="max-h-[55vh] space-y-5 overflow-y-auto pr-1">
            {modules.map((m) => {
              const modulePerms = permissions.filter((p) => p.module === m);
              const allChecked = modulePerms.every((p) => selected.has(`${p.module}:${p.action}`));
              return (
                <div key={m}>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{m}</p>
                    <button
                      onClick={() =>
                        setSelected((prev) => {
                          const next = new Set(prev);
                          for (const p of modulePerms) {
                            const key = `${p.module}:${p.action}`;
                            if (allChecked) next.delete(key);
                            else next.add(key);
                          }
                          return next;
                        })
                      }
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      {allChecked ? "Clear all" : "Select all"}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {modulePerms.map((p) => {
                      const key = `${p.module}:${p.action}`;
                      const on = selected.has(key);
                      return (
                        <button
                          key={p.id}
                          onClick={() => toggle(key)}
                          className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                            on ? "border-primary bg-primary text-white" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                          }`}
                        >
                          {p.action}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button>
          <Button onClick={savePermissions} loading={saving}>Save Permissions</Button>
        </div>
      </Modal>
    </div>
  );
}

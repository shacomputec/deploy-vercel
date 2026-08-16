"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { api } from "@/lib/client";
import { fmtDate, fmtDateTime, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/admin/page-header";
import { useToast } from "@/components/ui/toast";
import type { CrudConfig } from "@/lib/crud-configs";

type Row = Record<string, unknown> & { id: string; createdAt?: string };

export function CrudPage({ cfg }: { cfg: CrudConfig }) {
  const toast = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [refData, setRefData] = useState<Record<string, { id: string; label: string }[]>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/${cfg.route}${q ? `?q=${encodeURIComponent(q)}` : ""}`;
      const data = await api<Row[]>(url);
      setRows(data);
    } catch (e) {
      toast.toast({ title: "Failed to load", description: (e as Error).message, variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [cfg.route, q, toast]);

  useEffect(() => { load(); }, [load]);

  // Load reference dropdown data (students, books, rooms, clubs…) once
  useEffect(() => {
    const refs = cfg.refs;
    if (!refs) return;
    (async () => {
      const out: Record<string, { id: string; label: string }[]> = {};
      for (const [field, ref] of Object.entries(refs)) {
        try {
          // Some endpoints return { data: [...] }, { students: [...] } or { rows: [...] } — normalize
          const raw = await api<Row[] | { data?: Row[]; students?: Row[]; rows?: Row[] }>(ref.api);
          const items = Array.isArray(raw) ? raw : raw.data ?? raw.students ?? raw.rows ?? [];
          out[field] = items.map((it) => ({ id: it.id, label: String(it[ref.labelField] ?? it.id) }));
        } catch { /* ignore */ }
      }
      setRefData(out);
    })();
  }, [cfg]);

  function openCreate() {
    setCreating(true);
    const f: Record<string, string> = {};
    for (const field of cfg.fields) {
      f[field.name] = field.type === "select" && field.options?.length ? field.options[0] : field.type === "date" ? new Date().toISOString().slice(0, 10) : "";
    }
    setForm(f);
  }

  function openEdit(r: Row) {
    setEditing(r);
    const f: Record<string, string> = {};
    for (const field of cfg.fields) {
      const v = r[field.name];
      if (field.type === "date") f[field.name] = v ? String(v).slice(0, 10) : "";
      else f[field.name] = v === null || v === undefined ? "" : String(v);
    }
    setForm(f);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api(`/api/${cfg.route}/${editing.id}`, { method: "PUT", body: JSON.stringify(form) });
        toast.toast({ title: `${cfg.singular} updated`, variant: "success" });
      } else {
        await api(`/api/${cfg.route}`, { method: "POST", body: JSON.stringify(form) });
        toast.toast({ title: `${cfg.singular} created`, variant: "success" });
      }
      setCreating(false); setEditing(null);
      load();
    } catch (e) {
      toast.toast({ title: "Save failed", description: (e as Error).message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function remove(r: Row) {
    if (!confirm(`Delete this ${cfg.singular.toLowerCase()}? This cannot be undone.`)) return;
    try {
      await api(`/api/${cfg.route}/${r.id}`, { method: "DELETE" });
      toast.toast({ title: `${cfg.singular} deleted`, variant: "success" });
      load();
    } catch (e) {
      toast.toast({ title: "Delete failed", description: (e as Error).message, variant: "error" });
    }
  }

  const lookup = useCallback(
    (field: string, id: unknown) => {
      const list = refData[field];
      if (!list) return String(id ?? "");
      return list.find((x) => x.id === id)?.label ?? String(id ?? "");
    },
    [refData]
  );

  function renderValue(field: string, v: unknown) {
    if (v === null || v === undefined || v === "") return <span className="text-slate-300">—</span>;
    const def = cfg.fields.find((f) => f.name === field);
    if (cfg.refs?.[field]) return lookup(field, v);
    if (def?.type === "date") return fmtDate(String(v));
    if (def?.type === "boolean") return v ? <Badge tone="green">Yes</Badge> : <Badge tone="slate">No</Badge>;
    if (def?.type === "select") return <Badge tone="blue">{String(v).replace(/_/g, " ")}</Badge>;
    return String(v);
  }

  const summaryStats = useMemo(() => {
    const stats: { label: string; count: number }[] = [];
    for (const f of cfg.fields) {
      if (f.type !== "select" || !f.options?.length) continue;
      stats.push({ label: f.label, count: rows.filter((r) => r[f.name] === f.options![0]).length });
    }
    return stats;
  }, [cfg.fields, rows]);

  return (
    <div>
      <PageHeader
        title={cfg.label}
        subtitle={`Manage ${cfg.label.toLowerCase()} — everything is configurable without code.`}
        action={<Button onClick={openCreate}><Plus className="h-4 w-4" /> New {cfg.singular}</Button>}
      />

      {summaryStats.length > 0 && (
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          {summaryStats.map((s) => (
            <div key={s.label} className="card flex items-center justify-between p-4">
              <p className="text-sm font-medium text-slate-500">{s.label} (active)</p>
              <p className="text-xl font-bold text-primary">{s.count}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mb-4 flex max-w-md items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder={`Search ${cfg.label.toLowerCase()}…`}
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
      </div>

      {loading ? <div className="card p-8"><div className="skeleton h-4 w-full" /></div> :
      rows.length === 0 ? <EmptyState title={`No ${cfg.label.toLowerCase()} yet`} action={<Button onClick={openCreate}>Add one</Button>} /> : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                {cfg.tableFields.map((f) => <th key={f}>{cfg.fields.find((x) => x.name === f)?.label ?? f}</th>)}
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  {cfg.tableFields.map((f) => (
                    <td key={f} className={cn(f === cfg.tableFields[0] && "font-semibold text-slate-800")}>{renderValue(f, r[f])}</td>
                  ))}
                  <td>
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(r)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Edit"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => remove(r)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Delete"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={creating || !!editing} onClose={() => { setCreating(false); setEditing(null); }} title={editing ? `Edit ${cfg.singular}` : `New ${cfg.singular}`} wide>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          {cfg.fields.map((f) => (
            <div key={f.name} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
              {f.type === "textarea" ? (
                <Field label={f.label}><Textarea rows={3} value={form[f.name] ?? ""} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} /></Field>
              ) : f.type === "select" && cfg.refs?.[f.name] ? (
                <Field label={f.label}>
                  <Select value={form[f.name] ?? ""} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}>
                    <option value="">Select…</option>
                    {(refData[f.name] ?? []).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </Select>
                </Field>
              ) : f.type === "select" ? (
                <Field label={f.label}>
                  <Select value={form[f.name] ?? ""} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}>
                    {f.options?.map((o) => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}
                  </Select>
                </Field>
              ) : f.type === "number" ? (
                <Field label={f.label}><Input type="number" value={form[f.name] ?? ""} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} /></Field>
              ) : f.type === "date" ? (
                <Field label={f.label}><Input type="date" value={form[f.name] ?? ""} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} /></Field>
              ) : (
                <Field label={f.label}><Input required={f.required} value={form[f.name] ?? ""} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} /></Field>
              )}
            </div>
          ))}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => { setCreating(false); setEditing(null); }}>Cancel</Button>
            <Button type="submit" loading={saving}>{editing ? "Save Changes" : `Create ${cfg.singular}`}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

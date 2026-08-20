"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Pencil, Plus, RefreshCcw, ShieldAlert, ShieldCheck, Trash2, UserCog } from "lucide-react";
import { api } from "@/lib/client";
import { fmtDateTime } from "@/lib/utils";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Avatar } from "@/components/ui/avatar";
import { PageHeader } from "@/components/admin/page-header";
import { PhoneField } from "@/components/admin/validated-field";
import { useToast } from "@/components/ui/toast";

type UserRow = {
  id: string; email: string; username: string | null; fullName: string; phone: string | null; status: string; lastLoginAt: string | null; createdAt: string;
  twoFactorSecret: string | null;
  role: { id: string; name: string; displayName: string; level: number };
};
type RoleRow = { id: string; name: string; displayName: string; level: number };

export default function UsersPage() {
  const toast = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [me, setMe] = useState<{ roleName: string; roleLevel: number; perms: Record<string, string[]> } | null>(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", username: "", password: "", roleId: "", phone: "" });
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tfaUser, setTfaUser] = useState<UserRow | null>(null);
  const [tfa, setTfa] = useState<{ enabled: boolean; secret?: string; qrDataUrl?: string; account?: string } | null>(null);
  const [tfaCode, setTfaCode] = useState("");
  const [tfaBusy, setTfaBusy] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({ fullName: "", email: "", username: "", phone: "", status: "ACTIVE", roleId: "", password: "", generate: false });
  const [resetting, setResetting] = useState<UserRow | null>(null);
  const [resetForm, setResetForm] = useState({ password: "", generate: true });
  const [resetResult, setResetResult] = useState<string | null>(null);
  const [resetBusy, setResetBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [u, r, m] = await Promise.all([
        api<UserRow[]>("/api/users"),
        api<{ roles: RoleRow[] }>("/api/roles"),
        api<{ roleName: string; roleLevel: number; perms: Record<string, string[]> }>("/api/auth/me"),
      ]);
      setUsers(u); setRoles(r.roles); setMe(m);
    } catch (e) {
      toast.toast({ title: "Failed to load", description: (e as Error).message, variant: "error" });
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setTempPassword(null);
    try {
      const data = await api<{ temporaryPassword?: string }>("/api/users", {
        method: "POST",
        body: JSON.stringify({ ...form, password: form.password || undefined }),
      });
      toast.toast({ title: "User created", variant: "success" });
      if (data.temporaryPassword) setTempPassword(data.temporaryPassword);
      setModal(false); setForm({ fullName: "", email: "", username: "", password: "", roleId: "", phone: "" });
      load();
    } catch (e) {
      toast.toast({ title: "Create failed", description: (e as Error).message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function remove(u: UserRow) {
    if (!confirm(`Delete user ${u.email}?`)) return;
    try {
      await api(`/api/users/${u.id}`, { method: "DELETE" });
      toast.toast({ title: "User deleted", variant: "success" });
      load();
    } catch (e) {
      toast.toast({ title: "Delete failed", description: (e as Error).message, variant: "error" });
    }
  }

  async function openTfa(u: UserRow) {
    setTfaUser(u);
    setTfaCode("");
    setTfa(null);
    try {
      const data = await api<{ enabled: boolean; secret?: string; qrDataUrl?: string; account?: string }>(`/api/users/${u.id}/2fa`);
      setTfa(data);
    } catch (e) {
      toast.toast({ title: "Failed to load 2FA", description: (e as Error).message, variant: "error" });
      setTfaUser(null);
    }
  }

  async function enableTfa() {
    if (!tfaUser || !tfa?.secret) return;
    setTfaBusy(true);
    try {
      await api(`/api/users/${tfaUser.id}/2fa`, {
        method: "POST",
        body: JSON.stringify({ action: "enable", secret: tfa.secret, code: tfaCode.trim() }),
      });
      toast.toast({ title: "Two-factor authentication enabled", description: `${tfaUser.email} must enter a code from their authenticator app at login.`, variant: "success" });
      setTfaUser(null);
      load();
    } catch (e) {
      toast.toast({ title: "Enable failed", description: (e as Error).message, variant: "error" });
    } finally {
      setTfaBusy(false);
    }
  }

  async function disableTfa() {
    if (!tfaUser) return;
    if (!confirm(`Disable two-factor authentication for ${tfaUser.email}?`)) return;
    setTfaBusy(true);
    try {
      await api(`/api/users/${tfaUser.id}/2fa`, { method: "POST", body: JSON.stringify({ action: "disable" }) });
      toast.toast({ title: "Two-factor authentication disabled", variant: "success" });
      setTfaUser(null);
      load();
    } catch (e) {
      toast.toast({ title: "Disable failed", description: (e as Error).message, variant: "error" });
    } finally {
      setTfaBusy(false);
    }
  }

  function openEdit(u: UserRow) {
    setEditing(u);
    setEditForm({ fullName: u.fullName, email: u.email, username: u.username ?? "", phone: u.phone ?? "", status: u.status, roleId: u.role.id, password: "", generate: false });
  }

  function openReset(u: UserRow) {
    setResetting(u);
    setResetForm({ password: "", generate: true });
    setResetResult(null);
  }

  async function doReset(e: React.FormEvent) {
    e.preventDefault();
    if (!resetting) return;
    setResetBusy(true);
    setResetResult(null);
    try {
      const data = await api<{ generatedPassword?: string }>(`/api/users/${resetting.id}`, {
        method: "PUT",
        body: JSON.stringify(resetForm.generate ? { generate: true } : { password: resetForm.password }),
      });
      const pw = data.generatedPassword ?? resetForm.password;
      setResetResult(pw);
      toast.toast({ title: "Password reset", description: `${resetting.email} must use the new password next time.`, variant: "success" });
    } catch (e) {
      toast.toast({ title: "Reset failed", description: (e as Error).message, variant: "error" });
    } finally {
      setResetBusy(false);
    }
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setTempPassword(null);
    try {
      const data = await api<{ generatedPassword?: string }>(`/api/users/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify({
          fullName: editForm.fullName,
          email: editForm.email,
          username: editForm.username || null,
          phone: editForm.phone,
          status: editForm.status,
          roleId: editForm.roleId,
          ...(editForm.generate ? { generate: true } : editForm.password ? { password: editForm.password } : {}),
        }),
      });
      if (data.generatedPassword) setTempPassword(data.generatedPassword);
      toast.toast({ title: "User updated", variant: "success" });
      setEditing(null);
      load();
    } catch (e) {
      toast.toast({ title: "Update failed", description: (e as Error).message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  const isDev = me?.roleName === "developer";
  const canUpdateUsers = isDev || me?.perms?.["users"]?.includes("update") || me?.perms?.["users"]?.includes("manage");
  const canCreateUsers = isDev || me?.perms?.["users"]?.includes("create") || me?.perms?.["users"]?.includes("manage");

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle={isDev ? "Developer — full control. Only you can manage developer & super-admin accounts." : "Manage staff accounts"}
        action={canCreateUsers ? <Button onClick={() => setModal(true)}><Plus className="h-4 w-4" /> New User</Button> : undefined}
      />

      {!isDev && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800">
            The highest-authority system account cannot be modified or deleted by any other role. You can only manage accounts with the same or lower role level than yours.
          </p>
        </div>
      )}

      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>User</th><th>Role</th><th>2FA</th><th>Status</th><th>Last login</th><th>Created</th><th className="text-right">Actions</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <Avatar name={u.fullName} />
                    <div>
                      <p className="font-semibold text-slate-800">{u.fullName}</p>
                      <p className="text-xs text-slate-400">{u.username ? <span className="font-mono text-primary">@{u.username}</span> : u.email}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <Badge tone={u.role.name === "developer" ? "violet" : u.role.level >= 800 ? "blue" : "slate"}>
                    {u.role.displayName}
                  </Badge>
                </td>
                <td>
                  {u.twoFactorSecret ? <Badge tone="green"><ShieldCheck className="mr-1 h-3 w-3" /> On</Badge> : <Badge tone="slate">Off</Badge>}
                </td>
                <td><StatusBadge status={u.status} /></td>
                <td className="text-xs">{fmtDateTime(u.lastLoginAt)}</td>
                <td className="text-xs">{fmtDateTime(u.createdAt)}</td>                  <td>
                    <div className="flex justify-end">
                      {canUpdateUsers && <button onClick={() => openReset(u)} className="rounded-lg p-2 text-slate-400 hover:bg-amber-50 hover:text-amber-600" title="Reset password"><RefreshCcw className="h-4 w-4" /></button>}
                      {canUpdateUsers && <button onClick={() => openEdit(u)} className="rounded-lg p-2 text-slate-400 hover:bg-sky-50 hover:text-sky-600" title="Edit user"><Pencil className="h-4 w-4" /></button>}
                      <button onClick={() => openTfa(u)} className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600" title="Manage two-factor authentication"><KeyRound className="h-4 w-4" /></button>
                      {canUpdateUsers && u.role.name !== "developer" && (
                        <button onClick={() => remove(u)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Delete"><Trash2 className="h-4 w-4" /></button>
                      )}
                    </div>
                  </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Create User" subtitle="The user will sign in at /login with the email and password.">
        <form onSubmit={create} className="space-y-4">
          <Field label="Full name *"><Input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></Field>
          <Field label="Email *"><Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Username" hint="Optional — sign in with this instead of email (e.g. shacomputec).">
            <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="e.g. headteacher" className="font-mono" />
          </Field>
          <Field label="Role *">
            <Select required value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>
              <option value="">Select…</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id} disabled={!isDev && r.level >= (me?.roleLevel ?? 0)}>
                  {r.displayName}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Password" hint="Leave blank to generate a temporary password.">
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Optional — auto-generated" />
          </Field>
          <PhoneField value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}><UserCog className="h-4 w-4" /> Create User</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!resetting} onClose={() => setResetting(null)} title={`Reset Password — ${resetting?.email ?? ""}`} subtitle="Set a new password for this account. The user will sign in with it on web, desktop and mobile.">
        <form onSubmit={doReset} className="space-y-4">
          <div className="rounded-xl bg-slate-50 p-4">
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={resetForm.generate}
                onChange={(e) => { setResetForm({ ...resetForm, generate: e.target.checked, password: e.target.checked ? "" : resetForm.password }); setResetResult(null); }}
                className="mt-0.5 h-4 w-4 rounded accent-primary"
              />
              <span><strong>Generate a temporary password</strong> — shown once so you can share it securely.</span>
            </label>
            {!resetForm.generate && (
              <Field label="New password *">
                <Input type="password" required minLength={8} value={resetForm.password} onChange={(e) => { setResetForm({ ...resetForm, password: e.target.value }); setResetResult(null); }} placeholder="At least 8 characters" />
              </Field>
            )}
          </div>
          {resetResult && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <p className="font-semibold">New password — share this once:</p>
              <p className="mt-2 rounded-lg bg-slate-900 px-4 py-3 text-center font-mono text-xl font-bold tracking-widest text-emerald-300">{resetResult}</p>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setResetting(null)}>Cancel</Button>
            <Button type="submit" loading={resetBusy} disabled={!resetForm.generate && resetForm.password.length < 8}><RefreshCcw className="h-4 w-4" /> Reset Password</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit User — ${editing?.email ?? ""}`} subtitle="Manage this account's details, role, status or password.">
        <form onSubmit={saveEdit} className="space-y-4">
          <Field label="Full name *"><Input required value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} /></Field>
          <Field label="Email *"><Input required type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></Field>
          <Field label="Username" hint="Optional — sign in with this instead of email. Leave empty for email-only.">
            <Input value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} placeholder="e.g. headteacher" className="font-mono" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Role *">
              <Select required value={editForm.roleId} onChange={(e) => setEditForm({ ...editForm, roleId: e.target.value })}>
                {roles.map((r) => (
                  <option key={r.id} value={r.id} disabled={!isDev && r.level >= (me?.roleLevel ?? 0)}>{r.displayName}</option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="DISABLED">Disabled</option>
              </Select>
            </Field>
          </div>
          <PhoneField value={editForm.phone} onChange={(v) => setEditForm({ ...editForm, phone: v })} />
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <label className="flex items-start gap-2 text-sm text-amber-800">
              <input
                type="checkbox"
                checked={editForm.generate}
                onChange={(e) => setEditForm({ ...editForm, generate: e.target.checked, password: e.target.checked ? "" : editForm.password })}
                className="mt-0.5 h-4 w-4 rounded accent-amber-600"
              />
              <span><strong>Generate a temporary password</strong> — shown once so you can share it securely.</span>
            </label>
            {!editForm.generate && (
              <Field label="New password (optional)">
                <Input type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} placeholder="Leave blank to keep the current password" />
              </Field>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" loading={saving}><KeyRound className="h-4 w-4" /> Save Changes</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!tempPassword} onClose={() => setTempPassword(null)} title="Temporary Password">
        <p className="text-sm text-slate-600">Share this one-time password securely with the user. They should change it after first login.</p>
        <p className="mt-4 rounded-xl bg-slate-900 px-4 py-3 text-center font-mono text-xl font-bold tracking-widest text-emerald-300">{tempPassword}</p>
        <div className="mt-5 flex justify-end">
          <Button onClick={() => setTempPassword(null)}>Done</Button>
        </div>
      </Modal>

      <Modal open={!!tfaUser} onClose={() => setTfaUser(null)} title={`Two-Factor Authentication — ${tfaUser?.email}`} subtitle="TOTP codes from any authenticator app (Google Authenticator, Authy, 1Password…).">
        {tfa?.enabled ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <ShieldCheck className="h-8 w-8 text-emerald-600" />
              <p className="text-sm text-emerald-800"><strong>Enabled.</strong> This account requires a one-time code at every login.</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setTfaUser(null)}>Close</Button>
              <Button variant="danger" onClick={disableTfa} loading={tfaBusy}>Disable 2FA</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600">
              <li>Scan the QR code with your authenticator app.</li>
              <li>Enter the 6-digit code it shows to confirm.</li>
            </ol>
            {tfa?.qrDataUrl && (
              <div className="flex justify-center rounded-xl border border-slate-200 bg-white p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={tfa.qrDataUrl} alt="QR code" className="h-44 w-44" />
              </div>
            )}
            {tfa?.secret && (
              <p className="rounded-lg bg-slate-100 px-3 py-2 text-center font-mono text-sm tracking-widest text-slate-600">
                {tfa.secret}
              </p>
            )}
            <Field label="Authentication code *">
              <Input value={tfaCode} onChange={(e) => setTfaCode(e.target.value)} inputMode="numeric" placeholder="000000" maxLength={6} className="text-center font-mono text-lg tracking-[0.4em]" />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setTfaUser(null)}>Cancel</Button>
              <Button onClick={enableTfa} loading={tfaBusy} disabled={tfaCode.trim().length !== 6}><ShieldCheck className="h-4 w-4" /> Enable 2FA</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

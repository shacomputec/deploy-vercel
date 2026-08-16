"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { api } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

type PortalAccount = {
  linked: boolean;
  userId: string | null;
  email: string | null;
  roleName: string | null;
  status: string | null;
  lastLoginAt: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  kind: "teacher" | "parent" | "student";
  recordId: string;
  personName: string;
  recordEmail?: string | null;
  onChanged: () => void;
};

const KIND_LABEL = { teacher: "Teacher", parent: "Parent", student: "Student" } as const;

export function PortalAccountModal({ open, onClose, kind, recordId, personName, recordEmail, onChanged }: Props) {
  const toast = useToast();
  const [account, setAccount] = useState<PortalAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [generate, setGenerate] = useState(true);
  const [result, setResult] = useState<{ email: string; password?: string } | null>(null);

  const load = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    setResult(null);
    try {
      const acc = await api<PortalAccount>(`/api/${kind}s/${recordId}/account`);
      setAccount(acc);
      setEmail(acc.email ?? recordEmail ?? "");
      setPassword("");
      setGenerate(true);
    } catch (e) {
      toast.toast({ title: "Failed to load account", description: (e as Error).message, variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [open, kind, recordId, recordEmail, toast]);

  useEffect(() => { load(); }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const body = { email, ...(generate ? {} : { password }) };
      const data = await api<{ email: string; password?: string; action: string }>(`/api/${kind}s/${recordId}/account`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setResult(data);
      toast.toast({
        title: data.action === "created" ? "Login account assigned" : "Credentials reset",
        description: `${data.email} can now sign in to the ${KIND_LABEL[kind]} portal.`,
        variant: "success",
      });
      load();
      onChanged();
    } catch (err) {
      toast.toast({ title: "Save failed", description: (err as Error).message, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    if (!confirm(`Revoke login access for ${personName}? The account will be removed and they can no longer sign in.`)) return;
    setBusy(true);
    try {
      await api(`/api/${kind}s/${recordId}/account`, { method: "DELETE" });
      toast.toast({ title: "Login access revoked", variant: "success" });
      setAccount(null);
      onChanged();
    } catch (err) {
      toast.toast({ title: "Revoke failed", description: (err as Error).message, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Login Account — ${personName}`}
      subtitle="Assign or reset the portal sign-in for this record. Students, parents and teachers each have their own portal."
    >
      {loading ? (
        <p className="py-6 text-center text-sm text-slate-400">Loading…</p>
      ) : (
        <div className="space-y-4">
          {account?.linked ? (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <ShieldCheck className="h-6 w-6 shrink-0 text-emerald-600" />
              <div className="text-sm text-emerald-800">
                <p><strong>Portal access is on.</strong> Signs in as <span className="font-mono">{account.email}</span></p>
                <p className="mt-0.5 text-xs opacity-80">Role: {account.roleName} · Status: {account.status}{account.lastLoginAt ? ` · Last login: ${new Date(account.lastLoginAt).toLocaleString()}` : ""}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              No login account yet — this record can&apos;t sign in to the {KIND_LABEL[kind]} portal. Assign one below.
            </div>
          )}

          {result && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-800">Login credentials — share these once:</p>
              <div className="mt-3 space-y-2">
                <p className="rounded-lg bg-white px-3 py-2 text-sm text-slate-700"><span className="text-slate-400">Email</span> <span className="font-mono font-bold">{result.email}</span></p>
                {result.password && (
                  <p className="rounded-lg bg-slate-900 px-3 py-2 text-center font-mono text-lg font-bold tracking-widest text-emerald-300">{result.password}</p>
                )}
              </div>
              {!result.password && <p className="mt-2 text-xs text-emerald-700">Password kept as you set it.</p>}
            </div>
          )}

          <form onSubmit={save} className="space-y-4 border-t border-slate-100 pt-4">
            <Field label="Sign-in email *" hint={account?.linked ? "Changing this updates the login address." : `Defaults to the ${KIND_LABEL[kind]} record's email if set.`}>
              <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <div className="rounded-xl bg-slate-50 p-4">
              <label className="flex items-start gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={generate}
                  onChange={(e) => { setGenerate(e.target.checked); if (e.target.checked) setPassword(""); }}
                  className="mt-0.5 h-4 w-4 rounded accent-primary"
                />
                <span><strong>Generate a temporary password</strong> — shown once so you can hand it over securely.</span>
              </label>
              {!generate && (
                <Field label="Password *" hint="At least 8 characters">
                  <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                </Field>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                {account?.linked && (
                  <Button type="button" variant="ghost" className="text-rose-600 hover:bg-rose-50" onClick={revoke} loading={busy}>
                    <Trash2 className="h-4 w-4" /> Revoke access
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                <Button type="submit" loading={busy}>
                  <UserPlus className="h-4 w-4" /> {account?.linked ? "Reset Credentials" : "Assign Login"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}
    </Modal>
  );
}

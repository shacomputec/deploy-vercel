"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Ban, Clock, Copy, History, KeyRound, Lock, Mail, Phone, RefreshCw, Send, ShieldAlert, ShieldCheck, ShieldOff, Sparkles } from "lucide-react";
import { api } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import type { LicenseStatus } from "@/lib/license";

type Issuance = {
  id: string;
  schoolId: string;
  days: number;
  nonce: string;
  keyHash: string;
  sentTo: string | null;
  sentAt: string | null;
  revokedAt: string | null;
  issuedBy: string | null;
  createdAt: string;
};

type SendModal = { issuanceId?: string; key?: string; label: string } | null;
const CHANNELS = [["EMAIL", "Email", Mail], ["WHATSAPP", "WhatsApp", Phone], ["SMS", "SMS", Phone]] as const;

export function LicensingConsole() {
  const router = useRouter();
  const toast = useToast();
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [meRole, setMeRole] = useState<string | null>(null);
  const [issue, setIssue] = useState({ schoolId: "MAIN", days: "365", password: "" });
  const [issuedKey, setIssuedKey] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [issuances, setIssuances] = useState<Issuance[]>([]);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokeModal, setRevokeModal] = useState<{ id: string; label: string } | null>(null);
  const [revokePw, setRevokePw] = useState("");
  const [sendModal, setSendModal] = useState<SendModal>(null);
  const [sendForm, setSendForm] = useState({ email: "", phone: "", channels: { EMAIL: true, WHATSAPP: false, SMS: false } });
  const [sending, setSending] = useState(false);
  const [rotateOpen, setRotateOpen] = useState(false);
  const [rotatePw, setRotatePw] = useState("");
  const [rotating, setRotating] = useState(false);
  const [rotateResult, setRotateResult] = useState<{ newSecret: string; envBlock: string; instructions: string; verificationKey: string } | null>(null);
  const [devContact, setDevContact] = useState<{ developerName?: string | null; developerPhone?: string | null; developerEmail?: string | null } | null>(null);
  const [denied, setDenied] = useState(false);

  const load = useCallback(async () => {
    try {
      const [lic, school] = await Promise.all([
        api<LicenseStatus>("/api/license"),
        api<{ data?: { developerName?: string | null; developerPhone?: string | null; developerEmail?: string | null } }>("/api/school").catch(() => null),
      ]);
      setStatus(lic);
      setDevContact(school?.data ?? null);
      const me = await api<{ role?: string }>("/api/auth/me").catch(() => null);
      setMeRole(me?.role ?? null);
      if (me?.role !== "developer") {
        // The Licensing console is strictly developer-only — send everyone else
        // back to the dashboard (server-side APIs enforce this too).
        setDenied(true);
        router.replace("/admin");
        return;
      }
      api<Issuance[]>("/api/license/issuances").then(setIssuances).catch(() => {});
    } catch (e) {
      toast.toast({ title: "Failed to load license", description: (e as Error).message, variant: "error" });
    }
  }, [toast, router]);

  useEffect(() => { load(); }, [load]);

  async function issueKey(e: React.FormEvent) {
    e.preventDefault();
    setIssuing(true);
    try {
      const data = await api<{ key: string }>("/api/license/generate", {
        method: "POST",
        body: JSON.stringify({ schoolId: issue.schoolId, days: Number(issue.days), password: issue.password }),
      });
      setIssuedKey(data.key);
      setIssue((v) => ({ ...v, password: "" }));
      toast.toast({ title: "License key issued", variant: "success" });
      load();
    } catch (e) {
      toast.toast({ title: "Key issuance failed", description: (e as Error).message, variant: "error" });
    } finally {
      setIssuing(false);
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.toast({ title: "Copied to clipboard", variant: "success" });
    } catch {
      toast.toast({ title: "Copy failed", description: "Select the text manually to copy it.", variant: "error" });
    }
  }

  function openSend(iss?: Issuance) {
    setSendForm({ email: iss?.sentTo?.includes("@") ? iss.sentTo : "", phone: iss?.sentTo && !iss.sentTo.includes("@") ? iss.sentTo : "", channels: { EMAIL: true, WHATSAPP: false, SMS: false } });
    setSendModal(iss ? { issuanceId: iss.id, label: `${iss.schoolId} · ${iss.days} days` } : issuedKey ? { key: issuedKey, label: "just-issued key" } : null);
  }

  async function doSend() {
    if (!sendModal) return;
    const channels = (Object.entries(sendForm.channels) as [string, boolean][]).filter(([, on]) => on).map(([c]) => c);
    if (!channels.length) {
      toast.toast({ title: "Pick a channel", description: "Enable Email, WhatsApp or SMS.", variant: "info" });
      return;
    }
    setSending(true);
    try {
      const body: Record<string, unknown> = { channels, email: sendForm.email.trim(), phone: sendForm.phone.trim() };
      if (sendModal.issuanceId) body.issuanceId = sendModal.issuanceId;
      if (sendModal.key) body.key = sendModal.key;
      const data = await api<{ sent: boolean; channels: string[] }>("/api/license/send", { method: "POST", body: JSON.stringify(body) });
      toast.toast({ title: "License key sent", description: `Delivered via ${data.channels.join(" + ")}.`, variant: "success" });
      setSendModal(null);
      load();
    } catch (e) {
      toast.toast({ title: "Send failed", description: (e as Error).message, variant: "error" });
    } finally {
      setSending(false);
    }
  }

  async function confirmRevoke() {
    if (!revokeModal) return;
    setRevoking(revokeModal.id);
    try {
      const data = await api<{ localStatus: string }>("/api/license/revoke", {
        method: "POST",
        body: JSON.stringify({ issuanceId: revokeModal.id, password: revokePw }),
      });
      toast.toast({
        title: "Key revoked",
        description: data.localStatus === "SUSPENDED" ? "This installation was using that key and is now suspended." : "Revocation recorded.",
        variant: "success",
      });
      setRevokeModal(null);
      setRevokePw("");
      load();
    } catch (e) {
      toast.toast({ title: "Revoke failed", description: (e as Error).message, variant: "error" });
    } finally {
      setRevoking(null);
    }
  }

  async function doRotate(e: React.FormEvent) {
    e.preventDefault();
    setRotating(true);
    try {
      const data = await api<{ newSecret: string; envBlock: string; instructions: string; verificationKey: string }>("/api/license/rotate", {
        method: "POST",
        body: JSON.stringify({ password: rotatePw }),
      });
      setRotateResult(data);
      setRotatePw("");
      toast.toast({ title: "Rotation plan ready", description: "Apply the .env block and restart to complete the rotation.", variant: "success" });
    } catch (e) {
      toast.toast({ title: "Rotation failed", description: (e as Error).message, variant: "error" });
    } finally {
      setRotating(false);
    }
  }

  async function activate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/license", { method: "POST", body: JSON.stringify({ licenseKey: key }) });
      toast.toast({ title: "License activated", variant: "success" });
      setKey("");
      load();
    } catch (e) {
      toast.toast({ title: "Activation failed", description: (e as Error).message, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  // Auto-generate a fresh key for the school AND activate instantly in one
  // step — the developer activates on behalf of the buyer without waiting for
  // a payment webhook (e.g. a cash/direct-MoMo purchase). Developer-only.
  async function autoActivate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const generated = await api<{ key: string }>("/api/license/generate", {
        method: "POST",
        body: JSON.stringify({ schoolId: issue.schoolId, days: Number(issue.days), password: issue.password }),
      });
      await api("/api/license", { method: "POST", body: JSON.stringify({ licenseKey: generated.key }) });
      setIssuedKey(generated.key);
      setIssue((v) => ({ ...v, password: "" }));
      toast.toast({ title: "Key generated & activated", description: `School ${issue.schoolId} is now ACTIVE for ${issue.days} days.`, variant: "success" });
      load();
    } catch (e) {
      toast.toast({ title: "Auto-activation failed", description: (e as Error).message, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  const tone = status?.status === "ACTIVE" ? "border-emerald-200 bg-emerald-50" : status?.status === "TRIAL" ? "border-amber-200 bg-amber-50" : "border-rose-200 bg-rose-50";
  const Icon = status?.status === "ACTIVE" ? BadgeCheck : status?.status === "TRIAL" ? Clock : status?.status === "SUSPENDED" ? ShieldOff : ShieldAlert;
  const iconColor = status?.status === "ACTIVE" ? "text-emerald-600" : status?.status === "TRIAL" ? "text-amber-600" : "text-rose-600";

  if (!meRole && !denied) return null; // waiting for the role check
  if (denied) {
    return (
      <div className="card mx-auto mt-10 max-w-md p-8 text-center">
        <Lock className="mx-auto h-10 w-10 text-rose-500" />
        <h2 className="mt-3 text-lg font-bold text-slate-800">Developer only</h2>
        <p className="mt-1 text-sm text-slate-500">
          The Licensing console is reserved for the system developer (Shacomputec). Redirecting to the dashboard…
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight text-white">Licensing</h2>
        <p className="mt-1 text-sm text-slate-400">Developer console — issue, send, revoke and rotate activation license keys.</p>
      </div>

      <div className={`mb-6 flex items-start gap-4 rounded-2xl border p-6 ${tone}`}>
        <Icon className={`mt-0.5 h-8 w-8 shrink-0 ${iconColor}`} />
        <div>
          <p className="text-lg font-bold text-slate-800">{status?.status ?? "…"}</p>
          <p className="mt-1 text-sm text-slate-600">{status?.message}</p>
          {status?.trialDaysLeft !== null && status?.trialDaysLeft !== undefined && status.status === "TRIAL" && (
            <p className="mt-1 text-sm font-semibold text-amber-700">{status.trialDaysLeft} trial days remaining</p>
          )}
          {status?.rollbackSuspected && (
            <p className="mt-2 rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700">
              ⚠ Clock rollback was detected — the installation was suspended automatically.
            </p>
          )}
        </div>
      </div>

      {meRole === "developer" && (
        <div className="card mb-6 max-w-2xl border-primary/30 p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-ink"><ShieldCheck className="h-5 w-5 text-primary" /> Issue activation license key</h3>
          <p className="mt-1 text-sm text-slate-500">
            <strong>Developer-only.</strong> Confirm with your own password — every key is uniquely HMAC-signed, shown once, recorded in the issuance history, and written to the audit log. Tampered or forged keys are rejected at activation.
          </p>
          <form onSubmit={issueKey} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="School code" hint="A–Z, 0–9 (no spaces)">
                <Input required value={issue.schoolId} onChange={(e) => setIssue((v) => ({ ...v, schoolId: e.target.value.toUpperCase() }))} placeholder="MAIN" className="font-mono uppercase" />
              </Field>
              <Field label="Validity (days)" hint="1 – 3650">
                <Input type="number" required min={1} max={3650} value={issue.days} onChange={(e) => setIssue((v) => ({ ...v, days: e.target.value }))} />
              </Field>
            </div>
            <Field label="Your password (confirmation)" hint="Verifies it is really you — a stolen session cannot issue keys">
              <Input type="password" required value={issue.password} onChange={(e) => setIssue((v) => ({ ...v, password: e.target.value }))} autoComplete="current-password" />
            </Field>
            <Button type="submit" loading={issuing}><ShieldCheck className="h-4 w-4" /> Issue key</Button>
          </form>
          {issuedKey && (
            <div className="mt-4 space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-semibold text-emerald-700">Key issued — copy it now, it is shown only once:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded-lg bg-white px-3 py-2 font-mono text-sm font-semibold text-slate-800">{issuedKey}</code>
                <Button type="button" variant="outline" onClick={() => copyText(issuedKey)}><Copy className="h-4 w-4" /></Button>
              </div>
              <Button type="button" variant="outline" onClick={() => openSend()}><Send className="h-4 w-4" /> Send to school (Email / WhatsApp / SMS)</Button>
              <p className="text-xs text-slate-500">The school pastes it into “Activate license” below.</p>
            </div>
          )}
        </div>
      )}

      {meRole === "developer" && (
        <div className="card mb-6 p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-ink"><History className="h-5 w-5 text-primary" /> Issuance history</h3>
          <p className="mt-1 text-sm text-slate-500">
            Every key you issue, with the public nonce and a SHA-256 hash (verify a school&apos;s key against it). Stored keys are encrypted at rest — re-send or revoke them at any time. A revoked key can never be activated again.
          </p>
          {issuances.length === 0 ? (
            <p className="mt-4 rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">No keys issued yet — use the panel above.</p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
              <table className="table">
                <thead><tr><th>School</th><th>Days</th><th>Nonce</th><th>Issued by</th><th>Delivered to</th><th>Status</th><th>Date</th><th className="text-right">Actions</th></tr></thead>
                <tbody>
                  {issuances.map((iss) => (
                    <tr key={iss.id}>
                      <td className="font-semibold text-slate-800">{iss.schoolId}</td>
                      <td>{iss.days}</td>
                      <td className="font-mono text-xs">{iss.nonce}</td>
                      <td className="text-xs text-slate-500">{iss.issuedBy ?? "—"}</td>
                      <td>{iss.sentTo ? <Badge tone="green">{iss.sentTo}</Badge> : <Badge tone="amber">not sent</Badge>}</td>
                      <td>{iss.revokedAt ? <Badge tone="red">REVOKED</Badge> : <Badge tone="slate">active</Badge>}</td>
                      <td className="text-xs text-slate-500">{new Date(iss.createdAt).toLocaleDateString("en-GB")}</td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openSend(iss)} disabled={!!iss.revokedAt} className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40" title={iss.revokedAt ? "Revoked" : "Send to school"}>
                            <Send className="h-4 w-4" />
                          </button>
                          {!iss.revokedAt && (
                            <button onClick={() => setRevokeModal({ id: iss.id, label: `${iss.schoolId} · ${iss.nonce}` })} disabled={revoking === iss.id} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Revoke this key">
                              <Ban className={`h-4 w-4 ${revoking === iss.id ? "animate-pulse" : ""}`} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {meRole === "developer" && (
        <div className="card mb-6 max-w-2xl p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-ink"><RefreshCw className="h-5 w-5 text-primary" /> Rotate signing secret</h3>
          <p className="mt-1 text-sm text-slate-500">
            Compromise suspected? Generate a fresh secret. Existing keys keep working because validation falls back to <code className="rounded bg-slate-100 px-1 font-mono text-xs">LICENSE_SECRET_OLD</code> — rotation is safe and non-disruptive.
          </p>
          {!rotateResult ? (
            <form onSubmit={doRotate} className="mt-4 space-y-4">
              <Field label="Your password (confirmation)" hint="Rotation is a developer-only, irreversible operation — verify your identity">
                <Input type="password" required value={rotatePw} onChange={(e) => setRotatePw(e.target.value)} autoComplete="current-password" />
              </Field>
              <Button type="button" variant="ghost" onClick={() => setRotateOpen(!rotateOpen)}>{rotateOpen ? "Hide plan" : "What happens?"}</Button>
              {rotateOpen && (
                <ul className="list-disc space-y-1 pl-5 text-xs text-slate-500">
                  <li>A new cryptographically-strong secret is generated for you.</li>
                  <li>The current secret moves into <code className="font-mono">LICENSE_SECRET_OLD</code> — every key issued so far still validates.</li>
                  <li>Encrypted stored keys stay decryptable via the old secret.</li>
                  <li>You apply the .env block and restart; nothing else changes.</li>
                </ul>
              )}
              <Button type="submit" loading={rotating}><RefreshCw className="h-4 w-4" /> Generate rotation plan</Button>
            </form>
          ) : (
            <div className="mt-4 space-y-4 rounded-xl border border-violet-200 bg-violet-50 p-4">
              <p className="text-xs font-semibold text-violet-700">Verified safe — apply this to .env and restart:</p>
              <pre className="overflow-x-auto rounded-lg bg-slate-900 px-4 py-3 font-mono text-xs text-emerald-300">{rotateResult.envBlock}</pre>
              <Button type="button" variant="outline" onClick={() => copyText(rotateResult.envBlock)}><Copy className="h-4 w-4" /> Copy .env block</Button>
              <p className="text-xs text-slate-600">{rotateResult.instructions}</p>
              <div>
                <p className="text-xs font-semibold text-slate-700">Verification key (minted under the OLD secret — must still activate after restart):</p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 break-all rounded-lg bg-white px-3 py-2 font-mono text-xs font-semibold text-slate-800">{rotateResult.verificationKey}</code>
                  <Button type="button" variant="outline" onClick={() => copyText(rotateResult.verificationKey)}><Copy className="h-4 w-4" /></Button>
                </div>
              </div>
              <Button type="button" variant="ghost" onClick={() => setRotateResult(null)}>Done — rotate again later</Button>
            </div>
          )}
        </div>
      )}

      <div className="card max-w-2xl border-emerald-300/50 p-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-ink"><KeyRound className="h-5 w-5 text-primary" /> Activate this installation</h3>
        <p className="mt-1 text-sm text-slate-500">
          <strong>Developer-only.</strong> Activation is performed exclusively from this console — no
          administrator, teacher or other account can activate the system anywhere in the app. Paste
          the key issued to this school (after their payment is confirmed) to activate on their behalf.
        </p>
        <form onSubmit={activate} className="mt-4 space-y-4">
          <Field label="License key *" hint="Format: GES-SMIS-XXXX-XXXXXXXXXXXX">
            <Input required value={key} onChange={(e) => setKey(e.target.value)} placeholder="GES-SMIS-MAIN-…" className="font-mono" />
          </Field>
          <Button type="submit" loading={busy} disabled={key.trim().length < 10}><KeyRound className="h-4 w-4" /> Activate for the school</Button>
        </form>
        <div className="mt-4 rounded-xl border border-dashed border-violet-300 bg-violet-50/70 p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-violet-700">
            <Sparkles className="h-3.5 w-3.5" /> Auto-generate &amp; activate
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Generate a brand-new key for this school and activate it instantly — no payment webhook needed
            (use for cash / direct mobile-money purchases). School code &amp; validity come from the “Issue key” panel.
          </p>
          <form onSubmit={autoActivate} className="mt-3 flex flex-wrap items-end gap-2">
            <Field label="Your password (confirmation)">
              <Input type="password" required value={issue.password} onChange={(e) => setIssue((v) => ({ ...v, password: e.target.value }))} autoComplete="current-password" placeholder="Confirm your password" className="w-56" />
            </Field>
            <Button type="submit" loading={busy} disabled={!issue.password || !issue.schoolId.trim()}>
              <Sparkles className="h-4 w-4" /> Generate &amp; activate now
            </Button>
          </form>
        </div>
        <p className="mt-4 text-xs text-slate-400">
          Keys are issued <strong>only</strong> by you here (Developer Console → Issue license key) and are
          HMAC-signed, so they cannot be forged or tampered with. Activation is gated server-side by the
          <code className="mx-1 rounded bg-slate-100 px-1 font-mono">licensing</code> permission, which only the
          Developer role holds — the API rejects everyone else with 403.
        </p>
      </div>

      <Modal open={!!revokeModal} onClose={() => { setRevokeModal(null); setRevokePw(""); }} title={`Revoke key — ${revokeModal?.label ?? ""}`} subtitle="Revoked keys can never be activated again. If this school already activated the key, its installation is suspended immediately.">
        {revokeModal && (
          <div className="space-y-4">
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              ⚠ This is irreversible. The school will have to purchase and receive a new key from you.
            </div>
            <Field label="Your password (confirmation)" hint="Verifies it is really you — revocation is developer-only">
              <Input type="password" required value={revokePw} onChange={(e) => setRevokePw(e.target.value)} autoComplete="current-password" />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => { setRevokeModal(null); setRevokePw(""); }}>Cancel</Button>
              <Button onClick={confirmRevoke} loading={revoking === revokeModal.id} variant="danger" disabled={!revokePw}><Ban className="h-4 w-4" /> Revoke key</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!sendModal} onClose={() => setSendModal(null)} title={`Send license key — ${sendModal?.label ?? ""}`} subtitle="Deliver the key to the school admin by Email, WhatsApp or SMS. Stored keys are decrypted server-side — the raw key never appears in any response.">
        {sendModal && (
          <div className="space-y-4">
            <Field label="Channels *">
              <div className="flex flex-wrap gap-2">
                {CHANNELS.map(([ch, label, Icon]) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setSendForm((f) => ({ ...f, channels: { ...f.channels, [ch]: !f.channels[ch] } }))}
                    className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-all ${sendForm.channels[ch] ? "border-primary bg-primary-soft text-primary shadow-sm" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"}`}
                  >
                    <Icon className="h-4 w-4" /> {label}
                  </button>
                ))}
              </div>
            </Field>
            {sendForm.channels.EMAIL && (
              <Field label="School email *" hint="Receives the full activation instructions.">
                <Input type="email" value={sendForm.email} onChange={(e) => setSendForm((f) => ({ ...f, email: e.target.value }))} placeholder="admin@school.edu.gh" />
              </Field>
            )}
            {(sendForm.channels.WHATSAPP || sendForm.channels.SMS) && (
              <Field label="School phone *" hint="Receives the compact key message.">
                <Input value={sendForm.phone} onChange={(e) => setSendForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+233 24 000 0000" />
              </Field>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setSendModal(null)}>Cancel</Button>
              <Button onClick={doSend} loading={sending}><Send className="h-4 w-4" /> Send key</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

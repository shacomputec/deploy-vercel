"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, Save, Smartphone, ShieldCheck, Info, Landmark } from "lucide-react";
import { api } from "@/lib/client";
import { ghs, fmtDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/admin/page-header";
import { useToast } from "@/components/ui/toast";

type Settings = {
  testMode: boolean;
  momoEnabled: boolean; momoEnv: "sandbox" | "live"; momoSubscriptionKey: string;
  momoApiUserId: string; momoApiKey: string; momoBusinessPhone: string;
  airtelEnabled: boolean; airtelEnv: "sandbox" | "live"; airtelSubscriptionKey: string;
  airtelApiUserId: string; airtelApiKey: string; airtelBusinessPhone: string;
  telecelEnabled: boolean; telecelEnv: "sandbox" | "live"; telecelSubscriptionKey: string;
  telecelApiUserId: string; telecelApiKey: string; telecelBusinessPhone: string;
  paystackEnabled: boolean; paystackPublicKey: string; paystackSecretKey: string;
};

type Tx = {
  id: string; reference: string; amount: number; method: string; provider: string | null;
  status: string; phone: string | null; checkoutUrl: string | null; receiptNo: string | null;
  createdAt: string; student: { fullName: string; admissionNo: string } | null;
};

const txTone = (s: string) => (s === "SUCCESS" ? "green" : s === "PENDING" ? "amber" : s === "FAILED" ? "red" : "slate") as "green" | "amber" | "red" | "slate";

type ProviderCfg = {
  key: string; label: string; desc: string; tone: string; iconTone: string;
};

const PROVIDERS: ProviderCfg[] = [
  { key: "momo", label: "MTN Mobile Money", desc: "MoMo Collection API · prefixes 024/054/055/059", tone: "accent-amber-600", iconTone: "text-amber-600 bg-amber-50" },
  { key: "airtel", label: "AirtelTigo Money", desc: "Airtel Africa merchant API · prefixes 026/027/057", tone: "accent-red-600", iconTone: "text-red-600 bg-red-50" },
  { key: "telecel", label: "Telecel Cash", desc: "Ex-Vodafone Cash merchant API · prefixes 020/050", tone: "accent-orange-600", iconTone: "text-orange-600 bg-orange-50" },
];

export default function PaymentsPage() {
  const toast = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, t] = await Promise.all([
        api<Settings>("/api/payment-settings"),
        api<Tx[]>("/api/payments/transactions"),
      ]);
      setSettings(s);
      setTxs(t);
    } catch (e) {
      toast.toast({ title: "Failed to load", description: (e as Error).message, variant: "error" });
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const saved = await api<Settings>("/api/payment-settings", { method: "PUT", body: JSON.stringify(settings) });
      setSettings(saved);
      toast.toast({ title: "Payment settings saved", description: "Changes apply to new payments immediately.", variant: "success" });
    } catch (e) {
      toast.toast({ title: "Save failed", description: (e as Error).message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  const set = (patch: Partial<Settings>) => setSettings((s) => (s ? { ...s, ...patch } : s));
  const collected = txs.filter((t) => t.status === "SUCCESS").reduce((a, t) => a + t.amount, 0);

  const providerLabel = (p: string | null) =>
    p === "AIRTELTIGO" ? "AirtelTigo" : p === "TELECEL" ? "Telecel" : p === "MTN" ? "MTN" : "MOMO";

  // ── go-live readiness ──────────────────────────────────────────────────────
  const readiness = (() => {
    if (!settings) return null;
    const gates: { name: string; ready: boolean; hint: string }[] = [];
    for (const p of PROVIDERS) {
      const S = settings as unknown as Record<string, string | boolean>;
      const enabled = Boolean(S[`${p.key}Enabled`]);
      const key = String(S[`${p.key}SubscriptionKey`] ?? "").trim();
      const phone = String(S[`${p.key}BusinessPhone`] ?? "").trim();
      const env = String(S[`${p.key}Env`] ?? "sandbox");
      const apiUser = String(S[`${p.key}ApiUserId`] ?? "").trim();
      const apiKey = String(S[`${p.key}ApiKey`] ?? "").trim();
      if (enabled) {
        const liveNeedsPortalCreds = env === "live" && (!apiUser || !apiKey);
        const ready = Boolean(key && phone) && !liveNeedsPortalCreds;
        const hints: string[] = [];
        if (!key) hints.push("missing the subscription key");
        if (!phone) hints.push("missing the business number");
        if (liveNeedsPortalCreds) hints.push("live mode needs the API User ID + API Key from the provider portal");
        gates.push({ name: p.label.split(" ")[0], ready, hint: hints.join(" · ") || "ready" });
      }
    }
    if (settings.paystackEnabled) {
      const pk = settings.paystackPublicKey.trim();
      const sk = settings.paystackSecretKey.trim();
      gates.push({ name: "Paystack", ready: Boolean(pk && sk), hint: pk && sk ? "ready" : pk && !sk ? "missing the secret key (sk_…)" : "missing keys" });
    }
    const ready = gates.filter((g) => g.ready).map((g) => g.name);
    const missing = gates.filter((g) => !g.ready);
    return { ready, missing, allReady: gates.length > 0 && missing.length === 0, noneEnabled: gates.length === 0 };
  })();

  return (
    <div>
      <PageHeader
        title="Online Payments"
        subtitle="Mobile Money — MTN, AirtelTigo & Telecel — plus Paystack, with automatic receipts"
        action={<CreditCard className="h-5 w-5 text-primary" />}
      />

      <div className="mb-5 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
        <p className="font-semibold">These are <strong>your school's own gateway keys</strong>.</p>
        <p className="mt-1">
          Create your own MTN MoMo / AirtelTigo / Telecel / Paystack merchant accounts and paste the keys here —
          every fee collected online goes into <strong>your</strong> business account. The system developer's keys are
          separate and are only used for license activation, never for your collections.
        </p>
      </div>

      {readiness && settings && readiness.noneEnabled && (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">No payment gateway is enabled yet.</p>
          <p className="mt-1">Enable MTN, AirtelTigo, Telecel or Paystack below to start collecting fees online. With <strong>test mode ON</strong> and no keys, payments are simulated so you can try the whole flow safely.</p>
        </div>
      )}

      {readiness && settings && !readiness.noneEnabled && (
        <div className={`mb-5 rounded-2xl border p-4 text-sm ${readiness.allReady ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
          <p className="font-semibold">
            {readiness.allReady
              ? `✅ Go-live ready — ${readiness.ready.join(", ")} will collect real payments.`
              : `⚙️ ${readiness.ready.length ? readiness.ready.join(", ") + " ready · " : ""}${readiness.missing.map((m) => m.name).join(", ")} needs attention`}
          </p>
          {!readiness.allReady && (
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
              {readiness.missing.map((m) => (
                <li key={m.name}>
                  <strong>{m.name}</strong>: {m.hint}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {settings && (
        <form onSubmit={save} className="space-y-5">
          {/* test mode */}
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600"><Info className="h-5 w-5" /></div>
                <div>
                  <p className="font-semibold text-slate-800">Test / sandbox mode</p>
                  <p className="mt-0.5 max-w-xl text-sm text-slate-500">
                    When ON, payments via a network that has no keys are <strong>simulated</strong> and confirmed automatically — perfect for demos.
                    When OFF, unconfigured networks reject payments. With keys present, sandbox/live calls are used regardless.
                  </p>
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={settings.testMode} onChange={(e) => set({ testMode: e.target.checked })} className="h-5 w-5 rounded accent-amber-600" />
                <span className="text-sm font-semibold text-slate-700">{settings.testMode ? "Simulation ON" : "Live only"}</span>
              </label>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {PROVIDERS.map((p) => {
              const S = settings as unknown as Record<string, string | boolean>;
              return (
                <div key={p.key} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-xl p-2.5 ${p.iconTone}`}><Smartphone className="h-5 w-5" /></div>
                      <div>
                        <p className="font-semibold text-slate-800">{p.label}</p>
                        <p className="text-xs text-slate-400">{p.desc}</p>
                      </div>
                    </div>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input type="checkbox" checked={Boolean(S[`${p.key}Enabled`])} onChange={(e) => set({ [`${p.key}Enabled`]: e.target.checked } as Partial<Settings>)} className={`h-5 w-5 rounded ${p.tone}`} />
                      <span className="text-sm font-semibold text-slate-700">Enabled</span>
                    </label>
                  </div>
                  <div className="space-y-3">
                    <Field label="Environment">
                      <Select value={String(S[`${p.key}Env`])} onChange={(e) => set({ [`${p.key}Env`]: e.target.value as "sandbox" | "live" } as Partial<Settings>)}>
                        <option value="sandbox">Sandbox (testing)</option>
                        <option value="live">Live (production)</option>
                      </Select>
                    </Field>
                    {String(S[`${p.key}Env`]) === "live" && (
                      <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-700">
                        Live mode: API users are created in the <strong>provider portal</strong>, not by the app. Paste your API User ID and API Key above — otherwise payments will not start.
                      </p>
                    )}
                    <Field label="Subscription / API key">
                      <Input value={String(S[`${p.key}SubscriptionKey`])} onChange={(e) => set({ [`${p.key}SubscriptionKey`]: e.target.value } as Partial<Settings>)} placeholder="Paste your subscription key" autoComplete="off" />
                    </Field>
                    <Field label="Business MoMo number">
                      <Input value={String(S[`${p.key}BusinessPhone`])} onChange={(e) => set({ [`${p.key}BusinessPhone`]: e.target.value } as Partial<Settings>)} placeholder="+233 2XX XXX XXX" />
                    </Field>
                    <Field label="API user ID" hint={String(S[`${p.key}Env`]) === "live" ? "Paste from the provider portal (required for live)" : "Leave empty — auto-created on the first sandbox payment"}>
                      <Input value={String(S[`${p.key}ApiUserId`])} onChange={(e) => set({ [`${p.key}ApiUserId`]: e.target.value } as Partial<Settings>)} placeholder={String(S[`${p.key}Env`]) === "live" ? "UUID from the provider portal" : "auto-provisioned"} autoComplete="off" />
                    </Field>
                    <Field label="API key" hint={String(S[`${p.key}Env`]) === "live" ? "Paste from the provider portal (required for live)" : "Leave empty — auto-created on the first sandbox payment"}>
                      <Input value={String(S[`${p.key}ApiKey`])} onChange={(e) => set({ [`${p.key}ApiKey`]: e.target.value } as Partial<Settings>)} placeholder={String(S[`${p.key}Env`]) === "live" ? "API key from the provider portal" : "auto-provisioned"} autoComplete="off" type="password" />
                    </Field>
                  </div>
                </div>
              );
            })}

            {/* Paystack */}
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-sky-50 p-2.5 text-sky-600"><CreditCard className="h-5 w-5" /></div>
                  <div>
                    <p className="font-semibold text-slate-800">Paystack</p>
                    <p className="text-xs text-slate-400">Cards, bank & mobile money (GHS)</p>
                  </div>
                </div>
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={settings.paystackEnabled} onChange={(e) => set({ paystackEnabled: e.target.checked })} className="h-5 w-5 rounded accent-sky-600" />
                  <span className="text-sm font-semibold text-slate-700">Enabled</span>
                </label>
              </div>
              <div className="space-y-3">
                <Field label="Public key">
                  <Input value={settings.paystackPublicKey} onChange={(e) => set({ paystackPublicKey: e.target.value })} placeholder="pk_live_… / pk_test_…" autoComplete="off" />
                </Field>
                <Field label="Secret key">
                  <Input value={settings.paystackSecretKey} onChange={(e) => set({ paystackSecretKey: e.target.value })} placeholder="sk_live_… / sk_test_…" autoComplete="off" type="password" />
                </Field>
                <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                  <p className="flex items-center gap-1.5 font-semibold text-slate-600"><ShieldCheck className="h-3.5 w-3.5" /> How it works</p>
                  <p className="mt-1.5">
                    Webhook: <code className="rounded bg-white px-1">/api/payments/webhook/paystack</code> — add this to your Paystack
                    dashboard. Payments are verified server-side (HMAC signature) and receipts are issued automatically. The public
                    checkout lives at <code className="rounded bg-white px-1">/pay</code>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" loading={saving}><Save className="h-4 w-4" /> Save Gateway Settings</Button>
          </div>
        </form>
      )}

      {/* transactions */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Online transactions</h2>
          <Badge tone="slate">{collected ? ghs(collected) : "—"} collected</Badge>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Reference</th><th>Student</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th><th>Receipt</th></tr></thead>
            <tbody>
              {txs.map((t) => (
                <tr key={t.id}>
                  <td className="font-mono text-xs">{t.reference}</td>
                  <td>
                    {t.student ? (
                      <>
                        <p className="font-medium text-slate-800">{t.student.fullName}</p>
                        <p className="text-xs text-slate-400">{t.student.admissionNo}</p>
                      </>
                    ) : (
                      <p className="font-medium text-slate-800">License activation</p>
                    )}
                  </td>
                  <td className="font-semibold text-emerald-700">{ghs(t.amount)}</td>
                  <td><Badge tone={t.method === "MOMO" ? "amber" : "blue"}>{t.method === "MOMO" ? providerLabel(t.provider) : "Paystack"}</Badge></td>
                  <td><Badge tone={txTone(t.status)}>{t.status}</Badge></td>
                  <td className="text-xs">{fmtDateTime(t.createdAt)}</td>
                  <td className="font-mono text-xs">{t.receiptNo ?? "—"}</td>
                </tr>
              ))}
              {txs.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-slate-400">No online payments yet — share the /pay page with parents.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
          <Landmark className="h-3.5 w-3.5" /> Payer phone numbers are auto-detected to MTN, AirtelTigo or Telecel on the checkout page — no extra steps for parents.
        </p>
      </div>
    </div>
  );
}

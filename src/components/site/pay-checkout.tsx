"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Smartphone, CreditCard, CheckCircle2, Loader2, ArrowRight, ShieldCheck,
  Receipt, RotateCcw, ExternalLink, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { ghs } from "@/lib/utils";

type Step = "details" | "method" | "processing" | "done";
type InitiateData = {
  reference: string; status: string; simulated?: boolean;
  checkoutUrl?: string; message?: string;
};
type StatusData = {
  reference: string; status: string; receiptNo?: string | null;
  checkoutUrl?: string | null; amount?: number; method?: string;
};

const METHODS = [
  { id: "PAYSTACK", name: "Paystack", desc: "Cards, bank accounts, mobile money", icon: CreditCard, tone: "text-sky-600 bg-sky-50 ring-sky-200" },
  { id: "MOMO", name: "Mobile Money", desc: "MTN · AirtelTigo · Telecel — confirm with a USSD prompt", icon: Smartphone, tone: "text-amber-600 bg-amber-50 ring-amber-200" },
] as const;

const MOMO_PROVIDERS = [
  { id: "MTN", name: "MTN Mobile Money", ussd: "*170#", hint: "024 · 054 · 055 · 059" },
  { id: "AIRTELTIGO", name: "AirtelTigo Money", ussd: "*110#", hint: "026 · 027 · 057" },
  { id: "TELECEL", name: "Telecel Cash", ussd: "*110#", hint: "020 · 050" },
] as const;
type MomoProviderId = (typeof MOMO_PROVIDERS)[number]["id"];

/** Detect the Ghana network from a phone number (null when unknown). */
function detectNetwork(phone: string): MomoProviderId | null {
  const d = phone.replace(/\D/g, "").replace(/^233/, "0");
  if (/^(024|025|054|055|059)/.test(d)) return "MTN";
  if (/^(026|027|057)/.test(d)) return "AIRTELTIGO";
  if (/^(020|050)/.test(d)) return "TELECEL";
  return null;
}

export function PayCheckout() {
  const [step, setStep] = useState<Step>("details");
  const [form, setForm] = useState({ admissionNo: "", amount: "", phone: "" });
  const [method, setMethod] = useState<"MOMO" | "PAYSTACK">("PAYSTACK");
  const [provider, setProvider] = useState<MomoProviderId>("MTN");
  const [networkNote, setNetworkNote] = useState<string | null>(null);
  const [init, setInit] = useState<InitiateData | null>(null);
  const [done, setDone] = useState<StatusData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState("Waiting for payment confirmation…");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Reference is mirrored in a ref so the interval callback never reads stale state.
  const initRef = useRef<InitiateData | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const amount = Number(form.amount);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a valid amount in Ghana cedis.");
      const res = await fetch(`/api/students/lookup?admissionNo=${encodeURIComponent(form.admissionNo)}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Student not found.");
      setStep("method");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function startPayment() {
    setError(null);
    setBusy(true);
    setStep("processing");
    setStatusNote(method === "MOMO" ? "Sending a payment prompt to your phone…" : "Opening the secure Paystack checkout…");
    try {
      const res = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admissionNo: form.admissionNo.trim(),
          amount: Number(form.amount),
          method,
          provider: method === "MOMO" ? provider : undefined,
          phone: method === "MOMO" ? form.phone : undefined,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Could not start the payment.");
      const data = json.data as InitiateData;
      setInit(data);
      initRef.current = data;
      setStatusNote(data.message ?? "Waiting for payment confirmation…");
      pollRef.current = setInterval(pollStatus, 4000);
      pollStatus();
    } catch (err) {
      setError((err as Error).message);
      setStep("method");
    } finally {
      setBusy(false);
    }
  }

  async function pollStatus() {
    const current = initRef.current;
    if (!current) return;
    try {
      const res = await fetch(`/api/payments/status?reference=${encodeURIComponent(current.reference)}`);
      const json = await res.json();
      if (!json.ok) return;
      const data = json.data as StatusData;
      if (data.status === "SUCCESS") {
        stopPolling();
        setDone(data);
        setStep("done");
      } else if (data.status === "FAILED" || data.status === "EXPIRED") {
        stopPolling();
        setError(data.status === "FAILED" ? "The payment was not completed. Please try again." : "This payment link has expired. Please start again.");
        setStep("method");
      } else {
        setStatusNote(method === "MOMO" ? `Check your phone and confirm with ${MOMO_PROVIDERS.find((p) => p.id === provider)?.ussd ?? "*170#"}…` : "Complete the payment in the Paystack window…");
      }
    } catch {
      /* transient network error — keep polling */
    }
  }

  function reset() {
    stopPolling();
    initRef.current = null;
    setStep("details");
    setForm({ admissionNo: "", amount: "", phone: "" });
    setProvider("MTN");
    setNetworkNote(null);
    setInit(null);
    setDone(null);
    setError(null);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <AnimatePresence mode="wait">
        {step === "details" && (
          <motion.div key="details" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
            <div className="card p-6 sm:p-10">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                  <Wallet className="h-7 w-7" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-ink">Pay School Fees Online</h2>
                  <p className="text-sm text-slate-500">Secure payments via MTN, AirtelTigo or Telecel Mobile Money, or Paystack. Receipts are issued instantly.</p>
                </div>
              </div>

              <form onSubmit={lookup} className="mt-8 space-y-5">
                <Field label="Admission Number" hint="Found on the student's ID card or previous report card.">
                  <Input value={form.admissionNo} onChange={(e) => setForm({ ...form, admissionNo: e.target.value })} placeholder="e.g. GES-2024-0001" className="text-base" required />
                </Field>
                <Field label="Amount (GHS)" hint="Full term fees or a part payment — any amount.">
                  <Input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="e.g. 200" inputMode="decimal" type="number" min="1" step="0.5" className="text-base" required />
                </Field>
                {error && <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}
                <Button type="submit" loading={busy} size="lg" className="w-full">
                  {busy ? "Checking…" : "Continue"} <ArrowRight className="h-4 w-4" />
                </Button>
                <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
                  <ShieldCheck className="h-3.5 w-3.5" /> Encrypted · verified by the gateway · receipt auto-issued
                </p>
              </form>
            </div>
          </motion.div>
        )}

        {step === "method" && (
          <motion.div key="method" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
            <div className="card p-6 sm:p-10">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-ink">Choose how to pay</h2>
                  <p className="text-sm text-slate-500">
                    {form.admissionNo} · <span className="font-semibold text-slate-700">{ghs(Number(form.amount))}</span>
                  </p>
                </div>
                <button onClick={reset} className="flex items-center gap-1 text-sm font-medium text-slate-400 hover:text-slate-600">
                  <RotateCcw className="h-3.5 w-3.5" /> Change
                </button>
              </div>

              <div className="space-y-3">
                {METHODS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMethod(m.id)}
                    className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition ${
                      method === m.id ? "border-primary bg-primary-soft" : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 ${m.tone}`}>
                      <m.icon className="h-6 w-6" />
                    </span>
                    <span className="flex-1">
                      <span className="block font-semibold text-slate-800">{m.name}</span>
                      <span className="block text-sm text-slate-500">{m.desc}</span>
                    </span>
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${method === m.id ? "border-primary bg-primary" : "border-slate-300"}`}>
                      {method === m.id && <span className="h-2 w-2 rounded-full bg-white" />}
                    </span>
                  </button>
                ))}
              </div>

              {method === "MOMO" && (
                <div className="mt-5">
                  <Field label="Mobile Money Number" hint="The number that will receive the payment prompt.">
                    <Input
                      value={form.phone}
                      onChange={(e) => {
                        const p = e.target.value;
                        setForm({ ...form, phone: p });
                        const net = detectNetwork(p);
                        if (net) {
                          setProvider(net);
                          setNetworkNote(null);
                        } else if (p.replace(/\D/g, "").length >= 10) {
                          setNetworkNote("Number not recognised — please choose the network manually.");
                        } else {
                          setNetworkNote(null);
                        }
                      }}
                      placeholder="e.g. 0244 000 000"
                      inputMode="tel"
                      className="text-base"
                      required
                    />
                  </Field>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {MOMO_PROVIDERS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setProvider(p.id)}
                        className={`rounded-xl border-2 p-3 text-left transition ${provider === p.id ? "border-amber-500 bg-amber-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
                      >
                        <span className="block text-xs font-bold text-slate-800">{p.name}</span>
                        <span className="block text-[11px] text-slate-400">{p.hint}</span>
                      </button>
                    ))}
                  </div>
                  {networkNote && <p className="mt-2 text-xs font-medium text-amber-600">{networkNote}</p>}
                  <p className="mt-2 text-xs text-slate-400">
                    Prompt: dial <span className="font-mono font-semibold">{MOMO_PROVIDERS.find((p) => p.id === provider)?.ussd}</span> to approve.
                  </p>
                </div>
              )}

              {error && <p className="mt-5 rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button type="button" variant="ghost" onClick={() => setStep("details")}>Back</Button>
                <Button type="button" onClick={startPayment} loading={busy} size="lg" className="flex-1">
                  {busy ? "Starting payment…" : `Pay ${ghs(Number(form.amount))}`}
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {step === "processing" && init && (
          <motion.div key="processing" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
            <div className="card p-8 text-center sm:p-12">
              {init.checkoutUrl ? (
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                  <CreditCard className="h-8 w-8" />
                </div>
              ) : (
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                  <Smartphone className="h-8 w-8" />
                </div>
              )}
              <h2 className="mt-5 text-xl font-semibold text-ink">
                {init.checkoutUrl ? "Finish on the Paystack page" : "Confirm the prompt on your phone"}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{statusNote}</p>
              {init.simulated && (
                <p className="mx-auto mt-3 max-w-md rounded-lg bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-700">
                  Test mode: no gateway keys configured — this payment will be confirmed automatically.
                </p>
              )}
              {init.checkoutUrl && (
                <a href={init.checkoutUrl} target="_blank" rel="noreferrer" className="btn-primary mx-auto mt-6">
                  Open secure checkout <ExternalLink className="h-4 w-4" />
                </a>
              )}
              <p className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Reference: <span className="font-mono font-semibold">{init.reference}</span>
              </p>
              <Button type="button" variant="ghost" onClick={() => { stopPolling(); setStep("method"); }} className="mt-3">
                Cancel
              </Button>
            </div>
          </motion.div>
        )}

        {step === "done" && done && (
          <motion.div key="done" initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
            <div className="card overflow-hidden p-0">
              <div className="bg-emerald-600 px-6 py-8 text-center text-white sm:px-10">
                <CheckCircle2 className="mx-auto h-14 w-14" />
                <h2 className="mt-3 text-2xl font-bold">Payment Successful</h2>
                <p className="mt-1 text-sm text-emerald-100">
                  {done.method === "MOMO" ? (MOMO_PROVIDERS.find((p) => p.id === provider)?.name ?? "Mobile Money") : "Paystack"} · {ghs(done.amount ?? 0)} · {form.admissionNo}
                </p>
              </div>
              <div className="space-y-4 p-6 sm:p-10">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-5 py-4">
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-600">
                    <Receipt className="h-4 w-4" /> Official receipt number
                  </span>
                  <span className="font-mono text-lg font-bold text-emerald-700">{done.receiptNo ?? "—"}</span>
                </div>
                <p className="text-center text-sm text-slate-500">
                  Your payment has been recorded and the receipt is saved in the school&apos;s accounts office. Thank you!
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button type="button" variant="outline" onClick={() => window.print()} className="flex-1">Print Receipt</Button>
                  <Button type="button" onClick={reset} className="flex-1">Pay Another</Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

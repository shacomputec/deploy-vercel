"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck, Smartphone, CreditCard, AlertTriangle } from "lucide-react";
import { api } from "@/lib/client";

type PurchaseResult = {
  reference: string;
  status: string;
  checkoutUrl?: string;
  message?: string;
};

/** Public "Buy this system" checkout — no login needed. Pays the DEVELOPER
 *  (their gateway keys only) for a license; the key is delivered to the
 *  buyer's own contact. The developer's API secrets are never exposed.
 *  Two pricing tiers: Basic (Crèche → JHS) and Basic + SHS. */
export function BuyNowCheckout({ priceBasic, priceShs }: { priceBasic: number; priceShs: number }) {
  const [tier, setTier] = useState<"basic" | "shs">("basic");
  const [schoolName, setSchoolName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<"PAYSTACK" | "MOMO">("PAYSTACK");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<PurchaseResult | null>(null);
  const price = tier === "shs" ? priceShs : priceBasic;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(null);
    setBusy(true);
    try {
      const res = await api<PurchaseResult>("/api/license/purchase", {
        method: "POST",
        body: JSON.stringify({ schoolName, tier, method, email, phone }),
      });
      setDone(res);
      if (res.checkoutUrl) {
        window.open(res.checkoutUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card relative overflow-hidden p-7">
      <span className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-amber-200/40 blur-2xl" />
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Buy now — pay securely online</h3>
          <p className="text-xs text-slate-500">GH₵{price.toLocaleString()} · one-time · everything included</p>
        </div>
      </div>

      {done ? (
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-emerald-800">
            <CheckCircle2 className="h-4 w-4" /> Payment started
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-emerald-900">{done.message}</p>
          <p className="mt-2 text-xs font-semibold text-emerald-700">Reference: {done.reference}</p>
          {done.checkoutUrl ? (
            <a href={done.checkoutUrl} target="_blank" rel="noopener noreferrer" className="btn-primary mt-4 w-full">
              <CreditCard className="h-4 w-4" /> Continue to secure checkout
            </a>
          ) : (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-white/70 p-3 text-[12px] leading-relaxed text-slate-600">
              <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              Dial *170# on the phone that received the prompt and confirm the payment. Your license key arrives by SMS, WhatsApp and email the instant it settles.
            </p>
          )}
          <p className="mt-3 text-[11px] text-emerald-700/80">
            Didn’t get it? Contact shacomputec — +233 530 941 750 · shacomputecgh@gmail.com
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Your school type</label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTier("basic")}
                className={`rounded-xl border px-3 py-2.5 text-left transition ${tier === "basic" ? "border-primary bg-primary-soft" : "border-slate-200 bg-white hover:border-slate-300"}`}
              >
                <p className="text-sm font-bold text-slate-800">Basic school</p>
                <p className="text-[11px] text-slate-500">Crèche · KG · Primary · JHS</p>
                <p className={`mt-1 text-sm font-extrabold ${tier === "basic" ? "text-primary" : "text-slate-700"}`}>GH₵{priceBasic.toLocaleString()}</p>
              </button>
              <button
                type="button"
                onClick={() => setTier("shs")}
                className={`rounded-xl border px-3 py-2.5 text-left transition ${tier === "shs" ? "border-primary bg-primary-soft" : "border-slate-200 bg-white hover:border-slate-300"}`}
              >
                <p className="text-sm font-bold text-slate-800">Basic + SHS</p>
                <p className="text-[11px] text-slate-500">…and Senior High School</p>
                <p className={`mt-1 text-sm font-extrabold ${tier === "shs" ? "text-primary" : "text-slate-700"}`}>GH₵{priceShs.toLocaleString()}</p>
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">School name</label>
            <input
              required
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="e.g. Golden Gate Academy"
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="office@school.edu.gh"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0244 000 000"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Pay with</label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMethod("PAYSTACK")}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                  method === "PAYSTACK"
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                }`}
              >
                <CreditCard className="h-4 w-4" /> Card / MoMo
              </button>
              <button
                type="button"
                onClick={() => setMethod("MOMO")}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                  method === "MOMO"
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                }`}
              >
                <Smartphone className="h-4 w-4" /> Direct MoMo
              </button>
            </div>
          </div>

          {error && (
            <p className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[13px] text-rose-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </p>
          )}

          <button type="submit" disabled={busy} className="btn-accent w-full disabled:cursor-not-allowed disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {busy ? "Starting secure payment…" : `Pay GH₵${price.toLocaleString()} securely`}
          <p className="text-center text-[11px] text-slate-400">{tier === "shs" ? "Basic + SHS package" : "Basic school package"} · one-time · everything included</p>
          </button>
          <p className="text-center text-[11px] leading-relaxed text-slate-400">
            Secure payment via Paystack or Mobile Money. Your license key is delivered instantly to the contact above —
            no developer action needed. Refundable within 14 days if you change your mind.
          </p>
        </form>
      )}
    </div>
  );
}

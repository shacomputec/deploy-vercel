"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BadgeCheck, CreditCard, ExternalLink, Loader2, Mail, MessageCircle, Phone, Smartphone, Wallet } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/client";
import { ghs } from "@/lib/utils";

/**
 * The buyer's license-payment panel — shown on the lock screen and the license
 * modal when the school needs to pay. It ONLY lets the school PAY:
 *   • Pay online with Paystack (a checkout the DEVELOPER's keys power), or
 *   • Direct Mobile Money transfer to the developer's numbers.
 * No gateway/API keys, no technical details are ever displayed — the developer
 * completes activation once payment is confirmed. For the Developer account
 * itself this panel is replaced by a link to the Developer Console.
 */
type LicenseConfig = {
  price: number;
  currency: string;
  momoPhones: string;
  developerName: string | null;
  developerPhone: string | null;
  developerEmail: string | null;
  paystackEnabled: boolean;
};

type StatusData = { reference: string; status: string; receiptNo?: string | null };

export function LicensePayPanel({ message }: { message?: string }) {
  const [config, setConfig] = useState<LicenseConfig | null>(null);
  const [isDev, setIsDev] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<{ reference: string; url: string } | null>(null);
  const [note, setNote] = useState("Waiting for payment confirmation…");
  const [activated, setActivated] = useState(false);
  const [deliveryEmail, setDeliveryEmail] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const [me, lic] = await Promise.all([
        api<{ role: string }>("/api/auth/me").catch(() => ({ role: "" })),
        api<{ config?: LicenseConfig; status?: string; message?: string }>("/api/license"),
      ]);
      setIsDev(me.role === "developer");
      setConfig(lic.config ?? null);
      if (lic.message && lic.message !== message) setError(null);
    } catch {
      /* panel stays silent on failure — the contact card below still helps */
    }
  }, [message]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

  async function payOnline() {
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(deliveryEmail.trim())) {
      setError("Enter your email address — that's where we send your license key after payment.");
      return;
    }
    setBusy(true);
    setNote("Opening the secure Paystack checkout…");
    try {
      const data = await api<{ reference: string; checkoutUrl?: string; message?: string }>("/api/license/pay", {
        method: "POST",
        body: JSON.stringify({ method: "PAYSTACK", email: deliveryEmail.trim(), deliveryPhone: deliveryPhone.trim() }),
      });
      if (!data.checkoutUrl) throw new Error(data.message || "Could not start the payment.");
      setCheckout({ reference: data.reference, url: data.checkoutUrl });
      window.open(data.checkoutUrl, "_blank", "noopener");
      setNote("Complete your payment in the Paystack window, then wait a few seconds…");
      pollRef.current = setInterval(() => pollStatus(data.reference), 4000);
      pollStatus(data.reference);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function pollStatus(reference: string) {
    try {
      const data = await api<StatusData>(`/api/payments/status?reference=${encodeURIComponent(reference)}`);
      if (data.status === "SUCCESS") {
        stopPolling();
        setActivated(true);
      } else if (data.status === "FAILED" || data.status === "EXPIRED") {
        stopPolling();
        setError("The payment was not completed. Try again or use direct mobile money below.");
      }
    } catch {
      /* keep polling on transient errors */
    }
  }

  const price = config ? `${config.currency || "GHS"} ${config.price.toFixed(2)}` : "";
  const momoList = (config?.momoPhones || "").split(",").map((s) => s.trim()).filter(Boolean);
  const devPhone = config?.developerPhone || "";
  const devEmail = config?.developerEmail || "";
  const waLink = devPhone
    ? `https://wa.me/${devPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello! I have paid for my GES School MIS license (${price}). Please activate it.`)}`
    : "#";

  if (isDev) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        <p className="font-semibold">You are the developer — no payment needed here.</p>
        <p className="mt-1 text-xs">
          Issue keys, publish terms and lock/unlock from the{" "}
          <Link href="/dev" className="font-semibold underline">Developer Console</Link>. Buyers pay through
          the panel on their side (your own Paystack / MoMo keys, which are never shown to them).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-100">{message}</div>
      )}

      {activated && (
        <div className="rounded-xl bg-emerald-50 px-4 py-4 text-center ring-1 ring-emerald-200">
          <BadgeCheck className="mx-auto h-8 w-8 text-emerald-600" />
          <p className="mt-2 font-bold text-emerald-800">Payment received — thank you!</p>
          <p className="mt-1 text-xs text-emerald-700">
            Your license key was sent instantly to your email / phone — check your inbox and messages.
            Paste it into the activation prompt when it appears. If you don't see it within a few minutes,
            use the developer contact below.
          </p>
        </div>
      )}

      {/* Where the key goes — the buyer's own contact (never the developer's) */}
      {!activated && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <Mail className="h-4 w-4 text-emerald-600" /> Where should we send your license key?
          </p>
          <p className="mt-1 text-xs text-slate-500">
            The moment payment is confirmed, your license key is delivered instantly here by SMS / WhatsApp / email.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Email *</label>
              <input
                type="email"
                value={deliveryEmail}
                onChange={(e) => setDeliveryEmail(e.target.value)}
                placeholder="you@school.edu.gh"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Phone (SMS / WhatsApp)</label>
              <input
                type="tel"
                value={deliveryPhone}
                onChange={(e) => setDeliveryPhone(e.target.value)}
                placeholder="+233 24 000 0000"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        </div>
      )}

      {/* Pay online — Paystack (the developer's own keys, never shown) */}
      {config?.paystackEnabled && !activated && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <CreditCard className="h-4 w-4 text-sky-600" /> Pay online — secure checkout
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Pay <strong>{price}</strong> by card, bank or mobile money on the Paystack payment page.
            The receipt confirms your purchase instantly.
          </p>
          <button
            onClick={payOnline}
            disabled={busy}
            className="btn-primary mt-3 w-full justify-center"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
            {busy ? "Opening checkout…" : `Pay ${price} with Paystack`}
          </button>
          {checkout && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> {note}
              <span className="font-mono">({checkout.reference})</span>
            </p>
          )}
        </div>
      )}

      {/* Direct mobile money */}
      {!activated && (momoList.length > 0 || devPhone) && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <Wallet className="h-4 w-4 text-amber-600" /> Pay directly by mobile money
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Transfer <strong>{price || "the license fee"}</strong> to one of the developer&apos;s numbers below,
            then send the payment receipt to the developer to activate.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(momoList.length ? momoList : [devPhone]).map((p) => (
              <span key={p} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 font-mono text-sm font-bold text-amber-800 ring-1 ring-amber-200">
                <Smartphone className="h-3.5 w-3.5" /> {p}
              </span>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {devPhone && (
              <>
                <a href={waLink} target="_blank" rel="noreferrer" className="btn-outline btn-sm"><MessageCircle className="h-3.5 w-3.5" /> Send proof on WhatsApp</a>
                <a href={`tel:${devPhone.replace(/\s/g, "")}`} className="btn-outline btn-sm"><Phone className="h-3.5 w-3.5" /> Call {devPhone}</a>
              </>
            )}
            {devEmail && <a href={`mailto:${devEmail}`} className="btn-outline btn-sm"><Mail className="h-3.5 w-3.5" /> Email the receipt</a>}
          </div>
        </div>
      )}

      {error && <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}

      {config && (
        <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400">
          <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" />
          No API keys or technical details are shown — this screen only lets you pay. Activation is completed
          by {config.developerName || "your developer"} once payment is confirmed.
        </p>
      )}
    </div>
  );
}

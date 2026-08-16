"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BadgeCheck, Check, Clock, Copy, CreditCard, FileDown, History, KeyRound, Mail, MessageCircle, ShieldCheck,
} from "lucide-react";
import { api } from "@/lib/client";
import { fmtDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LicensePayPanel } from "@/components/dev/license-pay-panel";
import { useToast } from "@/components/ui/toast";

type HistoryRow = {
  reference: string;
  amount: number;
  method: string;
  provider: string | null;
  status: string;
  createdAt: string;
};

type LicenseData = {
  status: string;
  trialDaysLeft: number | null;
  activatedAt: string | null;
  key: string | null;
  message: string;
  config: {
    price: number;
    currency: string;
    momoPhones: string;
    developerName: string | null;
    developerPhone: string | null;
    developerEmail: string | null;
    paystackEnabled: boolean;
  };
  history: HistoryRow[];
};

const STATUS_META: Record<string, { label: string; tone: "green" | "amber" | "red"; hint: string }> = {
  ACTIVE: { label: "Licensed", tone: "green", hint: "This installation is fully licensed." },
  TRIAL: { label: "Trial", tone: "amber", hint: "Trial mode — activate when the school is ready." },
  EXPIRED: { label: "Expired", tone: "red", hint: "The license has expired — renew to continue." },
  SUSPENDED: { label: "Suspended", tone: "red", hint: "This installation is suspended. Unlock it from the console." },
};

/** The school's license dashboard — status, key, payments and renewal. This
 *  surface is STRICTLY developer-only: it lives inside the Developer Console
 *  (/dev) and no other account can open it. */
export function LicenseDashboard() {
  const toast = useToast();
  const [data, setData] = useState<LicenseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api<LicenseData>("/api/license"));
    } catch (e) {
      toast.toast({ title: "Failed to load", description: (e as Error).message, variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="rounded-2xl border border-white/10 bg-white/5 p-8"><div className="skeleton h-4 w-full" /></div>;
  if (!data) return <div className="rounded-2xl border border-white/10 bg-white/5 p-8"><p className="text-sm text-slate-400">License information unavailable.</p></div>;

  const meta = STATUS_META[data.status] ?? STATUS_META.TRIAL!;
  const dev = data.config;
  const maskedKey = data.key
    ? `${data.key.slice(0, 16)}…${data.key.slice(-6)}`
    : null;

  async function copyKey() {
    if (!data?.key) return;
    try {
      await navigator.clipboard.writeText(data.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.toast({ title: "Copy failed", description: "Select the key manually to copy it.", variant: "error" });
    }
  }

  // WhatsApp deep-link to the developer — digits only, international format.
  function waLink(phone?: string | null): string | null {
    const digits = (phone || "").replace(/\D/g, "").replace(/^0/, "233");
    return digits ? `https://wa.me/${digits}?text=${encodeURIComponent("Hello! I need help with my school's GES School MIS license.")}` : null;
  }
  const wa = waLink(dev.developerPhone);
  // mailto deep-link to the developer — subject pre-filled for support.
  const mailHref = dev.developerEmail
    ? `mailto:${dev.developerEmail}?subject=${encodeURIComponent("GES School MIS license support")}`
    : null;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">License status</p>
            <div className="mt-2 flex items-center gap-3">
              <Badge tone={meta.tone}>{meta.label}</Badge>
              {data.status === "ACTIVE" && <BadgeCheck className="h-5 w-5 text-emerald-400" />}
            </div>
            <p className="mt-2 text-sm text-slate-400">{meta.hint}</p>
            {data.status === "TRIAL" && data.trialDaysLeft !== null && (
              <p className="mt-1 text-xs font-semibold text-amber-400">
                <Clock className="mr-1 inline h-3.5 w-3.5" />
                {data.trialDaysLeft} trial day{data.trialDaysLeft === 1 ? "" : "s"} remaining
              </p>
            )}
            {data.activatedAt && (
              <p className="mt-1 text-xs text-slate-500">Activated {fmtDateTime(data.activatedAt)}</p>
            )}
          </div>
        </div>

        {data.key && (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
              <KeyRound className="h-3.5 w-3.5" /> This installation's license key
            </p>
            <p className="mt-2 break-all font-mono text-xs text-slate-200">
              {showKey ? data.key : maskedKey}
            </p>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowKey((v) => !v)}>
                {showKey ? "Hide" : "Reveal"}
              </Button>
              <Button variant="outline" size="sm" onClick={copyKey}>
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Keep the key private — it is machine-verifiable proof of the school's license.
            </p>
          </div>
        )}

        {/* Support */}
        <div className="mt-5 rounded-2xl border border-white/10 p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5" /> Developer support
          </p>
          <div className="mt-2 space-y-1 text-sm text-slate-300">
            {dev.developerName && <p>{dev.developerName}</p>}
            {dev.developerPhone && <p className="text-xs text-slate-400">{dev.developerPhone}</p>}
            {dev.developerEmail && <p className="text-xs text-slate-400">{dev.developerEmail}</p>}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp the developer
              </a>
            )}
            {mailHref && (
              <a
                href={mailHref}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-200 shadow-sm transition hover:border-emerald-400/40 hover:text-emerald-300"
              >
                <Mail className="h-4 w-4" /> Email the developer
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Pay / renew */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
          <CreditCard className="h-5 w-5 text-emerald-300" /> Pay / renew
        </h3>
        <p className="mt-1 text-sm text-slate-400">
          Activate or renew this installation's license online. Payment is confirmed by the gateway
          and the key is delivered instantly to the buyer's email / WhatsApp / SMS.
        </p>
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
          <p className="flex items-center justify-between">
            <span>License fee</span>
            <span className="font-bold text-slate-100">{dev.currency} {dev.price.toFixed(2)}</span>
          </p>
          {dev.momoPhones && (
            <p className="mt-1.5 flex items-center justify-between text-xs text-slate-400">
              <span>Direct Mobile Money</span>
              <span className="font-mono">{dev.momoPhones}</span>
            </p>
          )}
        </div>
        <div className="mt-4">
          <LicensePayPanel />
        </div>
      </div>

      {/* Payment history */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
          <History className="h-5 w-5 text-sky-400" /> License payments
        </h3>
        {data.history.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-white/15 p-5 text-center text-sm text-slate-500">
            No license payments yet. When a payment is confirmed, its receipts appear here.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="py-2 pr-4">Reference</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Method</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.history.map((h) => (
                  <tr key={h.reference} className="border-b border-white/5 last:border-0">
                    <td className="py-2.5 pr-4 font-mono text-xs text-slate-300">{h.reference}</td>
                    <td className="py-2.5 pr-4 font-semibold text-slate-100">GHS {h.amount.toFixed(2)}</td>
                    <td className="py-2.5 pr-4 text-slate-300">{h.method}{h.provider ? ` (${h.provider})` : ""}</td>
                    <td className="py-2.5 pr-4">
                      <Badge tone={h.status === "SUCCESS" ? "green" : h.status === "PENDING" ? "amber" : "red"}>
                        {h.status}
                      </Badge>
                    </td>
                    <td className="py-2.5 text-xs text-slate-400">{fmtDateTime(h.createdAt)}</td>
                    <td className="py-2.5 pl-3">
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`/api/license/receipt/${encodeURIComponent(h.reference)}/pdf`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-emerald-400/40 hover:text-emerald-300"
                          title="Download the receipt as a PDF file"
                        >
                          <FileDown className="h-3.5 w-3.5" /> PDF
                        </a>
                        <a
                          href={`/reports/print/license-receipt/${encodeURIComponent(h.reference)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-emerald-400/40 hover:text-emerald-300"
                          title="Open the A4 print view — Print / Save as PDF"
                        >
                          Print
                        </a>
                      </div>
                    </td>
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

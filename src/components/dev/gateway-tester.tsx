"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, PlugZap, XCircle } from "lucide-react";
import { api } from "@/lib/client";
import { Button } from "@/components/ui/button";

type Target = { method: "MOMO" | "PAYSTACK"; provider: string; label: string };

const TARGETS: Target[] = [
  { method: "MOMO", provider: "MTN", label: "MTN MoMo" },
  { method: "MOMO", provider: "AIRTELTIGO", label: "AirtelTigo" },
  { method: "MOMO", provider: "TELECEL", label: "Telecel" },
  { method: "PAYSTACK", provider: "PAYSTACK", label: "Paystack" },
];

type ProbeResult = { valid: boolean; message: string };

/** Developer console — test each saved gateway key against its provider. */
export function GatewayTester() {
  const [results, setResults] = useState<Record<string, ProbeResult | "busy">>({});

  const run = async (t: Target) => {
    setResults((r) => ({ ...r, [t.label]: "busy" }));
    try {
      const data = await api<ProbeResult>("/api/dev/test-gateway", {
        method: "POST",
        body: JSON.stringify({ method: t.method, provider: t.provider }),
      });
      setResults((r) => ({ ...r, [t.label]: data }));
    } catch (e) {
      setResults((r) => ({
        ...r,
        [t.label]: { valid: false, message: e instanceof Error ? e.message : "Test failed" },
      }));
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
        <PlugZap className="h-5 w-5 text-emerald-300" /> Test my gateway keys
      </h3>
      <p className="mt-1 text-sm text-slate-400">
        Validates each saved key against its provider (token exchange / balance check) — no payment is
        created and nobody is prompted. Sandbox MTN auto-provisions its API user, so a green test means
        license purchases will work end-to-end.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TARGETS.map((t) => {
          const res = results[t.label];
          return (
            <div key={t.label} className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-white">{t.label}</span>
                {res === "busy" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-sky-300" />
                ) : res ? (
                  res.valid ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-400" />
                  )
                ) : (
                  <span className="h-4 w-4" />
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={res === "busy"}
                onClick={() => run(t)}
                className="border-white/15 text-white hover:bg-white/10"
              >
                {res === "busy" ? "Testing…" : "Test key"}
              </Button>
              {res && res !== "busy" && (
                <p className={`text-xs leading-relaxed ${res.valid ? "text-emerald-300" : "text-rose-300"}`}>
                  {res.message}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, GraduationCap, KeyRound, Printer, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { ReportCardView } from "@/components/reports/report-card-view";
import type { ComputedReport } from "@/lib/report";

type Step = "lookup" | "otp" | "result";
type ReportPayload = {
  report: ComputedReport;
  schoolName: string;
  studentName: string;
  admissionNo: string;
  qrDataUrl: string;
  published: boolean;
  vacationDate?: string | null;
  reopeningDate?: string | null;
  termStartDate?: string | null;
  termEndDate?: string | null;
};

export function ResultChecker() {
  const [step, setStep] = useState<Step>("lookup");
  const [form, setForm] = useState({ admissionNo: "", phone: "" });
  const [requestId, setRequestId] = useState("");
  const [code, setCode] = useState("");
  const [payload, setPayload] = useState<ReportPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const res = await fetch("/api/results/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? "Could not request OTP.");
        return;
      }
      setRequestId(json.data.requestId);
      setNotice(json.data.message);
      setStep("otp");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/results/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, code, requestId }),
      });
      const json = await res.json();
      if (!json.ok) {
        setAttempts((a) => a + 1);
        setError(json.error ?? "Verification failed.");
        return;
      }
      setPayload(json.data);
      setStep("result");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <AnimatePresence mode="wait">
        {step === "lookup" && (
          <motion.div key="lookup" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
            <div className="card p-6 sm:p-10">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                  <GraduationCap className="h-7 w-7" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-ink">Check Results Securely</h2>
                  <p className="text-sm text-slate-500">Enter the student&apos;s details to receive a one-time password by SMS.</p>
                </div>
              </div>
              <form onSubmit={requestOtp} className="mt-8 space-y-5">
                <Field label="Admission / Index Number" hint="Found on the student's ID card or previous report card.">
                  <Input value={form.admissionNo} onChange={(e) => setForm({ ...form, admissionNo: e.target.value })} placeholder="e.g. GES-2024-0001" className="text-base" />
                </Field>
                <Field label="Registered Phone Number" hint="The phone number registered with the school office.">
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="e.g. 0244 000 000" className="text-base" />
                </Field>
                {error && <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}
                <Button type="submit" loading={busy} size="lg" className="w-full">
                  {busy ? "Sending OTP…" : "Request OTP via SMS"}
                </Button>
                <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
                  <ShieldCheck className="h-3.5 w-3.5" /> 6-digit OTP · valid for 5 minutes · every access is logged
                </p>
              </form>
            </div>
          </motion.div>
        )}

        {step === "otp" && (
          <motion.div key="otp" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
            <div className="card p-6 sm:p-10">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                  <KeyRound className="h-7 w-7" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-ink">Enter the 6-digit OTP</h2>
                  <p className="text-sm text-slate-500">
                    Sent to <span className="font-semibold text-slate-700">{form.phone.replace(/(\d{4})\d{4}(\d{2})/, "$1****$2")}</span>
                  </p>
                </div>
              </div>
              {notice && <p className="mt-6 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{notice}</p>}
              <form onSubmit={verify} className="mt-5 space-y-5">
                <Field label="One-time password" hint="Check your SMS. The code expires in 5 minutes.">
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="••••••"
                    inputMode="numeric"
                    autoFocus
                    className="text-center text-2xl tracking-[0.5em]"
                  />
                </Field>
                {error && <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button type="submit" loading={busy} size="lg" className="flex-1">
                    {busy ? "Verifying…" : "Verify & View Result"}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setStep("lookup")}>
                    Back
                  </Button>
                </div>
                <p className="text-center text-xs text-slate-400">
                  After 5 failed attempts, a new OTP must be requested. Max {attempts}/5 attempts used.
                </p>
              </form>
            </div>
          </motion.div>
        )}

        {step === "result" && payload && (
          <motion.div key="result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
                Verified successfully — {payload.studentName} ({payload.admissionNo})
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer className="h-4 w-4" /> Print / Save PDF (A4)
                </Button>
                <Button variant="ghost" onClick={() => { setStep("lookup"); setPayload(null); setCode(""); setRequestId(""); setAttempts(0); }}>
                  Check another result
                </Button>
              </div>
            </div>
            <ReportCardView
              report={payload.report}
              schoolName={payload.schoolName}
              qrDataUrl={payload.qrDataUrl}
              logo="/sms-logo.png"
              vacationDate={payload.vacationDate}
              reopeningDate={payload.reopeningDate}
              termStartDate={payload.termStartDate}
              termEndDate={payload.termEndDate}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

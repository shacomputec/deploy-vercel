"use client";

import { useState } from "react";
import { FileText, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/** Full-screen Terms & Conditions acceptance gate (admin portal). */
export function TermsGate({ content }: { content: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function accept() {
    setBusy(true);
    try {
      await api("/api/terms/accept", { method: "POST" });
      toast.toast({ title: "Terms accepted", description: "Welcome back — you can continue working.", variant: "success" });
      router.refresh();
    } catch (e) {
      toast.toast({ title: "Could not accept", description: (e as Error).message, variant: "error" });
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-accent/15 blur-3xl" />
      </div>
      <div className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl sm:p-10">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/30">
          <FileText className="h-8 w-8 text-primary-soft" />
        </span>
        <h1 className="mt-5 text-center text-2xl font-bold text-white">Terms & Conditions</h1>
        <p className="mt-2 text-center text-sm text-slate-300">
          The vendor has published a new version of the terms for using this system. Please read and
          accept them to continue.
        </p>

        <div className="mt-6 max-h-72 overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-5 text-sm leading-relaxed whitespace-pre-wrap text-slate-200">
          {content || "The vendor has not provided the text yet — contact your system developer."}
        </div>

        <div className="mt-6 flex flex-col items-center gap-3">
          <Button onClick={accept} loading={busy} className="w-full sm:w-auto">
            <ShieldCheck className="h-4 w-4" /> I accept these terms and conditions
          </Button>
          <p className="text-[11px] text-slate-500">
            Until you accept, access to the school administration is paused. Contact your system
            developer if you have questions.
          </p>
        </div>
      </div>
    </div>
  );
}

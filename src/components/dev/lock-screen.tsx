"use client";

import { AlertOctagon, Lock, Mail, Phone } from "lucide-react";
import { LicensePayPanel } from "@/components/dev/license-pay-panel";

/**
 * Full-screen enforcement gate. Activation is developer-only, so this screen
 * never offers a key field — blocked accounts see the reason and the
 * developer's contact. Only the developer (via the /dev console) can activate,
 * unlock or restore the license.
 */
export function LockScreen({
  systemLocked,
  message,
  licenseBlocked,
  developerContact,
}: {
  systemLocked: boolean;
  message: string;
  licenseBlocked: boolean;
  developerContact: { developerName?: string | null; developerPhone?: string | null; developerEmail?: string | null };
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-rose-500/15 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
      </div>
      <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-xl sm:p-10">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/15 ring-1 ring-rose-500/30">
          {systemLocked ? <Lock className="h-8 w-8 text-rose-400" /> : <AlertOctagon className="h-8 w-8 text-amber-400" />}
        </span>
        <h1 className="mt-5 text-2xl font-bold text-white">
          {systemLocked ? "System locked" : licenseBlocked ? "License required" : "System locked"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">{message}</p>

        {!systemLocked && licenseBlocked && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 text-left">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Activate your license</p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
              Choose how you want to pay — Paystack (online) or direct mobile money to the developer.
              No API keys or technical details are shown; the developer activates your license once
              payment is confirmed.
            </p>
            <div className="mt-4">
              <LicensePayPanel />
            </div>
          </div>
        )}

        {(developerContact.developerName || developerContact.developerPhone || developerContact.developerEmail) && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Contact your system developer</p>
            <div className="mt-2 space-y-1.5 text-sm text-slate-200">
              {developerContact.developerName && <p className="font-semibold text-white">{developerContact.developerName}</p>}
              {developerContact.developerPhone && (
                <a href={`tel:${String(developerContact.developerPhone).replace(/\s/g, "")}`} className="flex items-center gap-2 hover:text-white"><Phone className="h-3.5 w-3.5 text-primary-soft" /> {developerContact.developerPhone}</a>
              )}
              {developerContact.developerEmail && (
                <a href={`mailto:${developerContact.developerEmail}`} className="flex items-center gap-2 break-all hover:text-white"><Mail className="h-3.5 w-3.5 text-primary-soft" /> {developerContact.developerEmail}</a>
              )}
            </div>
          </div>
        )}

        <p className="mt-6 text-[11px] text-slate-500">
          Powered by shacomputec · shacomputecgh@gmail.com · +233 530 941 750
        </p>
      </div>
    </div>
  );
}

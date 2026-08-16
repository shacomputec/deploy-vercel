"use client";

import { useCallback, useEffect, useState } from "react";
import { Lightbulb, Loader2, MessageSquare, Send, X } from "lucide-react";
import { api } from "@/lib/client";
import { useToast } from "@/components/ui/toast";

const CATEGORIES = [
  ["FEATURE", "New feature idea"],
  ["BUG", "Something isn't working"],
  ["IMPROVEMENT", "Make it better"],
  ["OTHER", "Anything else"],
] as const;

/**
 * The in-app suggestion box — a floating button (bottom-right) that any
 * signed-in user can open to send feedback to the developer. Especially
 * visible during the trial. Suggestions are stored server-side and reviewed
 * in the Developer Console → Feedback tab.
 */
export function SuggestionBox() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number][0]>("FEATURE");
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);

  // The launcher is extra prominent during the trial — read the license status.
  useEffect(() => {
    api<{ status?: string; trialDaysLeft?: number | null }>("/api/license")
      .then((l) => setTrialDaysLeft(l.status === "TRIAL" ? (l.trialDaysLeft ?? 0) : null))
      .catch(() => {});
  }, []);

  // Close with the Escape key.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/suggestions", {
        method: "POST",
        body: JSON.stringify({ category, message, contact }),
      });
      toast.toast({ title: "Thank you! 💡", description: "Your suggestion was sent to the developer.", variant: "success" });
      setOpen(false);
      setMessage("");
      setContact("");
      setCategory("FEATURE");
    } catch (err) {
      toast.toast({ title: "Could not send", description: (err as Error).message, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  const isTrial = typeof trialDaysLeft === "number" && trialDaysLeft > 0;

  return (
    <>
      {/* Floating launcher */}
      <button
        onClick={() => setOpen(true)}
        title="Send a suggestion to the developer"
        className={`no-print fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-bold text-white shadow-xl transition-all hover:scale-105 ${
          isTrial
            ? "bg-gradient-to-r from-amber-500 to-orange-600 shadow-amber-500/40"
            : "bg-gradient-to-r from-primary to-primary-deep shadow-primary/30"
        }`}
      >
        {isTrial ? <Lightbulb className="h-4 w-4 animate-pulse" /> : <MessageSquare className="h-4 w-4" />}
        {isTrial ? "Trial — send feedback" : "Suggestion"}
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white/95 px-6 py-4 backdrop-blur">
              <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-700">
                <Lightbulb className="h-4 w-4 text-amber-500" /> Send a suggestion
              </p>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={send} className="space-y-4 p-6">
              {isTrial && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  💡 You're on trial — this is the perfect time to tell the developer what to add or fix.
                  Suggestions are read by the developer and shape future updates.
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">What is it about?</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCategory(val)}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                        category === val
                          ? "border-primary bg-primary-soft text-primary shadow-sm"
                          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Your idea *</label>
                <textarea
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g. It would help if reports could also be exported as Excel…"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Your contact (optional) <span className="font-normal normal-case text-slate-400">— so the developer can reply</span>
                </label>
                <input
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="email or phone"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100">
                  Cancel
                </button>
                <button type="submit" disabled={busy} className="btn-primary justify-center">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send suggestion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

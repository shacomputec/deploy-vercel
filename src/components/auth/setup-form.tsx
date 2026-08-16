"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { SCHOOL_TYPES, type SchoolType } from "@/lib/school-type";

export function SetupForm() {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirm: "", schoolType: "BOTH" as SchoolType });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? "Setup failed.");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">What type of school are you managing?</p>
        <div className="grid gap-2">
          {SCHOOL_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setForm((f) => ({ ...f, schoolType: t.value }))}
              className={`flex items-start gap-3 rounded-xl border-2 px-4 py-3 text-left transition ${form.schoolType === t.value ? "border-primary bg-primary/5" : "border-slate-200 hover:border-slate-300"}`}
            >
              <span className="text-2xl">{t.icon}</span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-slate-800">{t.label}</span>
                <span className="block text-xs text-slate-500">{t.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
      <Field label="Full name">
        <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="e.g. Shacomputec" />
      </Field>
      <Field label="Email address">
        <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="developer@example.com" />
      </Field>
      <Field label="Password" hint="At least 8 characters. Keep it safe — it unlocks the whole system.">
        <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
      </Field>
      <Field label="Confirm password">
        <Input type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} placeholder="••••••••" />
      </Field>
      {error && <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}
      <Button type="submit" loading={busy} className="w-full" size="lg">
        <ShieldCheck className="h-5 w-5" /> Create Developer Account
      </Button>
    </form>
  );
}

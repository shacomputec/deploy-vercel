"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IdCard, KeyRound, Lock, Mail, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { ROLE_LABELS, type LoginRole } from "@/components/auth/role-picker";
import { useLanguage } from "@/lib/i18n/client";

/** Staff roles sign in with their Staff ID (assigned by the admin); everyone
 * else uses email. */
function modeForRole(role?: LoginRole | null): "email" | "staff" {
  if (!role) return "email";
  return role === "super_admin" || role === "admin" || role === "student" || role === "parent"
    ? "email"
    : "staff";
}

export function LoginForm({ presetRole = null }: { presetRole?: LoginRole | null }) {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useLanguage();
  const [mode, setMode] = useState<"email" | "staff">(modeForRole(presetRole));

  // When the caller picks a role on the login page, switch the credential mode
  // to match (staff roles → Staff ID, everyone else → email).
  useEffect(() => {
    setMode(modeForRole(presetRole));
    setError(null);
  }, [presetRole]);
  const [step, setStep] = useState<"password" | "2fa">("password");
  const [form, setForm] = useState({ email: "", password: "" });
  const [tempToken, setTempToken] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Route each role to exactly the right portal after sign-in:
  //   developer     → the Developer Console (/dev) — never the admin portal
  //   teachers      → the Teacher Portal (class work, marks, profile)
  //   students      → the Student Portal (results, attendance)
  //   parents       → the Parent Portal (wards' progress)
  //   guests        → the public website
  //   all admin-side staff (super admin, admin, headteacher, secretary,
  //   accountant, nurse, …) → the admin portal, where each page enforces its
  //   own permission grants (super_admin = every system setting).
  function routeByRole(role: string) {
    if (role === "developer") router.push("/dev");
    else if (role === "student") router.push("/portal/student");
    else if (role === "parent") router.push("/portal/parent");
    else if (["teacher", "subject_teacher", "form_teacher"].includes(role)) router.push("/portal/teacher");
    else if (role === "guest") router.push("/");
    else router.push("/admin");
    router.refresh();
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      // Staff ID sign-in: username is the Staff ID, password is the one the
      // administrator assigned (default = the Staff ID itself).
      const res = await fetch(mode === "staff" ? "/api/auth/staff-login" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "staff" ? { staffId: form.email, password: form.password } : form,
        ),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? "Login failed.");
        return;
      }
      if (json.data.requiresTwoFactor) {
        setTempToken(json.data.tempToken);
        setStep("2fa");
        return;
      }
      routeByRole(json.data.role);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submit2fa(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempToken, code }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? "Verification failed.");
        return;
      }
      routeByRole(json.data.role);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (params.get("denied")) {
    return (
      <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
        Your account does not have access to that area. Please sign in with an account that does.
      </p>
    );
  }

  if (step === "2fa") {
    return (
      <form onSubmit={submit2fa} className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl bg-primary-soft/60 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p className="text-sm text-slate-600">
            Two-factor authentication is enabled for this account. Enter the 6-digit code from your authenticator app.
          </p>
        </div>
        <Field label="Authentication code">
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              inputMode="numeric"
              autoFocus
              className="pl-9 text-center text-2xl tracking-[0.4em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••"
            />
          </div>
        </Field>
        {error && <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}
        <Button type="submit" loading={busy} className="w-full" size="lg">
          {busy ? "Verifying…" : "Verify & Sign In"}
        </Button>
        <button type="button" className="w-full text-center text-xs text-slate-400 hover:text-slate-600" onClick={() => { setStep("password"); setTempToken(""); setCode(""); }}>
          Back to sign in
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={submitPassword} className="space-y-5">
      {presetRole && (
        <p className="flex items-center gap-1.5 rounded-lg bg-primary-soft/60 px-3 py-2 text-xs font-semibold text-primary">
          <UserRound className="h-3.5 w-3.5" />
          {t("login.signingInAs")} {ROLE_LABELS[presetRole]}
        </p>
      )}
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => { setMode("email"); setError(null); }}
          className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${mode === "email" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          <Mail className="h-3.5 w-3.5" /> {t("login.email")}
        </button>
        <button
          type="button"
          onClick={() => { setMode("staff"); setError(null); }}
          className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${mode === "staff" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          <IdCard className="h-3.5 w-3.5" /> {t("login.staffId")}
        </button>
      </div>

      {mode === "email" ? (
        <Field label={t("login.usernameOrEmail")}>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input autoComplete="username" className="pl-9" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="shacomputec or you@school.edu.gh" />
          </div>
        </Field>
      ) : (
        <Field label={t("login.staffId")}>
          <div className="relative">
            <IdCard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input autoCapitalize="characters" className="pl-9 font-mono uppercase" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="e.g. TCH-0012" />
          </div>
        </Field>
      )}
      <Field label={t("login.password")}>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input type="password" autoComplete="current-password" className="pl-9" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
        </div>
      </Field>
      {error && <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}
      <Button type="submit" loading={busy} className="w-full" size="lg">
        {busy ? "…" : t("login.signIn")}
      </Button>
      <p className="text-center text-xs text-slate-400">
        {mode === "staff" ? t("login.staffHint") : t("login.portalHint")}
      </p>
    </form>
  );
}

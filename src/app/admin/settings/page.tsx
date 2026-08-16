"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Lock, Palette, Save, Settings2, Bell, UserCog, Send, CheckCircle2, XCircle, Sparkles, FileText as FileTextIcon } from "lucide-react";
import { api } from "@/lib/client";
import { SCHOOL_TYPES, type SchoolType } from "@/lib/school-type";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/admin/page-header";
import { useToast } from "@/components/ui/toast";

type School = {
  name: string; schoolType: SchoolType; shortName: string | null; motto: string | null; vision: string | null;
  mission: string | null; history: string | null; welcomeMessage: string | null;
  logo: string | null;
  primaryColor: string | null; accentColor: string | null; phone: string | null;
  email: string | null; address: string | null; district: string | null; region: string | null;
  locationName: string | null; mapLat: string | null; mapLng: string | null;
  facebook: string | null; twitter: string | null; instagram: string | null; whatsapp: string | null; youtube: string | null;
  developerName: string | null; developerPhone: string | null; developerEmail: string | null;
};

const empty: School = {
  name: "", schoolType: "BOTH", shortName: "", motto: "", vision: "", mission: "", history: "", welcomeMessage: "",
  logo: "",
  primaryColor: "#047857", accentColor: "#d97706", phone: "", email: "", address: "",
  district: "", region: "", locationName: "", mapLat: "", mapLng: "",
  facebook: "", twitter: "", instagram: "", whatsapp: "", youtube: "",
  developerName: "", developerPhone: "", developerEmail: "",
};

type Tab = "school" | "notifications" | "system";

export default function SettingsPage() {
  const toast = useToast();
  const [form, setForm] = useState<School>(empty);
  const [sys, setSys] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<Tab>("school");
  const [saving, setSaving] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwBusy, setPwBusy] = useState(false);
  const wmSetting = (() => {
    try {
      const v = JSON.parse(sys["report.watermark"] ?? "");
      return { enabled: v.enabled !== false, opacity: typeof v.opacity === "number" ? v.opacity : 0.05 };
    } catch {
      return { enabled: true, opacity: 0.05 };
    }
  })();
  const [testForm, setTestForm] = useState({ phone: "", email: "" });
  const [testBusy, setTestBusy] = useState(false);
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; detail?: string }> | null>(null);

  const load = useCallback(async () => {
    try {
      const [school, settings] = await Promise.all([
        api<School>("/api/school"),
        api<{ key: string; value: string }[]>("/api/settings"),
      ]);
      setForm({ ...empty, ...school });
      setSys(Object.fromEntries(settings.map((s) => [s.key, s.value ?? ""])));
    } catch (e) {
      toast.toast({ title: "Failed to load", description: (e as Error).message, variant: "error" });
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function saveSchool(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/api/school", { method: "PUT", body: JSON.stringify(form) });
      toast.toast({ title: "School profile saved", description: "The website theme updates immediately.", variant: "success" });
    } catch (e) {
      toast.toast({ title: "Save failed", description: (e as Error).message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function saveSystem(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const entries = Object.entries(sys).map(([key, value]) => ({ key, value }));
      await api("/api/settings", { method: "PUT", body: JSON.stringify(entries) });
      toast.toast({ title: "Settings saved", variant: "success" });
    } catch (e) {
      toast.toast({ title: "Save failed", description: (e as Error).message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwBusy(true);
    try {
      if (pw.next !== pw.confirm) throw new Error("New passwords do not match.");
      await api("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.next }),
      });
      toast.toast({ title: "Password changed", description: "Use your new password next time you sign in.", variant: "success" });
      setPw({ current: "", next: "", confirm: "" });
    } catch (e) {
      toast.toast({ title: "Change failed", description: (e as Error).message, variant: "error" });
    } finally {
      setPwBusy(false);
    }
  }

  const set = (patch: Partial<School>) => setForm((f) => ({ ...f, ...patch }));

  async function sendTest(e: React.FormEvent) {
    e.preventDefault();
    setTestBusy(true);
    setTestResult(null);
    try {
      const res = await api<{ results: Record<string, { ok: boolean; detail?: string }> }>("/api/notify/test", {
        method: "POST",
        body: JSON.stringify({ to: testForm.phone || undefined, emailTo: testForm.email || undefined }),
      });
      setTestResult(res.results);
      toast.toast({
        title: "Test sent",
        description: "Check the per-channel results below.",
        variant: Object.values(res.results).every((r) => r.ok) ? "success" : "error",
      });
    } catch (e) {
      toast.toast({ title: "Test failed", description: (e as Error).message, variant: "error" });
    } finally {
      setTestBusy(false);
    }
  }

  // NOTE: the Developer's sales configuration (trial days, activation fee,
  // MoMo numbers) is NOT here — it lives in the Developer console at /dev,
  // which no admin can reach.
  const TABS: [Tab, string, React.ReactNode][] = [
    ["school", "School & Theme", <Palette key="s" className="h-4 w-4" />],
    ["notifications", "Notifications", <Bell key="n" className="h-4 w-4" />],
    ["system", "System", <Settings2 key="t" className="h-4 w-4" />],
  ];
  const activeTab = tab;

  return (
    <div>
      <PageHeader title="School & Settings" subtitle="Everything is editable without touching source code — colours restyle the whole site." />

      {/* License activation — buyer pays here; the developer console is never shown in the admin portal. */}
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-5 py-4 shadow-sm">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
          <KeyRound className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">License &amp; Activation</p>
          <p className="text-xs text-slate-500">
            Remove the trial countdown — activate by paying securely online or by mobile money. This opens the
            payment screen; the developer console is never shown in the admin portal.
          </p>
        </div>
        <a href="/admin/activate" className="btn-primary btn-sm">
          <KeyRound className="h-4 w-4" /> Pay / Activate
        </a>
      </div>

      <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
        {TABS.map(([key, label, icon]) => (
          <button key={key} onClick={() => setTab(key)} className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === key ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50"}`}>
            {icon} {label}
          </button>
        ))}
      </div>

      {activeTab === "school" && (
        <form onSubmit={saveSchool} className="card max-w-3xl space-y-6 p-6 sm:p-8">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-ink"><Palette className="h-5 w-5 text-primary" /> Identity & Theme</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <p className="mb-2 text-sm font-semibold text-slate-700">School type (management engine)</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {SCHOOL_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => set({ schoolType: t.value })}
                      className={`flex items-start gap-2 rounded-xl border-2 px-3 py-2.5 text-left transition ${form.schoolType === t.value ? "border-primary bg-primary/5" : "border-slate-200 hover:border-slate-300"}`}
                    >
                      <span className="text-xl">{t.icon}</span>
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-slate-800">{t.label}</span>
                        <span className="block text-[11px] text-slate-500">{t.desc}</span>
                      </span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  BASIC shows the Crèche–JHS engine (SBA/BECE), SHS shows SHS 1–3 with programmes, electives and WASSCE. BOTH runs everything.
                </p>
              </div>
              <Field label="School name *"><Input required value={form.name} onChange={(e) => set({ name: e.target.value })} /></Field>
              <Field label="Short name"><Input value={form.shortName ?? ""} onChange={(e) => set({ shortName: e.target.value })} /></Field>
              <Field label="Motto"><Input value={form.motto ?? ""} onChange={(e) => set({ motto: e.target.value })} /></Field>
              <Field label="Login screen logo (URL)" hint="Shown on the portal login page. Your school's own logo goes here."><Input value={form.logo ?? ""} onChange={(e) => set({ logo: e.target.value })} placeholder="/login-screen.jpg" /></Field>
              <Field label="Primary colour">
                <div className="flex items-center gap-3">
                  <input type="color" value={form.primaryColor ?? "#047857"} onChange={(e) => set({ primaryColor: e.target.value })} className="h-10 w-14 cursor-pointer rounded-lg border border-slate-300" />
                  <Input value={form.primaryColor ?? ""} onChange={(e) => set({ primaryColor: e.target.value })} />
                </div>
              </Field>
              <Field label="Accent colour">
                <div className="flex items-center gap-3">
                  <input type="color" value={form.accentColor ?? "#d97706"} onChange={(e) => set({ accentColor: e.target.value })} className="h-10 w-14 cursor-pointer rounded-lg border border-slate-300" />
                  <Input value={form.accentColor ?? ""} onChange={(e) => set({ accentColor: e.target.value })} />
                </div>
              </Field>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-ink">Story</h3>
            <div className="mt-4 space-y-4">
              <Field label="Vision"><Textarea rows={3} value={form.vision ?? ""} onChange={(e) => set({ vision: e.target.value })} /></Field>
              <Field label="Mission"><Textarea rows={3} value={form.mission ?? ""} onChange={(e) => set({ mission: e.target.value })} /></Field>
              <Field label="History"><Textarea rows={4} value={form.history ?? ""} onChange={(e) => set({ history: e.target.value })} /></Field>
              <Field label="Headteacher's welcome message"><Textarea rows={3} value={form.welcomeMessage ?? ""} onChange={(e) => set({ welcomeMessage: e.target.value })} /></Field>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-ink">Contact & Location</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Phone"><Input value={form.phone ?? ""} onChange={(e) => set({ phone: e.target.value })} /></Field>
              <Field label="Email"><Input value={form.email ?? ""} onChange={(e) => set({ email: e.target.value })} /></Field>
              <Field label="Address"><Input value={form.address ?? ""} onChange={(e) => set({ address: e.target.value })} /></Field>
              <Field label="Location name (map search)"><Input value={form.locationName ?? ""} onChange={(e) => set({ locationName: e.target.value })} /></Field>
              <Field label="District"><Input value={form.district ?? ""} onChange={(e) => set({ district: e.target.value })} /></Field>
              <Field label="Region"><Input value={form.region ?? ""} onChange={(e) => set({ region: e.target.value })} /></Field>
              <Field label="Map latitude"><Input value={form.mapLat ?? ""} onChange={(e) => set({ mapLat: e.target.value })} /></Field>
              <Field label="Map longitude"><Input value={form.mapLng ?? ""} onChange={(e) => set({ mapLng: e.target.value })} /></Field>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-ink">Social Media</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {(["facebook", "twitter", "instagram", "youtube", "whatsapp"] as const).map((k) => (
                <Field key={k} label={k.charAt(0).toUpperCase() + k.slice(1)}>
                  <Input value={(form[k] as string | null) ?? ""} onChange={(e) => set({ [k]: e.target.value })} placeholder={k === "whatsapp" ? "+233 24 000 0000" : `https://${k}.com/…`} />
                </Field>
              ))}
            </div>
          </div>

          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-ink"><UserCog className="h-5 w-5 text-primary" /> Developer / Support contact</h3>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><Lock className="h-3.5 w-3.5 text-primary" /> Fixed by the system developer — shown on the license activation screen for support. Cannot be edited.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Developer name</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-800">{form.developerName || "—"}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Developer phone</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-800">{form.developerPhone || "—"}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Developer email</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-800">{form.developerEmail || "—"}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" loading={saving}><Save className="h-4 w-4" /> Save School Profile</Button>
          </div>
        </form>
      )}

      {activeTab === "notifications" && (
        <form onSubmit={saveSystem} className="card max-w-3xl space-y-5 p-6 sm:p-8">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-ink"><Bell className="h-5 w-5 text-primary" /> Notifications</h3>
          <p className="text-sm text-slate-500">
            These are <strong>your school's own channel credentials</strong> — set up your own email, WhatsApp and SMS
            accounts here and every OTP, receipt and broadcast goes out through them. The system developer's own keys
            are separate and are never used for your school's messages.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email mode" hint="console (dev log) | resend (live)">
              <Input value={sys["notify.email.mode"] ?? (process.env.NODE_ENV === "development" ? "console" : "resend")} onChange={(e) => setSys({ ...sys, "notify.email.mode": e.target.value })} />
            </Field>
            <Field label="Resend API key (email)" hint="Your resend.com key — masked once saved">
              <Input type="password" value={sys["notify.email.apiKey"] ?? ""} onChange={(e) => setSys({ ...sys, "notify.email.apiKey": e.target.value })} placeholder="re_…" autoComplete="off" />
            </Field>
            <Field label="Email from address" hint="Shown as the sender on outgoing emails">
              <Input value={sys["notify.email.from"] ?? "GES School MIS <onboarding@resend.dev>"} onChange={(e) => setSys({ ...sys, "notify.email.from": e.target.value })} placeholder="School <mail@yourschool.com>" />
            </Field>
            <Field label="WhatsApp mode" hint="off | twilio (needs a Twilio WhatsApp sender)">
              <Input value={sys["notify.whatsapp.mode"] ?? "off"} onChange={(e) => setSys({ ...sys, "notify.whatsapp.mode": e.target.value })} />
            </Field>
            <Field label="WhatsApp account SID (Twilio)">
              <Input type="password" value={sys["notify.whatsapp.sid"] ?? ""} onChange={(e) => setSys({ ...sys, "notify.whatsapp.sid": e.target.value })} placeholder="AC…" autoComplete="off" />
            </Field>
            <Field label="WhatsApp auth token (Twilio)">
              <Input type="password" value={sys["notify.whatsapp.token"] ?? ""} onChange={(e) => setSys({ ...sys, "notify.whatsapp.token": e.target.value })} placeholder="Your Twilio auth token" autoComplete="off" />
            </Field>
            <Field label="WhatsApp sender number" hint="e.g. whatsapp:+14155238886">
              <Input value={sys["notify.whatsapp.from"] ?? ""} onChange={(e) => setSys({ ...sys, "notify.whatsapp.from": e.target.value })} placeholder="whatsapp:+…" />
            </Field>
            <Field label="SMS mode" hint="console (dev log) | smsonlinegh | hubtel | twilio">
              <Input value={sys["sms.mode"] ?? "console"} onChange={(e) => setSys({ ...sys, "sms.mode": e.target.value })} />
            </Field>
            <Field label="SMSOnlineGH API key" hint="Your smsonlinegh.com key — masked once saved">
              <Input type="password" value={sys["sms.smsonlinegh.apiKey"] ?? ""} onChange={(e) => setSys({ ...sys, "sms.smsonlinegh.apiKey": e.target.value })} placeholder="Your smsonlinegh.com API key" autoComplete="off" />
            </Field>
            <Field label="SMSOnlineGH sender ID" hint="Must be registered in your smsonlinegh.com account (SMS Messaging → Sender Names), max 11 chars">
              <Input value={sys["sms.smsonlinegh.sender"] ?? "GESSMIS"} onChange={(e) => setSys({ ...sys, "sms.smsonlinegh.sender": e.target.value })} placeholder="GESSMIS" />
            </Field>
            <Field label="Hubtel API key (SMS)">
              <Input type="password" value={sys["sms.hubtel.apiKey"] ?? ""} onChange={(e) => setSys({ ...sys, "sms.hubtel.apiKey": e.target.value })} placeholder="Your Hubtel key" autoComplete="off" />
            </Field>
            <Field label="Twilio SMS account SID">
              <Input type="password" value={sys["sms.twilio.sid"] ?? ""} onChange={(e) => setSys({ ...sys, "sms.twilio.sid": e.target.value })} placeholder="AC…" autoComplete="off" />
            </Field>
            <Field label="Twilio SMS auth token">
              <Input type="password" value={sys["sms.twilio.token"] ?? ""} onChange={(e) => setSys({ ...sys, "sms.twilio.token": e.target.value })} placeholder="Your Twilio auth token" autoComplete="off" />
            </Field>
            <Field label="Twilio SMS sender number">
              <Input value={sys["sms.twilio.from"] ?? ""} onChange={(e) => setSys({ ...sys, "sms.twilio.from": e.target.value })} placeholder="+1…" />
            </Field>
          </div>

          {/* live channel tester */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-slate-800"><Send className="h-4 w-4 text-primary" /> Send a live test notification</p>
            <p className="mt-1 text-xs text-slate-500">Fires a message through email, WhatsApp and SMS with the real providers and reports each channel's result — perfect for verifying keys after setup. Leave a field empty to use the school/developer contact from the profile.</p>
            <form onSubmit={sendTest} className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="To phone (WhatsApp + SMS)"><Input value={testForm.phone} onChange={(e) => setTestForm({ ...testForm, phone: e.target.value })} placeholder="+233 2XX XXX XXX" inputMode="tel" /></Field>
              <Field label="To email"><Input value={testForm.email} onChange={(e) => setTestForm({ ...testForm, email: e.target.value })} placeholder="recipient@example.com" /></Field>
              <div className="sm:col-span-2"><Button type="submit" loading={testBusy}><Send className="h-4 w-4" /> Send test now</Button></div>
            </form>
            {testResult && (
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {Object.entries(testResult).map(([ch, r]) => (
                  <div key={ch} className={`rounded-lg px-3 py-2 text-xs font-medium ring-1 ${r.ok ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-rose-200"}`}>
                    <p className="flex items-center gap-1.5 font-bold uppercase tracking-wide">
                      {r.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />} {ch}
                    </p>
                    <p className="mt-1 font-normal normal-case">{r.detail || (r.ok ? "sent" : "failed")}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-700">
            Providers: <strong>Resend</strong> for email, <strong>Twilio</strong> for WhatsApp and SMS, and Ghana's
            <strong> SMSOnlineGH</strong> / <strong>Hubtel</strong> for SMS — all configured with your own keys right here.
            Keys are masked once saved (paste a new value to replace yours). Without any keys, console mode logs
            everything to the server — nothing breaks. <strong>Trial-account checklist (one-time, in Twilio Console):</strong> ①
            <em>Phone Numbers → Verified Caller IDs → Add</em> and verify the numbers you'll message. ② WhatsApp: text
            <code className="rounded bg-white px-1">join ⟨code⟩</code> from that phone to the sandbox number under <em>WhatsApp → Sandbox</em>.
            ③ For real SMS, claim a Twilio number and set it above (or use SMSOnlineGH / Hubtel in Ghana). Resend test mode
            only delivers to your verified address until you add a domain at <em>resend.com/domains</em>.
          </p>
          <div className="flex justify-end">
            <Button type="submit" loading={saving}><Save className="h-4 w-4" /> Save Notification Settings</Button>
          </div>
        </form>
      )}

      {activeTab === "system" && (
        <form onSubmit={saveSystem} className="card max-w-3xl space-y-5 p-6 sm:p-8">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-ink"><Settings2 className="h-5 w-5 text-primary" /> System Settings</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="OTP lifetime (seconds)" hint="Result-checker OTP validity (default 300 = 5 min)">
              <Input type="number" value={sys["result.otp.ttlSeconds"] ?? "300"} onChange={(e) => setSys({ ...sys, "result.otp.ttlSeconds": e.target.value })} />
            </Field>
            <Field label="Max OTP attempts" hint="Before a new code is required (default 5)">
              <Input type="number" value={sys["result.otp.maxAttempts"] ?? "5"} onChange={(e) => setSys({ ...sys, "result.otp.maxAttempts": e.target.value })} />
            </Field>
            <Field label="JHS weighting: SBA %" hint="School-Based Assessment share of the total (JHS default 50)">
              <Input type="number" min="0" max="100" value={JSON.parse(sys["weighting.jhs"] ?? '{"sba":50,"exam":50}').sba} onChange={(e) => { try { const v = JSON.parse(sys["weighting.jhs"] ?? '{"sba":50,"exam":50}'); setSys({ ...sys, "weighting.jhs": JSON.stringify({ ...v, sba: Number(e.target.value), exam: 100 - Number(e.target.value) }) }); } catch { /* ignore */ } }} />
            </Field>
            <Field label="SHS weighting: SBA %" hint="SHS default 50 (exam gets the remainder)">
              <Input type="number" min="0" max="100" value={JSON.parse(sys["weighting.shs"] ?? '{"sba":50,"exam":50}').sba} onChange={(e) => { try { const v = JSON.parse(sys["weighting.shs"] ?? '{"sba":50,"exam":50}'); setSys({ ...sys, "weighting.shs": JSON.stringify({ ...v, sba: Number(e.target.value), exam: 100 - Number(e.target.value) }) }); } catch { /* ignore */ } }} />
            </Field>
            <Field label="SMS mode" hint="console (dev) | smsonlinegh | hubtel | twilio">
              <Input value={sys["sms.mode"] ?? "console"} onChange={(e) => setSys({ ...sys, "sms.mode": e.target.value })} />
            </Field>
            <Field label="Kaya AI mode" hint="offline (built-in, no key needed) | openai">
              <Input value={sys["ai.mode"] ?? "offline"} onChange={(e) => setSys({ ...sys, "ai.mode": e.target.value })} />
            </Field>
          </div>

          {/* First-run tours — school-wide master switch for the welcome tours */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-slate-800"><Sparkles className="h-4 w-4 text-primary" /> First-run tours</p>
            <p className="mt-1 text-xs text-slate-500">Welcome tours guide new Super Admins, Admins, Teachers, Parents and Students the first time they sign in. Turn them off here if your staff already know the system — each tour can still be replayed from its portal header afterwards.</p>
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setSys({ ...sys, "tours.enabled": sys["tours.enabled"] === "0" ? "1" : "0" })}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${sys["tours.enabled"] !== "0" ? "bg-primary-soft text-primary" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}
              >
                <CheckCircle2 className="h-4 w-4" /> {sys["tours.enabled"] !== "0" ? "First-run tours ON" : "First-run tours OFF"}
              </button>
            </div>
          </div>

          {/* Report card watermark — admin-tunable faintness of the school logo on printed cards */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-slate-800"><FileTextIcon className="h-4 w-4 text-primary" /> Report card watermark</p>
            <p className="mt-1 text-xs text-slate-500">The school logo sits faintly behind the writing on every printed report card. Set the strength here (0% = hidden, ~5% is the recommended faint look). Applies to screen previews, the bulk print page and parent PDF downloads.</p>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => setSys({ ...sys, "report.watermark": JSON.stringify({ ...wmSetting, enabled: !wmSetting.enabled }) })}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${wmSetting.enabled ? "bg-primary-soft text-primary" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}
              >
                <CheckCircle2 className="h-4 w-4" /> {wmSetting.enabled ? "Watermark shown" : "Watermark hidden"}
              </button>
              <label className="flex min-w-64 flex-1 items-center gap-3 text-sm font-medium text-slate-700">
                Strength
                <input
                  type="range" min="1" max="10" step="1"
                  value={Math.round((wmSetting.opacity || 0) * 100)}
                  onChange={(e) => setSys({ ...sys, "report.watermark": JSON.stringify({ ...wmSetting, enabled: true, opacity: Number(e.target.value) / 100 }) })}
                  disabled={!wmSetting.enabled}
                  className="flex-1 accent-emerald-600"
                />
                <span className="w-12 rounded-md bg-white px-2 py-1 text-center text-xs font-bold text-slate-700 ring-1 ring-slate-200">{Math.round((wmSetting.opacity || 0) * 100)}%</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" loading={saving}><Save className="h-4 w-4" /> Save Settings</Button>
          </div>
        </form>
      )}

      <div className="card mt-6 max-w-3xl p-6 sm:p-8">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-ink"><KeyRound className="h-5 w-5 text-primary" /> Change my password</h3>
        <p className="mt-1 text-sm text-slate-500">Rotate your own credentials anytime — the change applies across web, desktop and mobile (one shared account).</p>
        <form onSubmit={changePassword} className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Current password"><Input type="password" required value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" /></Field>
          <Field label="New password"><Input type="password" required value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} placeholder="At least 8 characters" autoComplete="new-password" /></Field>
          <Field label="Confirm new password"><Input type="password" required value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" /></Field>
          <div className="flex justify-end sm:col-span-3">
            <Button type="submit" loading={pwBusy}><KeyRound className="h-4 w-4" /> Update Password</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

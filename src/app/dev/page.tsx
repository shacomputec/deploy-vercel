"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpenText, CalendarPlus, CheckCircle2, Eraser, FileText, History, KeyRound, LayoutDashboard, Lightbulb, Loader2, Lock, MessageSquareText, PlusCircle, Save, School, Send, Trash2, Unlock, Upload, Wrench } from "lucide-react";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { api } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { LicensingConsole } from "@/components/dev/licensing-console";
import { LicenseDashboard } from "@/components/dev/license-dashboard";
import { GatewayTester } from "@/components/dev/gateway-tester";

type Tab = "licensing" | "license" | "terms" | "releases" | "schools" | "samples" | "feedback" | "reset";

type Gate = {
  systemLocked: boolean;
  lockMessage: string;
  schoolId: string;
  licenseBlocked: boolean;
  termsVersion: string;
  termsContent: string;
  termsAcceptedVersion: string;
  needsTermsAcceptance: boolean;
};

type SalesConfig = { trialDays: string; price: string; priceBasic: string; priceShs: string; currency: string; momoPhones: string; monthlyGoal: string; freeSchools: string };

type DevKeys = Record<string, string>;

type Release = { version: string; title: string; notes: string[]; date: string };

type Suggestion = { id: string; category: string; message: string; contact: string | null; status: string; createdAt: string; user: { fullName: string; email: string } };

type SalesReport = {
  rows: { month: string; label: string; count: number; revenue: number; byMethod: { method: string; count: number; revenue: number }[] }[];
  years: { year: string; count: number; revenue: number }[];
  totalRevenue: number;
  totalSales: number;
  currentMonth: { month: string; label: string; count: number; revenue: number };
  cashbook: { reference: string; buyer: string; method: string; provider: string | null; amount: number; date: string }[];
  monthlyEmailSent: boolean;
};
type FollowupChannels = "SMS" | "WHATSAPP" | "EMAIL";

type AbandonedPurchase = {
  id: string;
  reference: string;
  schoolCode: string;
  buyerName: string | null;
  amount: number;
  method: string;
  provider: string | null;
  status: string;
  deliveryEmail: string | null;
  deliveryPhone: string | null;
  checkoutUrl: string | null;
  createdAt: string;
};

type DevSample = {
  key: string;
  level: string;
  subject: string;
  topic: string;
  week: number;
  duration: string;
  objectives: string;
  resources: string;
  activityIntro: string;
  activityMain: string;
  activityPlenary: string;
  homework: string;
};
const EMPTY_SAMPLE = {
  level: "", subject: "", topic: "", week: "1", duration: "40 minutes",
  objectives: "", resources: "", activityIntro: "", activityMain: "", activityPlenary: "", homework: "",
};

const SAMPLE_LEVELS = ["Crèche", "KG 1", "KG 2", "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6", "JHS 1", "JHS 2", "JHS 3", "SHS 1", "SHS 2", "SHS 3"];

const SAMPLE_SUBJECT_SUGGESTIONS = [
  "English Language", "Mathematics", "Science", "Social Studies", "Religious & Moral Education",
  "Creative Arts", "Ghanaian Language (Twi)", "French", "ICT", "Physical Education", "Our World Our People",
  "Career Technology", "Computing", "Literature in English", "Economics", "Biology", "Chemistry", "Physics",
  "Elective Mathematics", "Geography", "History", "Government", "Financial Accounting", "Business Management",
];

type VendorSchool = {
  id: string;
  licenseCode: string;
  name: string;
  district: string | null;
  region: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  paymentStatus: string;
  notes: string | null;
  createdAt: string;
  locked: boolean;
  licenseState: string;
  issuanceCount: number;
  lastIssuedAt: string | null;
};
const PAYMENT_TONE: Record<string, string> = {
  FULL: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  PARTIAL: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  UNPAID: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
};
const LICENSE_TONE: Record<string, string> = {
  ACTIVE: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  TRIAL: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
  SUSPENDED: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  EXPIRED: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
  NONE: "bg-slate-500/15 text-slate-400 ring-slate-500/30",
};
const SUGGESTION_LABEL: Record<string, string> = { NEW: "New", REVIEWED: "Reviewed", DONE: "Done", DECLINED: "Declined" };
const SUGGESTION_TONE: Record<string, string> = {
  NEW: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  REVIEWED: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
  DONE: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  DECLINED: "bg-slate-500/15 text-slate-400 ring-slate-500/30",
};
const KEEP_LABELS = [
  "User accounts & roles (super admin, admin, staff, developer)",
  "School profile & system settings",
  "Curriculum — levels, classes, subjects, programmes, grading scales",
  "Academic years & terms",
  "Fee items & salary scales",
  "Licensing records & the vendor school directory (your records stay)",
];

export default function DevConsolePage() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("licensing");
  const [gate, setGate] = useState<Gate | null>(null);
  const [sales, setSales] = useState<SalesConfig>({ trialDays: "30", price: "3000", priceBasic: "3000", priceShs: "5000", currency: "GHS", momoPhones: "", monthlyGoal: "", freeSchools: "3" });
  const [salesBusy, setSalesBusy] = useState(false);
  const [devKeys, setDevKeys] = useState<DevKeys>({});
  const [keysBusy, setKeysBusy] = useState(false);
  const [termsDraft, setTermsDraft] = useState({ version: "", content: "" });
  const [termsBusy, setTermsBusy] = useState(false);
  const [lockBusy, setLockBusy] = useState(false);
  const [lockMsg, setLockMsg] = useState("");
  const [lockSchool, setLockSchool] = useState("");
  const [lockedSchools, setLockedSchools] = useState<string[]>([]);
  const [issuedCodes, setIssuedCodes] = useState<string[]>([]);
  const [releaseForm, setReleaseForm] = useState({ version: "", title: "", notes: "" });
  const [releaseBusy, setReleaseBusy] = useState(false);
  const [releases, setReleases] = useState<Release[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestBusy, setSuggestBusy] = useState<string | null>(null);
  const [schools, setSchools] = useState<VendorSchool[]>([]);
  const [schoolsBusy, setSchoolsBusy] = useState(false);
  const [purchases, setPurchases] = useState<AbandonedPurchase[]>([]);
  const [purchasesBusy, setPurchasesBusy] = useState<string | null>(null);
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [schoolForm, setSchoolForm] = useState({ licenseCode: "", name: "", district: "", region: "", contactEmail: "", contactPhone: "" });
  const [schoolSearch, setSchoolSearch] = useState("");
  const [resetInfo, setResetInfo] = useState<{
    total: number; counts: Record<string, number>;
    kept: Record<string, number>; licenseStatus: string;
  } | null>(null);
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [resetResult, setResetResult] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [devSamples, setDevSamples] = useState<DevSample[]>([]);
  const [sampleForm, setSampleForm] = useState(EMPTY_SAMPLE);
  const [samplesBusy, setSamplesBusy] = useState(false);
  const [sampleBusyId, setSampleBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const g = await api<Gate>("/api/system/gate");
      setGate(g);
      setLockMsg(g.lockMessage);
      setLockSchool(g.schoolId || "MAIN");
      const lockInfo = await api<{ lockedSchools: string[]; thisSchool: string }>("/api/dev/lock").catch(() => ({ lockedSchools: [], thisSchool: g.schoolId || "MAIN" }));
      setLockedSchools(lockInfo.lockedSchools ?? []);
      api<{ schoolId: string }[]>("/api/license/issuances").then((iss) => setIssuedCodes([...new Set(iss.map((i) => i.schoolId))])).catch(() => {});
      const s = await api<SalesConfig>("/api/dev/sales-config");
      setSales(s);
      api<DevKeys>("/api/dev/payment-keys").then(setDevKeys).catch(() => {});
      setTermsDraft({ version: g.termsVersion, content: g.termsContent });
      api<Release[]>("/api/dev/releases").then(setReleases).catch(() => {});
      api<Suggestion[]>("/api/suggestions").then(setSuggestions).catch(() => {});
      api<VendorSchool[]>("/api/dev/schools").then(setSchools).catch(() => {});
      api<AbandonedPurchase[]>("/api/dev/purchases").then(setPurchases).catch(() => {});
      api<SalesReport>("/api/dev/sales-report").then(setSalesReport).catch(() => {});
      api<{ total: number; counts: Record<string, number>; kept: Record<string, number>; licenseStatus: string }>("/api/dev/reset")
        .then(setResetInfo)
        .catch(() => {});
      api<{ samples: DevSample[] }>("/api/dev/lesson-samples").then((r) => setDevSamples(r.samples)).catch(() => {});
    } catch (e) {
      toast.toast({ title: "Failed to load console", description: (e as Error).message, variant: "error" });
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function doReset(e: React.FormEvent) {
    e.preventDefault();
    setResetError(null);
    setResetResult(null);
    setResetBusy(true);
    try {
      const res = await api<{ cleared: number; message: string }>("/api/dev/reset", {
        method: "POST",
        body: JSON.stringify({ confirm: resetConfirm }),
      });
      setResetResult(res.message);
      setResetConfirm("");
      load(); // refresh every tab's data
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setResetBusy(false);
    }
  }

  async function saveSales(e: React.FormEvent) {
    e.preventDefault();
    setSalesBusy(true);
    try {
      await api("/api/dev/sales-config", { method: "PUT", body: JSON.stringify(sales) });
      toast.toast({ title: "Sales config saved", description: "Trial length and activation fee updated.", variant: "success" });
    } catch (e) {
      toast.toast({ title: "Save failed", description: (e as Error).message, variant: "error" });
    } finally {
      setSalesBusy(false);
    }
  }

  const setKey = (k: string, v: string) => setDevKeys((d) => ({ ...d, [k]: v }));

  async function saveKeys(e: React.FormEvent) {
    e.preventDefault();
    setKeysBusy(true);
    try {
      await api("/api/dev/payment-keys", { method: "PUT", body: JSON.stringify(devKeys) });
      toast.toast({ title: "Your keys saved", description: "Used only for license payments and license notifications — never for school traffic.", variant: "success" });
    } catch (e) {
      toast.toast({ title: "Save failed", description: (e as Error).message, variant: "error" });
    } finally {
      setKeysBusy(false);
    }
  }

  async function saveTerms(e: React.FormEvent) {
    e.preventDefault();
    setTermsBusy(true);
    try {
      const res = await api<{ gate: Gate }>("/api/dev/terms", {
        method: "PUT",
        body: JSON.stringify(termsDraft),
      });
      setGate(res.gate);
      toast.toast({
        title: "Terms & Conditions published",
        description: res.gate.needsTermsAcceptance
          ? "The school must accept this version before they can continue."
          : "Saved — the school has already accepted this version.",
        variant: "success",
      });
    } catch (e) {
      toast.toast({ title: "Save failed", description: (e as Error).message, variant: "error" });
    } finally {
      setTermsBusy(false);
    }
  }

  async function toggleLock(locked: boolean, schoolCode?: string) {
    const code = (schoolCode ?? lockSchool).trim();
    if (!code) {
      toast.toast({ title: "School code required", description: "Enter the license code of the school to lock.", variant: "error" });
      return;
    }
    setLockBusy(true);
    try {
      const res = await api<{ gate: Gate; lockedSchools: string[] }>("/api/dev/lock", {
        method: "POST",
        body: JSON.stringify({ schoolId: code, locked, message: lockMsg }),
      });
      setGate(res.gate);
      setLockedSchools(locked ? [...new Set([...lockedSchools, code.toUpperCase()])] : lockedSchools.filter((c) => c !== code.toUpperCase()));
      toast.toast({
        title: locked ? `School ${code.toUpperCase()} locked 🔒` : `School ${code.toUpperCase()} unlocked 🔓`,
        description: locked
          ? `Only school ${code.toUpperCase()} is blocked — every other school keeps working.`
          : "That school can work again.",
        variant: "success",
      });
    } catch (e) {
      toast.toast({ title: "Action failed", description: (e as Error).message, variant: "error" });
    } finally {
      setLockBusy(false);
    }
  }

  async function publishRelease(e: React.FormEvent) {
    e.preventDefault();
    setReleaseBusy(true);
    try {
      const created = await api<Release>("/api/dev/releases", {
        method: "POST",
        body: JSON.stringify(releaseForm),
      });
      setReleases((r) => [created, ...r]);
      setReleaseForm({ version: "", title: "", notes: "" });
      toast.toast({ title: "Release published", description: "It now appears in the in-app What's New changelog.", variant: "success" });
    } catch (e) {
      toast.toast({ title: "Publish failed", description: (e as Error).message, variant: "error" });
    } finally {
      setReleaseBusy(false);
    }
  }

  const TABS: [Tab, string, React.ReactNode][] = [
    ["licensing", "Licensing", <KeyRound key="l" className="h-4 w-4" />],
    ["license", "License dashboard", <LayoutDashboard key="ld" className="h-4 w-4" />],
    ["terms", "Terms & Lock", <Lock key="t" className="h-4 w-4" />],
    ["schools", "Schools", <School key="s" className="h-4 w-4" />],
    ["releases", "Releases", <CalendarPlus key="r" className="h-4 w-4" />],
    ["samples", "Lesson notes", <BookOpenText key="smp" className="h-4 w-4" />],
    ["feedback", "Feedback", <Lightbulb key="f" className="h-4 w-4" />],
    ["reset", "Factory reset", <Eraser key="x" className="h-4 w-4" />],
  ];

  async function setSuggestionStatus(id: string, status: string) {
    setSuggestBusy(id);
    try {
      await api(`/api/suggestions/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      setSuggestions((s) => s.map((x) => (x.id === id ? { ...x, status } : x)));
    } catch (e) {
      toast.toast({ title: "Update failed", description: (e as Error).message, variant: "error" });
    } finally {
      setSuggestBusy(null);
    }
  }

  async function deleteSuggestion(id: string) {
    if (!confirm("Delete this suggestion permanently?")) return;
    setSuggestBusy(id);
    try {
      await api(`/api/suggestions/${id}`, { method: "DELETE" });
      setSuggestions((s) => s.filter((x) => x.id !== id));
    } catch (e) {
      toast.toast({ title: "Delete failed", description: (e as Error).message, variant: "error" });
    } finally {
      setSuggestBusy(null);
    }
  }

  async function saveSample(e: React.FormEvent) {
    e.preventDefault();
    setSamplesBusy(true);
    try {
      await api("/api/dev/lesson-samples", { method: "POST", body: JSON.stringify(sampleForm) });
      toast.toast({ title: "Sample published", description: "The lesson note is now in every school's sample library.", variant: "success" });
      setSampleForm(EMPTY_SAMPLE);
      api<{ samples: DevSample[] }>("/api/dev/lesson-samples").then((r) => setDevSamples(r.samples)).catch(() => {});
    } catch (e) {
      toast.toast({ title: "Publish failed", description: (e as Error).message, variant: "error" });
    } finally {
      setSamplesBusy(false);
    }
  }

  async function deleteSample(key: string) {
    if (!confirm("Delete this sample lesson note permanently?")) return;
    setSampleBusyId(key);
    try {
      await api(`/api/dev/lesson-samples/${key}`, { method: "DELETE" });
      setDevSamples((s) => s.filter((x) => x.key !== key));
      toast.toast({ title: "Sample deleted", variant: "success" });
    } catch (e) {
      toast.toast({ title: "Delete failed", description: (e as Error).message, variant: "error" });
    } finally {
      setSampleBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-emerald-400 to-blue-500 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-950 shadow-lg shadow-emerald-500/20">
              <Lock className="h-3 w-3" /> Dev Console
            </span>
            <h1 className="text-2xl font-black tracking-tight text-white">Developer Console</h1>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            Locked surface for the software vendor only — issue licenses, publish terms & releases,
            and control enforcement across every school installation. Only the developer role can open this console.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${
              gate?.systemLocked
                ? "bg-rose-500/15 text-rose-300 ring-rose-500/30"
                : "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
            }`}
          >
            {gate?.systemLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
            {gate?.systemLocked ? "System LOCKED" : "System unlocked"}
          </span>
          <ThemeSwitcher />
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${
              gate?.needsTermsAcceptance
                ? "bg-amber-500/15 text-amber-300 ring-amber-500/30"
                : "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Terms v{gate?.termsVersion || "0"}
            {gate?.needsTermsAcceptance ? " — pending acceptance" : " — accepted"}
          </span>
        </div>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-white/5 p-1">
        {TABS.map(([key, label, icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === key ? "bg-white text-slate-900" : "text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {tab === "licensing" && (
        <div className="space-y-6">
          {/* Sales config — moved out of Admin → Settings, developer-only */}
          <form onSubmit={saveSales} className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white"><Wrench className="h-5 w-5 text-emerald-300" /> Sales configuration</h3>
            <p className="mt-1 text-sm text-slate-400">
              Free-trial length and the online activation fee. When a trial expires the school sees
              your contact details and payment steps — the license activates the moment payment is confirmed.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Free trial days"><Input type="number" min={1} max={365} value={sales.trialDays} onChange={(e) => setSales({ ...sales, trialDays: e.target.value })} className="border-white/15 bg-white/10 text-white" /></Field>
              <Field label="Basic school price (GHS)" hint="Crèche · KG · Primary · JHS"><Input type="number" min={1} step="50" value={sales.priceBasic} onChange={(e) => setSales({ ...sales, priceBasic: e.target.value, price: e.target.value })} className="border-white/15 bg-white/10 text-white" /></Field>
              <Field label="Basic + SHS price (GHS)" hint="Includes Senior High School"><Input type="number" min={1} step="50" value={sales.priceShs} onChange={(e) => setSales({ ...sales, priceShs: e.target.value })} className="border-white/15 bg-white/10 text-white" /></Field>
              <Field label="Currency"><Input value={sales.currency} onChange={(e) => setSales({ ...sales, currency: e.target.value })} className="border-white/15 bg-white/10 text-white" /></Field>
              <Field label="Direct MoMo numbers"><Input value={sales.momoPhones} onChange={(e) => setSales({ ...sales, momoPhones: e.target.value })} placeholder="+233 26 669 2501, …" className="border-white/15 bg-white/10 text-white" /></Field>
              <Field label="Monthly revenue goal (GHS)"><Input type="number" min={0} step="100" value={sales.monthlyGoal} onChange={(e) => setSales({ ...sales, monthlyGoal: e.target.value })} placeholder="e.g. 2000" className="border-white/15 bg-white/10 text-white" /></Field>
              <Field label="Included free schools" hint="How many school profiles come with the purchase — beyond this, each new school is paid separately"><Input type="number" min={0} max={50} value={sales.freeSchools} onChange={(e) => setSales({ ...sales, freeSchools: e.target.value })} placeholder="3" className="border-white/15 bg-white/10 text-white" /></Field>
            </div>
            <div className="mt-4 flex justify-end">
              <Button type="submit" loading={salesBusy}><Save className="h-4 w-4" /> Save sales config</Button>
            </div>
          </form>

          {/* Your own payment + messaging keys — the developer's business */}
          <form onSubmit={saveKeys} className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white"><KeyRound className="h-5 w-5 text-emerald-300" /> Your payment &amp; messaging keys (developer only)</h3>
            <p className="mt-1 text-sm text-slate-400">
              Your own gateway and messaging credentials for your licensing business. License-activation
              payments run on these; license notifications (SMS/email/WhatsApp) use these too. Schools
              never see them — each school configures its own keys for its own fee collections and messages.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="MTN MoMo enabled">
                <select value={devKeys["dev.payments.momo.enabled"] === "true" ? "true" : "false"} onChange={(e) => setKey("dev.payments.momo.enabled", e.target.value)} className="w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white">
                  <option value="false">No</option><option value="true">Yes</option>
                </select>
              </Field>
              <Field label="MTN environment">
                <select value={devKeys["dev.payments.momo.env"] || "sandbox"} onChange={(e) => setKey("dev.payments.momo.env", e.target.value)} className="w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white">
                  <option value="sandbox">Sandbox</option><option value="live">Live</option>
                </select>
              </Field>
              <Field label="MTN subscription key"><Input value={devKeys["dev.payments.momo.subscriptionKey"] ?? ""} onChange={(e) => setKey("dev.payments.momo.subscriptionKey", e.target.value)} className="border-white/15 bg-white/10 text-white" autoComplete="off" /></Field>
              <Field label="MTN API user ID" hint="Sandbox auto-provisions; live needs the portal value"><Input value={devKeys["dev.payments.momo.apiUserId"] ?? ""} onChange={(e) => setKey("dev.payments.momo.apiUserId", e.target.value)} className="border-white/15 bg-white/10 text-white" autoComplete="off" /></Field>
              <Field label="MTN API key"><Input type="password" value={devKeys["dev.payments.momo.apiKey"] ?? ""} onChange={(e) => setKey("dev.payments.momo.apiKey", e.target.value)} className="border-white/15 bg-white/10 text-white" autoComplete="off" /></Field>
              <Field label="Your MoMo business number"><Input value={devKeys["dev.payments.momo.businessPhone"] ?? ""} onChange={(e) => setKey("dev.payments.momo.businessPhone", e.target.value)} placeholder="+233 …" className="border-white/15 bg-white/10 text-white" /></Field>
              <Field label="Paystack enabled">
                <select value={devKeys["dev.payments.paystack.enabled"] === "true" ? "true" : "false"} onChange={(e) => setKey("dev.payments.paystack.enabled", e.target.value)} className="w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white">
                  <option value="false">No</option><option value="true">Yes</option>
                </select>
              </Field>
              <Field label="Paystack public key"><Input value={devKeys["dev.payments.paystack.publicKey"] ?? ""} onChange={(e) => setKey("dev.payments.paystack.publicKey", e.target.value)} className="border-white/15 bg-white/10 text-white" autoComplete="off" /></Field>
              <Field label="Paystack secret key"><Input type="password" value={devKeys["dev.payments.paystack.secretKey"] ?? ""} onChange={(e) => setKey("dev.payments.paystack.secretKey", e.target.value)} className="border-white/15 bg-white/10 text-white" autoComplete="off" /></Field>
            </div>
            <div className="mt-5 border-t border-white/10 pt-5">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400"><MessageSquareText className="h-3.5 w-3.5" /> License notifications (SMSOnlineGH + email)</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="SMSOnlineGH API key"><Input type="password" value={devKeys["dev.messaging.smsonlinegh.apiKey"] ?? ""} onChange={(e) => setKey("dev.messaging.smsonlinegh.apiKey", e.target.value)} className="border-white/15 bg-white/10 text-white" autoComplete="off" /></Field>
                <Field label="SMSOnlineGH sender ID"><Input value={devKeys["dev.messaging.smsonlinegh.sender"] ?? "GESSMIS"} onChange={(e) => setKey("dev.messaging.smsonlinegh.sender", e.target.value)} className="border-white/15 bg-white/10 text-white" /></Field>
                <Field label="Resend API key (license emails)"><Input type="password" value={devKeys["dev.messaging.email.apiKey"] ?? ""} onChange={(e) => setKey("dev.messaging.email.apiKey", e.target.value)} className="border-white/15 bg-white/10 text-white" autoComplete="off" /></Field>
                <Field label="Email from"><Input value={devKeys["dev.messaging.email.from"] ?? ""} onChange={(e) => setKey("dev.messaging.email.from", e.target.value)} className="border-white/15 bg-white/10 text-white" /></Field>
                <Field label="WhatsApp SID"><Input type="password" value={devKeys["dev.messaging.whatsapp.sid"] ?? ""} onChange={(e) => setKey("dev.messaging.whatsapp.sid", e.target.value)} className="border-white/15 bg-white/10 text-white" autoComplete="off" /></Field>
                <Field label="WhatsApp token"><Input type="password" value={devKeys["dev.messaging.whatsapp.token"] ?? ""} onChange={(e) => setKey("dev.messaging.whatsapp.token", e.target.value)} className="border-white/15 bg-white/10 text-white" autoComplete="off" /></Field>
                <Field label="WhatsApp from"><Input value={devKeys["dev.messaging.whatsapp.from"] ?? ""} onChange={(e) => setKey("dev.messaging.whatsapp.from", e.target.value)} className="border-white/15 bg-white/10 text-white" /></Field>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button type="submit" loading={keysBusy}><Save className="h-4 w-4" /> Save my keys</Button>
            </div>
          </form>

          <GatewayTester />

          {/* Sales report — settled license payments, by month */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-white"><FileText className="h-5 w-5 text-emerald-300" /> Sales report</h3>
              <div className="flex items-center gap-2">
                <a
                  href="/api/dev/sales-report?format=print"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-300 ring-1 ring-emerald-500/30 transition hover:bg-emerald-500/25"
                  title="Open the printable A4 sales report (Print / Save as PDF)"
                >
                  <FileText className="h-3.5 w-3.5" /> Print / PDF
                </a>
                <a
                  href="/api/dev/sales-report?format=csv"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-slate-200 ring-1 ring-white/15 transition hover:bg-white/20"
                  title="Download the monthly sales report as CSV (for records / accountant)"
                >
                  <FileText className="h-3.5 w-3.5" /> Download CSV
                </a>
              </div>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Settled license payments — school activations and public /buy purchases — counted the moment
              the gateway confirms. Your revenue at a glance.
            </p>
            {!salesReport ? (
              <p className="mt-4 rounded-xl bg-white/5 px-4 py-6 text-center text-sm text-slate-400">Loading…</p>
            ) : salesReport.totalSales === 0 ? (
              <p className="mt-4 rounded-xl bg-white/5 px-4 py-6 text-center text-sm text-slate-400">
                No settled license sales yet — they appear here as payments confirm.
              </p>
            ) : (
              <div className="mt-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-xl bg-emerald-500/15 px-4 py-3 ring-1 ring-emerald-500/30">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">Total revenue</p>
                    <p className="text-xl font-extrabold text-white">GHS {salesReport.totalRevenue.toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl bg-white/10 px-4 py-3 ring-1 ring-white/15">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Sales</p>
                    <p className="text-xl font-extrabold text-white">{salesReport.totalSales}</p>
                  </div>
                </div>
                {Number(sales.monthlyGoal) > 0 && (
                  <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        {salesReport.currentMonth.label} revenue goal
                      </p>
                      <p className="text-sm font-bold text-white">
                        GHS {salesReport.currentMonth.revenue.toLocaleString()}{" "}
                        <span className="text-slate-400">/ GHS {Number(sales.monthlyGoal).toLocaleString()}</span>
                      </p>
                    </div>
                    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full transition-all ${salesReport.currentMonth.revenue >= Number(sales.monthlyGoal) ? "bg-emerald-400" : "bg-amber-400"}`}
                        style={{ width: `${Math.min(100, (salesReport.currentMonth.revenue / Number(sales.monthlyGoal)) * 100)}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-400">
                      {salesReport.currentMonth.revenue >= Number(sales.monthlyGoal)
                        ? "Goal reached — well done! 🎉"
                        : `${Math.round((salesReport.currentMonth.revenue / Number(sales.monthlyGoal)) * 100)}% of the monthly goal`}
                    </p>
                  </div>
                )}
                {salesReport.years.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {salesReport.years.map((y) => (
                      <div key={y.year} className="rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs ring-1 ring-amber-500/25">
                        <span className="font-bold text-amber-200">{y.year}</span>
                        <span className="text-slate-300"> · {y.count} sale{y.count === 1 ? "" : "s"} · GHS {y.revenue.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="py-2 pr-4">Month</th>
                        <th className="py-2 pr-4">Sales</th>
                        <th className="py-2 pr-4">Revenue</th>
                        <th className="py-2">By method</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesReport.rows.map((r) => (
                        <tr key={r.month} className="border-b border-white/5">
                          <td className="py-2.5 pr-4 font-semibold text-white">{r.label}</td>
                          <td className="py-2.5 pr-4 text-slate-300">{r.count}</td>
                          <td className="py-2.5 pr-4 font-bold text-emerald-300">GHS {r.revenue.toLocaleString()}</td>
                          <td className="py-2.5 text-xs text-slate-400">
                            {r.byMethod.map((m) => `${m.method} (${m.count})`).join(" · ") || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {/* Cashbook — every settled license payment, newest first */}
            {salesReport && salesReport.cashbook.length > 0 && (
              <div className="mt-6 border-t border-white/10 pt-5">
                <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-300">
                  <History className="h-4 w-4 text-emerald-300" /> Cashbook — every settled payment
                </h4>
                <div className="mt-3 max-h-[360px] overflow-y-auto overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-slate-900">
                      <tr className="border-b border-white/10 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="py-2.5 pl-4 pr-4">Date</th>
                        <th className="py-2.5 pr-4">Reference</th>
                        <th className="py-2.5 pr-4">School / buyer</th>
                        <th className="py-2.5 pr-4">Method</th>
                        <th className="py-2.5 pr-4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesReport.cashbook.map((c) => (
                        <tr key={c.reference} className="border-b border-white/5 last:border-0">
                          <td className="whitespace-nowrap py-2.5 pl-4 pr-4 text-xs text-slate-400">{new Date(c.date).toLocaleDateString("en-GB")}</td>
                          <td className="whitespace-nowrap py-2.5 pr-4 font-mono text-xs text-slate-300">{c.reference}</td>
                          <td className="py-2.5 pr-4 font-semibold text-white">{c.buyer}</td>
                          <td className="whitespace-nowrap py-2.5 pr-4 text-xs text-slate-300">{c.method}{c.provider ? ` (${c.provider})` : ""}</td>
                          <td className="py-2.5 pr-4 text-right font-bold text-emerald-300">GHS {c.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* The full licensing console (issue / send / revoke / rotate / activate) */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white"><History className="h-5 w-5 text-emerald-300" /> Licensing console</h3>
            <div className="mt-4">
              <LicensingConsole />
            </div>
          </div>
        </div>
      )}

      {tab === "license" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white"><LayoutDashboard className="h-5 w-5 text-emerald-300" /> License &amp; Activation dashboard</h3>
            <p className="mt-1 text-sm text-slate-400">
              The buyer-facing license dashboard, merged into the console: this installation's license
              status, its key, payment history with PDF receipts, and the pay / renew panel. Strictly
              developer-only — no other account can open it anywhere in the system.
            </p>
          </div>
          <LicenseDashboard />
        </div>
      )}

      {tab === "terms" && (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <form onSubmit={saveTerms} className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white"><FileText className="h-5 w-5 text-emerald-300" /> Terms &amp; Conditions</h3>
            <p className="mt-1 text-sm text-slate-400">
              Publish a new version of the system terms. The next time the school signs in, they must
              accept it before using the portal. If they refuse, the system stays locked for them.
            </p>
            <div className="mt-4 space-y-4">
              <Field label="Version" hint="e.g. 1, 2, 3 — bump it to force re-acceptance">
                <Input required value={termsDraft.version} onChange={(e) => setTermsDraft({ ...termsDraft, version: e.target.value })} className="border-white/15 bg-white/10 text-white" />
              </Field>
              <Field label="Terms text" hint="Shown verbatim on the acceptance screen — plain text or simple markdown">
                <Textarea rows={12} required value={termsDraft.content} onChange={(e) => setTermsDraft({ ...termsDraft, content: e.target.value })} className="border-white/15 bg-white/10 text-white" placeholder={"1. The school agrees to use this system for its lawful school operations.\n2. Licensing: an active license is required after the free trial.\n3. Non-payment or refusal of these terms may result in the system being locked by the vendor.\n…"} />
              </Field>
            </div>
            <div className="mt-4 flex justify-end">
              <Button type="submit" loading={termsBusy}><Send className="h-4 w-4" /> Publish terms</Button>
            </div>
          </form>

          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                {gate?.systemLocked ? <Lock className="h-5 w-5 text-rose-400" /> : <Unlock className="h-5 w-5 text-emerald-300" />}
                Lock ONE school — by its license code
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Locking is <strong className="text-slate-200">per-school</strong>: you target the license code of a
                particular school (the SCHOOLID embedded in its key, e.g. <code className="rounded bg-white/10 px-1 font-mono text-xs">ABC</code> in{" "}
                <code className="rounded bg-white/10 px-1 font-mono text-xs">GES-SMIS-ABC-365-…</code>). Only that school is blocked —
                schools that have paid keep working. Perfect when one buyer fails to pay or refuses terms
                without touching everyone else.
              </p>
              <div className="mt-4 space-y-4">
                <Field label="School license code" hint="Defaults to this installation's code. Issued codes below are clickable.">
                  <div className="flex gap-2">
                    <Input
                      value={lockSchool}
                      onChange={(e) => setLockSchool(e.target.value.toUpperCase())}
                      placeholder="MAIN"
                      className="border-white/15 bg-white/10 font-mono uppercase text-white"
                    />
                    {issuedCodes.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {issuedCodes.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setLockSchool(c)}
                            className={`rounded-md px-2 py-1 font-mono text-[11px] font-bold transition ${
                              lockSchool === c
                                ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                                : "bg-white/10 text-slate-300 hover:bg-white/20"
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </Field>
                <Field label="Lock message" hint="Shown to that school only, on its lock screen">
                  <Textarea rows={3} value={lockMsg} onChange={(e) => setLockMsg(e.target.value)} className="border-white/15 bg-white/10 text-white" placeholder="Your license payment is due. Contact your system developer to unlock this school." />
                </Field>
                <div className="flex flex-wrap gap-2">
                  {lockedSchools.includes(lockSchool.toUpperCase()) ? (
                    <Button type="button" onClick={() => toggleLock(false)} loading={lockBusy}><Unlock className="h-4 w-4" /> Unlock {lockSchool.toUpperCase()}</Button>
                  ) : (
                    <Button type="button" variant="danger" onClick={() => toggleLock(true)} loading={lockBusy}><Lock className="h-4 w-4" /> Lock {lockSchool.toUpperCase() || "this school"}</Button>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-lg font-semibold text-white">Locked schools</h3>
              {lockedSchools.length === 0 ? (
                <p className="mt-3 rounded-xl bg-white/5 px-4 py-6 text-center text-sm text-slate-400">
                  No school is locked — every school you have sold keeps working.
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {lockedSchools.map((c) => (
                    <li key={c} className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5">
                      <span className="font-mono text-sm font-bold text-rose-300">{c}</span>
                      <Button type="button" variant="ghost" onClick={() => { setLockSchool(c); toggleLock(false, c); }} loading={lockBusy} className="text-rose-300 hover:bg-rose-500/20">
                        <Unlock className="h-3.5 w-3.5" /> Unlock
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <ul className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm text-slate-300">
                <li className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2">
                  <span>This installation</span>
                  <span className="font-mono font-bold">{gate?.schoolId || "MAIN"}</span>
                </li>
                <li className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2">
                  <span>This school's lock state</span>
                  <span className="font-bold">{lockedSchools.includes((gate?.schoolId || "MAIN").toUpperCase()) ? "LOCKED" : "Open"}</span>
                </li>
                <li className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2">
                  <span>License</span>
                  <span className="font-bold">{gate?.licenseBlocked ? "Blocked (expired/revoked)" : "Active or trial"}</span>
                </li>
                <li className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2">
                  <span>Terms published</span>
                  <span className="font-bold">v{gate?.termsVersion || "0"}</span>
                </li>
                <li className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2">
                  <span>School accepted</span>
                  <span className="font-bold">v{gate?.termsAcceptedVersion || "—"}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {tab === "schools" && (
        <>
        <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
          {/* Register a school */}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSchoolsBusy(true);
              try {
                await api("/api/dev/schools", { method: "POST", body: JSON.stringify(schoolForm) });
                setSchoolForm({ licenseCode: "", name: "", district: "", region: "", contactEmail: "", contactPhone: "" });
                setSchools(await api<VendorSchool[]>("/api/dev/schools"));
                toast.toast({ title: "School registered", description: `${schoolForm.name} (${schoolForm.licenseCode.toUpperCase()}) is now in the directory.`, variant: "success" });
              } catch (err) {
                toast.toast({ title: "Registration failed", description: (err as Error).message, variant: "error" });
              } finally {
                setSchoolsBusy(false);
              }
            }}
            className="rounded-2xl border border-white/10 bg-white/5 p-6"
          >
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white"><School className="h-5 w-5 text-emerald-300" /> Register a school</h3>
            <p className="mt-1 text-sm text-slate-400">
              Add a school you sold to (or plan to sell to). Every key you issue/send is
              registered here automatically — this form is for the rest. The license code is the{" "}
              <strong className="text-slate-200">SCHOOLID</strong> embedded in its key, e.g.{" "}
              <code className="rounded bg-white/10 px-1 font-mono text-xs">ABC</code> in{" "}
              <code className="rounded bg-white/10 px-1 font-mono text-xs">GES-SMIS-ABC-365-…</code>.
            </p>
            <div className="mt-4 space-y-3">
              <Field label="License code" hint="A–Z, 0–9 — the code in the key">
                <Input required value={schoolForm.licenseCode} onChange={(e) => setSchoolForm({ ...schoolForm, licenseCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })} placeholder="ABC" className="border-white/15 bg-white/10 font-mono uppercase text-white" />
              </Field>
              <Field label="School name"><Input required value={schoolForm.name} onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })} placeholder="Adom Community School" className="border-white/15 bg-white/10 text-white" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="District"><Input value={schoolForm.district} onChange={(e) => setSchoolForm({ ...schoolForm, district: e.target.value })} placeholder="Kumasi Metro" className="border-white/15 bg-white/10 text-white" /></Field>
                <Field label="Region"><Input value={schoolForm.region} onChange={(e) => setSchoolForm({ ...schoolForm, region: e.target.value })} placeholder="Ashanti" className="border-white/15 bg-white/10 text-white" /></Field>
              </div>
              <Field label="Contact email"><Input type="email" value={schoolForm.contactEmail} onChange={(e) => setSchoolForm({ ...schoolForm, contactEmail: e.target.value })} className="border-white/15 bg-white/10 text-white" /></Field>
              <Field label="Contact phone"><Input value={schoolForm.contactPhone} onChange={(e) => setSchoolForm({ ...schoolForm, contactPhone: e.target.value })} placeholder="+233 …" className="border-white/15 bg-white/10 text-white" /></Field>
            </div>
            <div className="mt-4 flex justify-end">
              <Button type="submit" loading={schoolsBusy}><Save className="h-4 w-4" /> Register school</Button>
            </div>
          </form>

          {/* Directory */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                <School className="h-5 w-5 text-emerald-300" /> Schools directory
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold text-slate-300">{schools.length}</span>
              </h3>
              <Input
                value={schoolSearch}
                onChange={(e) => setSchoolSearch(e.target.value)}
                placeholder="Search name / code / district…"
                className="w-56 border-white/15 bg-white/10 text-sm text-white"
              />
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Lock <strong className="text-slate-200">one</strong> school at a time from the list — for example when a buyer
              fails to make full payment. Paid schools keep working untouched.
            </p>

            {schools.length === 0 ? (
              <p className="mt-4 rounded-xl bg-white/5 px-4 py-10 text-center text-sm text-slate-400">
                No schools registered yet. Issue a license key or use the form to add one —
                this list is your district-wide view of every installation.
              </p>
            ) : (
              <ul className="mt-4 max-h-[560px] space-y-3 overflow-y-auto pr-1">
                {schools
                  .filter((s) => {
                    const q = schoolSearch.trim().toLowerCase();
                    if (!q) return true;
                    return [s.name, s.licenseCode, s.district ?? "", s.region ?? "", s.contactEmail ?? ""].join(" ").toLowerCase().includes(q);
                  })
                  .map((s) => (
                    <li key={s.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-200">{s.licenseCode}</span>
                        <p className="font-semibold text-white">{s.name}</p>
                        <span className={`ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${PAYMENT_TONE[s.paymentStatus] ?? PAYMENT_TONE.UNPAID}`}>
                          {s.paymentStatus === "FULL" ? "Paid in full" : s.paymentStatus === "PARTIAL" ? "Partial payment" : "UNPAID"}
                        </span>
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${LICENSE_TONE[s.licenseState] ?? LICENSE_TONE.NONE}`}>
                          {s.licenseState === "NONE" ? "No license yet" : s.licenseState}
                        </span>
                        {s.locked && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-0.5 text-[11px] font-bold text-rose-300 ring-1 ring-rose-500/30">
                            <Lock className="h-3 w-3" /> Locked
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
                        {s.district && <span>📍 {s.district}{s.region ? `, ${s.region}` : ""}</span>}
                        {s.contactPhone && <span>📞 {s.contactPhone}</span>}
                        {s.contactEmail && <span>✉️ {s.contactEmail}</span>}
                        <span>{s.issuanceCount} key{s.issuanceCount === 1 ? "" : "s"} issued{s.lastIssuedAt ? ` · last ${new Date(s.lastIssuedAt).toLocaleDateString("en-GB")}` : ""}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-white/10 pt-3">
                        {/* One-tap 'Mark as paid' — sets payment status to FULL
                            and unlocks the school in the same action. */}
                        <button
                          type="button"
                          disabled={purchasesBusy === s.id}
                          onClick={async () => {
                            setPurchasesBusy(s.id);
                            try {
                              await api("/api/dev/schools", { method: "PATCH", body: JSON.stringify({ id: s.id, paymentStatus: "FULL" }) });
                              if (s.locked) {
                                await api("/api/dev/lock", { method: "POST", body: JSON.stringify({ schoolId: s.licenseCode, locked: false }) });
                              }
                              setSchools((arr) => arr.map((x) => (x.id === s.id ? { ...x, paymentStatus: "FULL", locked: false } : x)));
                              setLockedSchools((arr) => arr.filter((c) => c !== s.licenseCode));
                              toast.toast({ title: `${s.name} marked as paid ✓`, description: s.locked ? "Payment status FULL — school unlocked." : "Payment status set to FULL.", variant: "success" });
                            } catch (err) {
                              toast.toast({ title: "Update failed", description: (err as Error).message, variant: "error" });
                            } finally {
                              setPurchasesBusy(null);
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/20 px-2.5 py-1 text-[11px] font-bold text-emerald-200 ring-1 ring-emerald-400/40 transition hover:bg-emerald-500/30 disabled:opacity-50"
                          title="Mark as paid in full (and unlock)"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Mark as paid
                        </button>
                        <select
                          value={s.paymentStatus}
                          onChange={async (e) => {
                            try {
                              await api("/api/dev/schools", { method: "PATCH", body: JSON.stringify({ id: s.id, paymentStatus: e.target.value }) });
                              setSchools((arr) => arr.map((x) => (x.id === s.id ? { ...x, paymentStatus: e.target.value } : x)));
                            } catch (err) {
                              toast.toast({ title: "Update failed", description: (err as Error).message, variant: "error" });
                            }
                          }}
                          className="rounded-lg border border-white/15 bg-white/10 px-2 py-1 text-[11px] font-bold text-white"
                          title="Payment status"
                        >
                          <option value="UNPAID">Unpaid</option>
                          <option value="PARTIAL">Partial</option>
                          <option value="FULL">Paid in full</option>
                        </select>
                        {s.locked ? (
                          <button
                            type="button"
                            onClick={async () => {
                              setLockBusy(true);
                              try {
                                await api("/api/dev/lock", { method: "POST", body: JSON.stringify({ schoolId: s.licenseCode, locked: false, message: lockMsg }) });
                                setSchools((arr) => arr.map((x) => (x.id === s.id ? { ...x, locked: false } : x)));
                                toast.toast({ title: `${s.name} unlocked 🔓`, description: "That school can work again.", variant: "success" });
                              } catch (err) {
                                toast.toast({ title: "Unlock failed", description: (err as Error).message, variant: "error" });
                              } finally {
                                setLockBusy(false);
                              }
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-300 ring-1 ring-emerald-500/30 transition hover:bg-emerald-500/25"
                          >
                            <Unlock className="h-3 w-3" /> Unlock
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={async () => {
                              setLockBusy(true);
                              try {
                                await api("/api/dev/lock", {
                                  method: "POST",
                                  body: JSON.stringify({
                                    schoolId: s.licenseCode,
                                    locked: true,
                                    message: s.paymentStatus === "FULL" ? lockMsg : `Your license payment is due — contact your system developer (shacomputec · +233 530 941 750) to unlock this school.`,
                                  }),
                                });
                                setSchools((arr) => arr.map((x) => (x.id === s.id ? { ...x, locked: true } : x)));
                                toast.toast({ title: `${s.name} locked 🔒`, description: `Only ${s.licenseCode} is blocked — every other school keeps working.`, variant: "success" });
                              } catch (err) {
                                toast.toast({ title: "Lock failed", description: (err as Error).message, variant: "error" });
                              } finally {
                                setLockBusy(false);
                              }
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-rose-500/15 px-2.5 py-1 text-[11px] font-bold text-rose-300 ring-1 ring-rose-500/30 transition hover:bg-rose-500/25"
                          >
                            <Lock className="h-3 w-3" /> Lock
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm(`Remove ${s.name} from the directory? Its lock and license are untouched.`)) return;
                            try {
                              await api(`/api/dev/schools?id=${encodeURIComponent(s.id)}`, { method: "DELETE" });
                              setSchools((arr) => arr.filter((x) => x.id !== s.id));
                            } catch (err) {
                              toast.toast({ title: "Delete failed", description: (err as Error).message, variant: "error" });
                            }
                          }}
                          className="ml-auto rounded-lg p-1.5 text-slate-500 transition hover:bg-rose-500/20 hover:text-rose-300"
                          title="Remove from directory"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>

        {/* Abandoned purchases — buyers who started paying on /buy but never
            finished. The developer can follow up by WhatsApp / email / phone. */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <History className="h-5 w-5 text-amber-300" /> Abandoned purchases
              <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-300 ring-1 ring-amber-500/30">{purchases.length}</span>
            </h3>
            <p className="text-sm text-slate-400">
              Buyers who started a checkout on the public <strong className="text-slate-200">/buy</strong> page but didn&apos;t finish. Follow up to close the sale.
            </p>
          </div>

          {purchases.length === 0 ? (
            <p className="mt-4 rounded-xl bg-white/5 px-4 py-8 text-center text-sm text-slate-400">
              No unfinished purchases — every buyer who started paying either settled or the checkout expired. 👌
            </p>
          ) : (
            <ul className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {purchases.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                  <span className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-bold ${t.status === "PENDING" ? "bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30" : t.status === "FAILED" ? "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30" : "bg-slate-500/15 text-slate-400 ring-1 ring-slate-500/30"}`}>
                    {t.status}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{t.buyerName || `School ${t.schoolCode}`}
                      <span className="ml-2 font-mono text-[11px] font-normal text-slate-400">{t.schoolCode}</span>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {t.reference} · GHS {t.amount.toLocaleString()} · {t.method}{t.provider ? ` (${t.provider})` : ""} · {new Date(t.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="ml-auto flex flex-wrap items-center gap-1.5">
                    {t.deliveryPhone && (
                      <a
                        href={`https://wa.me/${t.deliveryPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                          `Hello ${t.buyerName || "there"} — you started purchasing GES School MIS (reference ${t.reference}, GHS ${t.amount.toLocaleString()}) but the payment wasn't completed. Would you like to finish it now? Reply here or call shacomputec on +233 530 941 750.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-300 ring-1 ring-emerald-500/30 transition hover:bg-emerald-500/25"
                        title="Opens WhatsApp with a drafted follow-up message"
                      >
                        <MessageSquareText className="h-3 w-3" /> WhatsApp follow-up
                      </a>
                    )}
                    {t.deliveryEmail && (
                      <a href={`mailto:${t.deliveryEmail}`} className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-bold text-slate-200 ring-1 ring-white/15 transition hover:bg-white/20">
                        Email
                      </a>
                    )}
                    {t.deliveryPhone && (
                      <a href={`tel:${t.deliveryPhone.replace(/[^0-9+]/g, "")}`} className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-bold text-slate-200 ring-1 ring-white/15 transition hover:bg-white/20">
                        Call
                      </a>
                    )}
                    {t.checkoutUrl && (
                      <a href={t.checkoutUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold text-amber-300 ring-1 ring-amber-500/30 transition hover:bg-amber-500/25">
                        Reopen checkout
                      </a>
                    )}
                    {/* Send the follow-up directly through the developer's own
                        messaging keys (SMS / WhatsApp / email). */}
                    {(t.deliveryPhone || t.deliveryEmail) && (
                      <button
                        type="button"
                        disabled={purchasesBusy === t.id}
                        onClick={async () => {
                          setPurchasesBusy(t.id);
                          try {
                            const channels: FollowupChannels[] = t.deliveryPhone ? ["WHATSAPP", "SMS"] : ["EMAIL"];
                            if (t.deliveryEmail) channels.push("EMAIL");
                            await api("/api/dev/followup", { method: "POST", body: JSON.stringify({ id: t.id, channels }) });
                            toast.toast({ title: "Follow-up sent ✓", description: `Reminder queued to ${t.buyerName || t.schoolCode} (${channels.join(" + ")}).`, variant: "success" });
                          } catch (err) {
                            toast.toast({ title: "Send failed", description: (err as Error).message, variant: "error" });
                          } finally {
                            setPurchasesBusy(null);
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-sky-500/15 px-2.5 py-1 text-[11px] font-bold text-sky-300 ring-1 ring-sky-500/30 transition hover:bg-sky-500/25 disabled:opacity-50"
                        title="Sends an SMS + WhatsApp (and email when available) via your own messaging keys"
                      >
                        <Send className="h-3 w-3" /> Send reminder
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        </>
      )}

      {tab === "releases" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <form onSubmit={publishRelease} className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white"><CalendarPlus className="h-5 w-5 text-emerald-300" /> Publish a new release</h3>
            <p className="mt-1 text-sm text-slate-400">
              Record a software release here — it appears instantly in the in-app{" "}
              <strong className="text-slate-200">What's New</strong> changelog, so every school sees the
              update notes without a code deploy.
            </p>
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Version" hint="e.g. v1.4.0">
                  <Input required value={releaseForm.version} onChange={(e) => setReleaseForm({ ...releaseForm, version: e.target.value })} placeholder="v1.4.0" className="border-white/15 bg-white/10 text-white" />
                </Field>
                <Field label="Title" hint="Short headline">
                  <Input required value={releaseForm.title} onChange={(e) => setReleaseForm({ ...releaseForm, title: e.target.value })} placeholder="e.g. Fees module, exam clashes" className="border-white/15 bg-white/10 text-white" />
                </Field>
              </div>
              <Field label="What changed" hint="One bullet per line">
                <Textarea rows={6} required value={releaseForm.notes} onChange={(e) => setReleaseForm({ ...releaseForm, notes: e.target.value })} placeholder={"• New Billing & Arrears tab in Fees\n• Exam clash detector\n• Faster report generation"} className="border-white/15 bg-white/10 text-white" />
              </Field>
            </div>
            <div className="mt-4 flex justify-end">
              <Button type="submit" loading={releaseBusy}><Send className="h-4 w-4" /> Publish release</Button>
            </div>
          </form>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-semibold text-white">Published releases</h3>
            {releases.length === 0 ? (
              <p className="mt-3 rounded-xl bg-white/5 px-4 py-6 text-center text-sm text-slate-400">
                No developer-published releases yet.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {releases.map((r) => (
                  <li key={r.version} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-300 ring-1 ring-emerald-500/30">{r.version}</span>
                      <p className="font-semibold text-white">{r.title}</p>
                      <span className="ml-auto text-[11px] text-slate-500">{new Date(r.date).toLocaleDateString("en-GB")}</span>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {r.notes.map((n, i) => (
                        <li key={i} className="text-xs text-slate-300">• {n}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === "reset" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Eraser className="h-5 w-5 text-rose-300" /> Factory reset — hand a new buyer a clean system
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              Clears <strong className="text-white">everything the school has entered</strong> and resets the license
              to a brand-new trial, so the Super Admin / Admin receives a fresh install on first use. Your
              developer data is untouched — accounts, roles, school profile, curriculum, licensing records and
              the vendor directory all stay.
            </p>
          </div>

          {resetResult ? (
            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-6">
              <p className="flex items-center gap-2 font-semibold text-emerald-300">
                <CheckCircle2 className="h-5 w-5" /> Factory reset complete
              </p>
              <p className="mt-2 text-sm leading-relaxed text-emerald-200/90">{resetResult}</p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h4 className="text-sm font-bold uppercase tracking-wider text-emerald-300">What is kept</h4>
                <ul className="mt-3 space-y-2">
                  {KEEP_LABELS.map((l) => (
                    <li key={l} className="flex items-start gap-2 text-sm text-slate-300">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> {l}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-xl bg-white/5 px-3 py-2">
                    <p className="text-lg font-bold text-emerald-300">{resetInfo?.kept.users ?? "—"}</p>
                    <p className="text-[11px] text-slate-400">user accounts</p>
                  </div>
                  <div className="rounded-xl bg-white/5 px-3 py-2">
                    <p className="text-lg font-bold text-emerald-300">{resetInfo?.kept.classes ?? "—"}</p>
                    <p className="text-[11px] text-slate-400">classes kept</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-rose-400/25 bg-rose-500/5 p-5">
                <h4 className="text-sm font-bold uppercase tracking-wider text-rose-300">What is cleared</h4>
                <p className="mt-1 text-xs text-slate-400">
                  Students · parents · teachers · staff · enrollments · attendance · assessments & SBA · mocks ·
                  report cards · promotions · fees & expenses · online payments · admissions · website content ·
                  library · hostel · transport · clinic · discipline · clubs · inventory · payroll · messages ·
                  notifications · audit logs — and the license resets to a fresh trial.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-xl bg-rose-500/10 px-3 py-2">
                    <p className="text-lg font-bold text-rose-300">{resetInfo?.total ?? "…"}</p>
                    <p className="text-[11px] text-slate-400">records will be deleted</p>
                  </div>
                  <div className="rounded-xl bg-rose-500/10 px-3 py-2">
                    <p className="text-lg font-bold text-rose-300">{resetInfo?.licenseStatus ?? "—"}</p>
                    <p className="text-[11px] text-slate-400">license → new TRIAL</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!resetResult && (
            <form onSubmit={doReset} className="rounded-2xl border border-rose-400/30 bg-rose-500/5 p-6">
              <p className="text-sm font-bold text-rose-200">
                ⚠️ This permanently deletes all school data. There is no undo.
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Only do this before handing the system to a new buyer. Type <span className="font-mono font-bold text-rose-300">RESET</span> to confirm.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <input
                  value={resetConfirm}
                  onChange={(e) => setResetConfirm(e.target.value)}
                  placeholder="Type RESET to confirm"
                  className="w-56 rounded-lg border border-white/15 bg-white/10 px-3 py-2 font-mono text-sm text-white outline-none placeholder:text-slate-500 focus:border-rose-400/60 focus:ring-2 focus:ring-rose-500/30"
                />
                <button
                  type="submit"
                  disabled={resetBusy || resetConfirm.trim().toUpperCase() !== "RESET"}
                  className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {resetBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eraser className="h-4 w-4" />}
                  {resetBusy ? "Clearing everything…" : "Clear everything for fresh use"}
                </button>
              </div>
              {resetError && <p className="mt-3 text-sm font-medium text-rose-300">{resetError}</p>}
            </form>
          )}
        </div>
      )}

      {tab === "samples" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <BookOpenText className="h-5 w-5 text-sky-300" /> Sample lesson notes — publish to every school
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              Upload GES/NaCCA lesson plans here and they appear instantly in <strong className="text-white">Teacher Tools → Lesson Notes → From samples</strong>
              at every school — browsable by class level and subject, copyable, and downloadable as PDFs alongside the 42 built-in notes.
            </p>

            <form onSubmit={saveSample} className="mt-5 grid gap-4 lg:grid-cols-2">
              <Field label="Class level" hint="e.g. JHS 2 — this drives the level filter in the sample picker">
                <input
                  list="dev-sample-levels"
                  value={sampleForm.level}
                  onChange={(e) => setSampleForm({ ...sampleForm, level: e.target.value })}
                  placeholder="JHS 2"
                  required
                  className="w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/60 focus:ring-2 focus:ring-sky-500/30"
                />
                <datalist id="dev-sample-levels">
                  {SAMPLE_LEVELS.map((l) => <option key={l} value={l} />)}
                </datalist>
              </Field>
              <Field label="Subject" hint="Start typing to pick from the curriculum list">
                <input
                  list="dev-sample-subjects"
                  value={sampleForm.subject}
                  onChange={(e) => setSampleForm({ ...sampleForm, subject: e.target.value })}
                  placeholder="Mathematics"
                  required
                  className="w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/60 focus:ring-2 focus:ring-sky-500/30"
                />
                <datalist id="dev-sample-subjects">
                  {SAMPLE_SUBJECT_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
                </datalist>
              </Field>
              <Field label="Topic" className="lg:col-span-2">
                <Input value={sampleForm.topic} onChange={(e) => setSampleForm({ ...sampleForm, topic: e.target.value })} placeholder="Fractions: Addition and Subtraction" required className="border-white/15 bg-white/10 text-white" />
              </Field>
              <Field label="Week"><Input type="number" min={1} max={16} value={sampleForm.week} onChange={(e) => setSampleForm({ ...sampleForm, week: e.target.value })} className="border-white/15 bg-white/10 text-white" /></Field>
              <Field label="Duration"><Input value={sampleForm.duration} onChange={(e) => setSampleForm({ ...sampleForm, duration: e.target.value })} placeholder="40 minutes" className="border-white/15 bg-white/10 text-white" /></Field>
              <Field label="Learning objectives" className="lg:col-span-2"><Textarea value={sampleForm.objectives} onChange={(e) => setSampleForm({ ...sampleForm, objectives: e.target.value })} rows={3} className="border-white/15 bg-white/10 text-white" placeholder="By the end of the lesson, learners will be able to…" /></Field>
              <Field label="Teaching & learning resources" className="lg:col-span-2"><Textarea value={sampleForm.resources} onChange={(e) => setSampleForm({ ...sampleForm, resources: e.target.value })} rows={2} className="border-white/15 bg-white/10 text-white" placeholder="Charts, counters, flashcards, exercise books…" /></Field>
              <Field label="Starter / introduction" className="lg:col-span-2"><Textarea value={sampleForm.activityIntro} onChange={(e) => setSampleForm({ ...sampleForm, activityIntro: e.target.value })} rows={2} className="border-white/15 bg-white/10 text-white" /></Field>
              <Field label="Main activity" className="lg:col-span-2"><Textarea value={sampleForm.activityMain} onChange={(e) => setSampleForm({ ...sampleForm, activityMain: e.target.value })} rows={4} className="border-white/15 bg-white/10 text-white" /></Field>
              <Field label="Plenary / assessment" className="lg:col-span-2"><Textarea value={sampleForm.activityPlenary} onChange={(e) => setSampleForm({ ...sampleForm, activityPlenary: e.target.value })} rows={2} className="border-white/15 bg-white/10 text-white" /></Field>
              <Field label="Homework / extension" className="lg:col-span-2"><Textarea value={sampleForm.homework} onChange={(e) => setSampleForm({ ...sampleForm, homework: e.target.value })} rows={2} className="border-white/15 bg-white/10 text-white" /></Field>
              <div className="lg:col-span-2">
                <button
                  type="submit"
                  disabled={samplesBusy}
                  className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {samplesBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {samplesBusy ? "Publishing…" : "Publish to all schools"}
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-sky-300">
              <PlusCircle className="h-4 w-4" /> Uploaded by you ({devSamples.length})
            </h4>
            {devSamples.length === 0 ? (
              <p className="mt-4 rounded-xl bg-white/5 px-4 py-6 text-center text-sm text-slate-400">
                Nothing uploaded yet — the form above publishes a note to every school's sample library.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {devSamples.map((s) => (
                  <li key={s.key} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-sky-500/15 px-2.5 py-0.5 text-xs font-bold text-sky-300 ring-1 ring-sky-500/30">{s.level}</span>
                        <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-300 ring-1 ring-emerald-500/30">{s.subject}</span>
                        <span className="ml-auto text-[11px] text-slate-500">Week {s.week} · {s.duration}</span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-white">{s.topic}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">{s.objectives}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <a
                        href={`/api/lessons/samples/${s.key}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        title="Download as PDF"
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-sky-300"
                      >
                        <FileText className="h-4 w-4" />
                      </a>
                      <button
                        onClick={() => deleteSample(s.key)}
                        disabled={sampleBusyId === s.key}
                        title="Delete"
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-500/20 hover:text-rose-300 disabled:opacity-50"
                      >
                        {sampleBusyId === s.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === "feedback" && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Lightbulb className="h-5 w-5 text-amber-300" /> School suggestions
            {suggestions.filter((s) => s.status === "NEW").length > 0 && (
              <span className="ml-2 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-300 ring-1 ring-amber-500/40">
                {suggestions.filter((s) => s.status === "NEW").length} new
              </span>
            )}
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            Everything schools send through the in-app suggestion box — especially during trial. Mark them
            reviewed / done / declined, or delete spam.
          </p>
          {suggestions.length === 0 ? (
            <p className="mt-4 rounded-xl bg-white/5 px-4 py-8 text-center text-sm text-slate-400">
              No suggestions yet — the floating “Suggestion” button appears for every signed-in user.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {suggestions.map((s) => (
                <li key={s.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-300 ring-1 ring-emerald-500/30">{s.category}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${SUGGESTION_TONE[s.status] ?? SUGGESTION_TONE.NEW}`}>
                      {SUGGESTION_LABEL[s.status] ?? s.status}
                    </span>
                    <span className="ml-auto text-[11px] text-slate-500">
                      {s.user.fullName} · {s.user.email} · {new Date(s.createdAt).toLocaleDateString("en-GB")}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{s.message}</p>
                  {s.contact && (
                    <p className="mt-1 text-[11px] text-slate-400">Reply to: <span className="font-mono">{s.contact}</span></p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {(["REVIEWED", "DONE", "DECLINED"] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setSuggestionStatus(s.id, st)}
                        disabled={suggestBusy === s.id}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                          s.status === st
                            ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                            : "bg-white/10 text-slate-300 hover:bg-white/20"
                        }`}
                      >
                        {SUGGESTION_LABEL[st]}
                      </button>
                    ))}
                    <button
                      onClick={() => deleteSuggestion(s.id)}
                      disabled={suggestBusy === s.id}
                      className="ml-auto rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-500/20 hover:text-rose-300"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import {
  ArrowRight, MonitorSmartphone, Globe, Smartphone, CheckCircle2, Wallet,
  CreditCard, MessageSquare, FileText, BarChart3, ShieldCheck, GraduationCap,
  Phone, Mail, MessageCircle, Building2, Play, Sparkles, Star, Users,
  ClipboardList, Zap, Lock,
} from "lucide-react";
import { getSchool } from "@/lib/school";
import { getLicenseConfig } from "@/lib/license";
import { BuyNowCheckout, PlanButton, type BuyPlan } from "@/components/site/buy-now-checkout";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Buy this system · GES School MIS" };

const DEV = {
  name: "shacomputec",
  phone: "+233 530 941 750",
  phoneHref: "tel:+233530941750",
  email: "shacomputecgh@gmail.com",
  whatsapp: "https://wa.me/233530941750",
};

const PLANS = [
  {
    id: "1m" as BuyPlan["id"],
    dur: "1 Month",
    price: 300,
    schoolCount: 1,
    detail: "PRY / JHS only",
    featured: false,
    color: "from-emerald-500 to-teal-600",
    badge: "Starter",
  },
  {
    id: "12m_basic" as any,
    dur: "12 Months",
    price: 2500,
    schoolCount: 2,
    detail: "PRY and JHS",
    featured: false,
    color: "from-sky-500 to-blue-600",
    badge: "Best Value",
  },
  {
    id: "12m" as BuyPlan["id"],
    dur: "12 Months",
    price: 2800,
    schoolCount: 2,
    detail: "PRY, JHS and SHS",
    featured: true,
    color: "from-primary to-emerald-700",
    badge: "Most Popular",
  },
  {
    id: "24m" as BuyPlan["id"],
    dur: "24 Months",
    price: 4000,
    schoolCount: 3,
    detail: "PRY, JHS and SHS",
    featured: false,
    color: "from-amber-500 to-orange-600",
    badge: "Premium",
  },
];

const FEATURES = [
  { icon: MonitorSmartphone, t: "One system, three devices", d: "Your school website + Windows desktop app + Android app — all on one live database. Save a score on the phone, see it on the desktop instantly." },
  { icon: FileText, t: "Assessments & Report Cards", d: "GES/NaCCA-aligned SBA (class work, projects, tests, practicals, homework), one-page A4 report cards, Master & Broad Sheet and BECE/WASSCE mock analysis." },
  { icon: CreditCard, t: "Online Payments", d: "MTN MoMo, AirtelTigo, Telecel and Paystack with automatic receipts — parents pay online, your school uses its own payment accounts." },
  { icon: MessageSquare, t: "Messaging Center", d: "Email, WhatsApp and SMS to classes, staff, parents and students — reports, results and announcements in one click." },
  { icon: GraduationCap, t: "Result Checker & Admissions", d: "Secure OTP result checking for parents, online admission applications with document uploads, and student/parent portals." },
  { icon: Wallet, t: "Finance & Operations", d: "Fees, payroll & HR, expenses, library, hostel, transport, sick bay, discipline, clubs, inventory, staff leave and more." },
  { icon: BarChart3, t: "Academics for every level", d: "Crèche to Senior High — KG/Primary/JHS (grades 1–9) and SHS (letters), NaCCA courses and programmes, promotions and year-end rollover." },
  { icon: ShieldCheck, t: "Secure & private", d: "Role-based access, encrypted records, audit logs, backups, developer-only licensing — and three UI themes (Light · Dark · Gold)." },
];

export default async function BuyPage() {
  const school = await getSchool();
  const name = school?.name ?? "this school";
  const license = await getLicenseConfig();

  return (
    <div className="min-h-screen">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_300px_at_80%_-20%,rgb(5_150_105/0.5),transparent_60%),radial-gradient(500px_280px_at_10%_110%,rgb(217_119_6/0.35),transparent_55%)]" />
        <div className="container-x relative py-20">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" />
            GES School MIS
          </div>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">
            The complete management system for{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-amber-400 bg-clip-text text-transparent">
              Ghana&apos;s schools
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-slate-300">
            Runs your whole school on <strong className="text-white">one live database</strong> —
            the website, a Windows desktop app and an Android app — from Crèche to Senior High,
            following the GES/NaCCA curriculum. One purchase, everything included.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href="#pricing" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:shadow-emerald-500/40 hover:scale-[1.02]">
              View Plans & Pricing <ArrowRight className="h-4 w-4" />
            </a>
            <a href="#demo" className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10">
              <Play className="h-4 w-4" /> Try Free Demo
            </a>
          </div>
          <div className="mt-8 flex flex-wrap gap-2 text-xs font-semibold text-slate-300">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10"><Globe className="h-3.5 w-3.5 text-emerald-300" /> School website</span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10"><MonitorSmartphone className="h-3.5 w-3.5 text-emerald-300" /> Windows app</span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10"><Smartphone className="h-3.5 w-3.5 text-emerald-300" /> Android app</span>
          </div>
        </div>
      </section>

      {/* ── Free Trial / Demo ───────────────────────────────────────── */}
      <section id="demo" className="border-b border-slate-200/70 bg-gradient-to-br from-emerald-50 via-white to-teal-50/60">
        <div className="container-x grid gap-10 py-16 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-700">
              <Play className="h-3 w-3" /> Free Trial
            </div>
            <h2 className="mt-4 text-3xl font-bold text-ink">Try it before you buy</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-slate-600">
              Explore the full system with a <strong>free trial</strong> — no credit card required.
              See how the dashboard, students, fees, results and every module works before making
              a decision. The demo runs on a live server with sample data so you can experience
              exactly what your school will get.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:shadow-emerald-500/40 hover:scale-[1.02]"
              >
                <Play className="h-4 w-4" /> Launch Free Demo
              </Link>
              <a href={DEV.whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700">
                <MessageCircle className="h-4 w-4" /> Ask for a walkthrough
              </a>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-extrabold text-emerald-600">210+</p>
                <p className="mt-1 text-xs font-medium text-slate-500">Pages & modules</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-extrabold text-emerald-600">3</p>
                <p className="mt-1 text-xs font-medium text-slate-500">Apps in one system</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-extrabold text-emerald-600">GES</p>
                <p className="mt-1 text-xs font-medium text-slate-500">NaCCA aligned</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="bg-slate-900 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-400" />
                  <span className="h-3 w-3 rounded-full bg-amber-400" />
                  <span className="h-3 w-3 rounded-full bg-emerald-400" />
                  <span className="ml-3 text-xs font-medium text-slate-400">GES School MIS — Demo</span>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white">
                    <GraduationCap className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Shacomputec International School</p>
                    <p className="text-xs text-slate-500">Super Admin · Developer</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {["Dashboard", "Students", "Assessments", "Fees", "Reports", "Settings"].map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="text-xs font-medium text-slate-600">{item}</span>
                      <span className="ml-auto text-[10px] text-slate-400">✓</span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-center text-xs text-slate-400">
                  Click &quot;Launch Free Demo&quot; to explore the full system →
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing Plans ────────────────────────────────────────────── */}
      <section id="pricing" className="container-x py-16">
        <div className="mb-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-700">
            <Wallet className="h-3 w-3" /> Pricing
          </div>
          <h2 className="mt-4 text-3xl font-bold text-ink">Simple, transparent plans</h2>
          <p className="mt-3 text-[15px] text-slate-600">
            Pay once, use for the full period. Each plan includes the website, desktop app, Android app
            and all updates. When your subscription expires, the system locks automatically until you renew.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p) => (
            <div
              key={p.dur + p.price}
              className={`card relative overflow-hidden p-6 transition-all duration-300 ${
                p.featured
                  ? "ring-2 ring-primary shadow-xl shadow-primary/10 scale-[1.02]"
                  : "hover:shadow-lg hover:-translate-y-1"
              }`}
            >
              {p.featured && (
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-emerald-500" />
              )}
              <span className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${p.color} px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm`}>
                {p.featured && <Star className="h-3 w-3" />}
                {p.badge}
              </span>
              <p className="mt-4 text-sm font-bold uppercase tracking-widest text-slate-500">{p.dur}</p>
              <p className="mt-2 text-4xl font-extrabold text-ink">
                GH₵<span className="text-3xl">{p.price.toLocaleString()}</span>
              </p>
              <p className="mt-1 text-xs text-slate-400">one-time payment</p>

              <div className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                <Building2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-800">
                  {p.schoolCount} school{p.schoolCount > 1 ? "s" : ""} hosted
                </span>
              </div>
              <p className="mt-2 text-[13px] font-medium text-slate-600">{p.detail}</p>

              <PlanButton
                featured={p.featured}
                plan={{ id: p.id as any, label: p.dur, amount: p.price, schools: p.schoolCount }}
              />
            </div>
          ))}
        </div>

        {/* Contact for more */}
        <div className="mt-8 flex flex-col items-start gap-4 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Phone className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-bold text-slate-900">Need more than 3 schools or a longer term?</p>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
                Contact the developer for a custom multi-school package tailored to your needs.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <a href={DEV.whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600">
              <MessageCircle className="h-4 w-4" /> WhatsApp {DEV.name}
            </a>
            <a href={`mailto:${DEV.email}`} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:border-emerald-300">
              <Mail className="h-4 w-4" /> Email
            </a>
          </div>
        </div>
      </section>

      {/* ── Features Grid ──────────────────────────────────────────── */}
      <section className="border-y border-slate-200/70 bg-slate-50/80">
        <div className="container-x py-16">
          <div className="mb-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-sky-700">
              <Zap className="h-3 w-3" /> Everything included
            </div>
            <h2 className="mt-4 text-3xl font-bold text-ink">What your school gets</h2>
            <p className="mt-3 text-[15px] text-slate-600">
              A complete School Management &amp; Information System — academics, finance, communication
              and operations — ready for {name} and every class from Crèche to SHS.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.t} className="group card card-hover p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary transition group-hover:scale-110">
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-[15px] font-bold text-slate-900">{f.t}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How Licensing Works ─────────────────────────────────────── */}
      <section className="container-x py-16">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-violet-700">
              <Lock className="h-3 w-3" /> Licensing
            </div>
            <h2 className="mt-4 text-3xl font-bold text-ink">Simple, per-school licensing</h2>
            <ul className="mt-6 space-y-4">
              {[
                "Licensed per school with a unique activation code — your purchase includes the number of schools in your plan.",
                "Pay online (Paystack) or by direct mobile money; the license key is delivered instantly by SMS, WhatsApp and email.",
                "Includes the in-app User Guide, built-in updates and direct support from the developer.",
                "Schools run the system with their own payment and messaging accounts — fees and messages belong to the school.",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 text-[15px] text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-5">
            <div className="card p-6">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Users className="h-4 w-4 text-primary" /> Multi-school pricing
              </h3>
              <div className="mt-4 space-y-3">
                {PLANS.map((p) => (
                  <div key={p.dur + p.price} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{p.dur} — {p.schoolCount} school{p.schoolCount > 1 ? "s" : ""}</p>
                      <p className="text-xs text-slate-500">{p.detail}</p>
                    </div>
                    <p className="text-lg font-extrabold text-ink">GH₵{p.price.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="card p-6">
              <h3 className="text-sm font-bold text-slate-900">Prefer to talk first?</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-500">
                WhatsApp, call or email the developer — get a quote, a free demonstration and a customised package for your school.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <a href={DEV.whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
                <a href={`mailto:${DEV.email}`} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:border-emerald-300">
                  <Mail className="h-4 w-4" /> Email
                </a>
              </div>
              <div className="mt-5 rounded-xl border border-emerald-200/70 bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Developer contact</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{DEV.name}</p>
                <p className="text-sm text-slate-600">{DEV.phone} · {DEV.email}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ─────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-950 py-16 text-white">
        <div className="container-x text-center">
          <h2 className="text-3xl font-extrabold">Ready to transform your school?</h2>
          <p className="mt-4 mx-auto max-w-xl text-[15px] leading-relaxed text-slate-300">
            Start with a free trial, then pick the plan that fits your school.
            One purchase — website, desktop app, Android app — everything included.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/login" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:shadow-emerald-500/40 hover:scale-[1.02]">
              <Play className="h-4 w-4" /> Try Free Demo
            </Link>
            <a href="#pricing" className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-8 py-3.5 text-sm font-bold text-white transition hover:bg-white/10">
              View Plans & Pricing <ArrowRight className="h-4 w-4" />
            </a>
            <a href={DEV.whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-8 py-3.5 text-sm font-bold text-white transition hover:bg-white/10">
              <MessageCircle className="h-4 w-4" /> Contact Developer
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

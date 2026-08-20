import Link from "next/link";
import {
  ArrowRight, MonitorSmartphone, Globe, Smartphone, CheckCircle2, Wallet,
  CreditCard, MessageSquare, FileText, BarChart3, ShieldCheck, GraduationCap,
  Phone, Mail, MessageCircle, Building2,
} from "lucide-react";
import { getSchool } from "@/lib/school";
import { getLicenseConfig } from "@/lib/license";
import { BuyNowCheckout, PlanButton, type BuyPlan } from "@/components/site/buy-now-checkout";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Buy this system" };

const DEV = {
  name: "shacomputec",
  phone: "+233 530 941 750",
  phoneHref: "tel:+233530941750",
  email: "shacomputecgh@gmail.com",
  whatsapp: "https://wa.me/233530941750",
};

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
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_300px_at_80%_-20%,rgb(5_150_105/0.5),transparent_60%),radial-gradient(500px_280px_at_10%_110%,rgb(217_119_6/0.35),transparent_55%)]" />
        <div className="container-x relative py-20">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-300">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-amber-400 to-amber-600 text-[11px] font-black text-white">S</span>
            Built by shacomputec
          </div>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">
            The complete management system for <span className="text-gradient">Ghana&apos;s schools</span>
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-slate-300">
            GES School MIS runs your whole school on <strong className="text-white">one live database</strong> —
            the website, a Windows desktop app and an Android app — from Crèche to Senior High, following the
            GES/NaCCA curriculum. One purchase, everything included.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href={DEV.whatsapp} target="_blank" rel="noopener noreferrer" className="btn-accent">
              <MessageCircle className="h-4 w-4" /> WhatsApp for a quote
            </a>
            <a href={DEV.phoneHref} className="btn-outline border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white hover:border-white/40">
              <Phone className="h-4 w-4" /> Call {DEV.phone}
            </a>
          </div>
          <div className="mt-8 flex flex-wrap gap-2 text-xs font-semibold text-slate-300">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10"><Globe className="h-3.5 w-3.5 text-emerald-300" /> School website</span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10"><MonitorSmartphone className="h-3.5 w-3.5 text-emerald-300" /> Windows app</span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10"><Smartphone className="h-3.5 w-3.5 text-emerald-300" /> Android app</span>
          </div>
        </div>
      </section>

      {/* Subscription plans */}
      <section className="container-x py-16">
        <div className="mb-10 max-w-2xl">
          <p className="section-kicker text-primary">Subscription plans</p>
          <h2 className="mt-2 text-3xl font-bold text-ink">Simple monthly &amp; yearly plans</h2>
          <p className="mt-3 text-[15px] text-slate-600">
            Pay as you go, in Ghana cedis. Each plan hosts one or more school profiles —
            Primary/JHS and Senior High — on one live database. When your subscription
            period ends, the system locks automatically until you renew.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          {(
            [
              { id: "1m" as const, dur: "1 month", price: 250, schoolCount: 1, detail: "Primary / JHS only", featured: false },
              { id: "12m" as const, dur: "12 months", price: 2800, schoolCount: 2, detail: "Primary, JHS and SHS", featured: true },
              { id: "24m" as const, dur: "24 months", price: 4000, schoolCount: 3, detail: "Primary, JHS and SHS", featured: false },
            ] as Array<{ id: BuyPlan["id"]; dur: string; price: number; schoolCount: number; detail: string; featured: boolean }>
          ).map((p) => (
            <div key={p.dur} className={`card relative p-6 ${p.featured ? "ring-2 ring-primary shadow-lg" : ""}`}>
              {p.featured && (
                <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">Most popular</span>
              )}
              <p className="text-sm font-bold uppercase tracking-widest text-slate-500">{p.dur}</p>
              <p className="mt-3 text-4xl font-extrabold text-ink">GH₵{p.price.toLocaleString()}</p>
              <p className="mt-1 text-xs text-slate-500">one-time payment · auto-lock at expiry</p>
              <div className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                <Building2 className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-800">{p.schoolCount} school{p.schoolCount > 1 ? "s" : ""} hosted</span>
              </div>
              <p className="mt-2 text-[13px] text-slate-600">{p.detail}</p>
              <PlanButton featured={p.featured} plan={{ id: p.id, label: p.dur, amount: p.price, schools: p.schoolCount }} />
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-col items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-bold text-slate-900">Need more than 24 months or more than 3 schools?</p>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
                Custom multi-school packages and longer terms are available — contact the developer for a tailored quote.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <a href={DEV.whatsapp} target="_blank" rel="noopener noreferrer" className="btn-accent">
              <MessageCircle className="h-4 w-4" /> WhatsApp {DEV.name}
            </a>
            <a href={`mailto:${DEV.email}`} className="btn-outline">
              <Mail className="h-4 w-4" /> Email
            </a>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="container-x py-16">
        <div className="mb-10 max-w-2xl">
          <p className="section-kicker text-primary">Everything included</p>
          <h2 className="mt-2 text-3xl font-bold text-ink">What your school gets</h2>
          <p className="mt-3 text-[15px] text-slate-600">
            A complete School Management &amp; Information System — academics, finance, communication
            and operations — ready for {name} and every class from Crèche to SHS.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.t} className="card card-hover p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-[15px] font-bold text-slate-900">{f.t}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How licensing works */}
      <section className="border-y border-slate-200/70 bg-gradient-to-br from-amber-50 via-white to-orange-50/60">
        <div className="container-x grid gap-10 py-16 lg:grid-cols-2">
          <div>
            <p className="section-kicker text-amber-600">Licensing</p>
            <h2 className="mt-2 text-3xl font-bold text-ink">Simple, per-school licensing</h2>
            <ul className="mt-6 space-y-4">
              {[
                "Licensed per school with a unique activation code — your purchase includes " + license.freeSchools + " school " + (license.freeSchools === 1 ? "profile" : "profiles") + ", and every additional school after that is bought separately at the same one-time fee.",
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
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={DEV.whatsapp} target="_blank" rel="noopener noreferrer" className="btn-accent">
                <MessageCircle className="h-4 w-4" /> Ask for a quote
              </a>
              <a href={`mailto:${DEV.email}`} className="btn-outline">
                <Mail className="h-4 w-4" /> Email {DEV.email}
              </a>
            </div>
          </div>
          <BuyNowCheckout priceBasic={license.priceBasic} priceShs={license.priceShs} />
          <div className="card mt-5 p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Building2 className="h-4 w-4 text-primary" /> Multi-school pricing
            </h3>
            <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">Schools included</p>
                <p className="text-xs text-slate-500">in the one-time fee above</p>
              </div>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: Math.min(license.freeSchools, 8) }).map((_, i) => (
                  <span key={i} className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-300">✓</span>
                ))}
                {license.freeSchools > 8 && <span className="text-xs font-bold text-slate-500">+{license.freeSchools - 8}</span>}
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">Each extra school</p>
                <p className="text-xs text-slate-500">paid once, when you add it</p>
              </div>
              <p className="text-lg font-extrabold text-ink">GH₵{license.price.toLocaleString()}</p>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Run several schools on one system — every additional profile is bought separately and gets its own
              activation key and data. Your first {license.freeSchools} are part of the purchase.
            </p>
          </div>
          <div className="card mt-5 p-5">
            <h3 className="text-sm font-bold text-slate-900">Prefer to talk first?</h3>
            <div className="mt-4 space-y-4">
              <p className="text-[13px] leading-relaxed text-slate-500">WhatsApp, call or email the developer — get a quote, a free demonstration and a customised package for your school.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a href={DEV.whatsapp} target="_blank" rel="noopener noreferrer" className="btn-outline">
                <MessageCircle className="h-4 w-4" /> WhatsApp a quote
              </a>
              <a href={`mailto:${DEV.email}`} className="btn-outline">
                <Mail className="h-4 w-4" /> Email
              </a>
            </div>
            <div className="mt-5 rounded-xl border border-emerald-200/70 bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Developer contact (fixed)</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{DEV.name}</p>
              <p className="text-sm text-slate-600">{DEV.phone} · {DEV.email}</p>
            </div>
            <Link href="/admissions" className="btn-primary mt-6 w-full">
              Explore a school running this system <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
        </div>
      </section>
    </div>
  );
}

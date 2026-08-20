import Link from "next/link";
import {
  Mail, Phone, MessageCircle, Globe, ArrowRight, Play,
  CheckCircle2, Building2, Star, Sparkles, Wallet, Shield,
  GraduationCap, Code, Users, BookOpen, Award,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "About the Developer · GES School MIS" };

const DEV = {
  name: "shacomputec",
  realName: "Shacomputec",
  phone: "+233 530 941 750",
  phoneHref: "tel:+233530941750",
  email: "shacomputecgh@gmail.com",
  whatsapp: "https://wa.me/233530941750",
  photo: "/developer/photo1.jpg",
};

const CREDENTIALS = [
  { icon: GraduationCap, title: "GES Qualified Teacher", desc: "Licensed professional teacher certified by the Ghana Education Service" },
  { icon: Code, title: "Software Developer", desc: "Full-stack developer specializing in school management systems" },
  { icon: Shield, title: "System Architect", desc: "Designed and built the complete GES School MIS from the ground up" },
  { icon: Award, title: "Education Technology", desc: "Combining teaching expertise with modern technology for Ghanaian schools" },
];

const PLANS = [
  { dur: "1 Month", price: 300, schools: 1, detail: "PRY / JHS only", badge: "Starter", color: "from-emerald-500 to-teal-600" },
  { dur: "12 Months", price: 2500, schools: 2, detail: "PRY and JHS", badge: "Best Value", color: "from-sky-500 to-blue-600" },
  { dur: "12 Months", price: 2800, schools: 2, detail: "PRY, JHS and SHS", badge: "Most Popular", color: "from-primary to-emerald-700", featured: true },
  { dur: "24 Months", price: 4000, schools: 3, detail: "PRY, JHS and SHS", badge: "Premium", color: "from-amber-500 to-orange-600" },
];

export default function DeveloperPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Hero with Profile ──────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_400px_at_70%_-10%,rgb(5_150_105/0.4),transparent_60%)]" />
        <div className="container-x relative py-16">
          <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-start">
            {/* Profile Photo */}
            <div className="relative shrink-0">
              <div className="h-48 w-48 overflow-hidden rounded-3xl border-4 border-white/20 shadow-2xl shadow-emerald-500/20 lg:h-56 lg:w-56">
                <img
                  src={DEV.photo}
                  alt={DEV.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="absolute -bottom-3 -right-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </div>

            {/* Info */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-300">
                <Sparkles className="h-3.5 w-3.5" />
                Developer & Creator
              </div>
              <h1 className="mt-4 text-4xl font-extrabold sm:text-5xl">
                {DEV.realName}
              </h1>
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-slate-300">
                GES Qualified Professional Licensed Teacher &amp; Software Developer.
                Built the complete GES School MIS to transform how schools in Ghana manage
                academics, finance and operations.
              </p>

              {/* Quick Stats */}
              <div className="mt-6 flex flex-wrap justify-center gap-4 lg:justify-start">
                <div className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2.5 ring-1 ring-white/10">
                  <GraduationCap className="h-4 w-4 text-emerald-300" />
                  <span className="text-sm font-semibold">GES Licensed Teacher</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2.5 ring-1 ring-white/10">
                  <Code className="h-4 w-4 text-emerald-300" />
                  <span className="text-sm font-semibold">Software Developer</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2.5 ring-1 ring-white/10">
                  <BookOpen className="h-4 w-4 text-emerald-300" />
                  <span className="text-sm font-semibold">Education Expert</span>
                </div>
              </div>

              {/* Contact Buttons */}
              <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
                <a href={DEV.whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:shadow-emerald-500/40 hover:scale-[1.02]">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
                <a href={DEV.phoneHref} className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10">
                  <Phone className="h-4 w-4" /> Call {DEV.phone}
                </a>
                <a href={`mailto:${DEV.email}`} className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10">
                  <Mail className="h-4 w-4" /> Email
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Credentials ───────────────────────────────────────────── */}
      <section className="container-x py-16">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-violet-700">
            <Award className="h-3 w-3" /> Credentials
          </div>
          <h2 className="mt-4 text-3xl font-bold text-ink">Professional Background</h2>
          <p className="mt-3 mx-auto max-w-2xl text-[15px] text-slate-600">
            Combining deep education expertise with cutting-edge software development
            to build systems that truly serve Ghanaian schools.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CREDENTIALS.map((c) => (
            <div key={c.title} className="group card card-hover p-6 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary transition group-hover:scale-110">
                <c.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-[15px] font-bold text-slate-900">{c.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-500">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Free Trial / Demo ─────────────────────────────────────── */}
      <section className="border-y border-slate-200/70 bg-gradient-to-br from-emerald-50 via-white to-teal-50/60">
        <div className="container-x py-16">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-700">
              <Play className="h-3 w-3" /> Free Trial
            </div>
            <h2 className="mt-4 text-3xl font-bold text-ink">Try GES School MIS — Free</h2>
            <p className="mt-4 mx-auto max-w-2xl text-[15px] leading-relaxed text-slate-600">
              Explore the full management system with a <strong>free trial</strong> — no credit card required.
              See the dashboard, students, fees, results and every module. The demo runs on a live server
              with sample data so you experience exactly what your school will get.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:shadow-emerald-500/40 hover:scale-[1.02]"
              >
                <Play className="h-5 w-5" /> Launch Free Demo
              </Link>
              <a href={DEV.whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-8 py-4 text-base font-bold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700">
                <MessageCircle className="h-5 w-5" /> Ask for a walkthrough
              </a>
            </div>
            <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm text-slate-500">
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> No credit card required</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Full system access</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Sample data included</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> 210+ pages & modules</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing Plans ──────────────────────────────────────────── */}
      <section className="container-x py-16">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-700">
            <Wallet className="h-3 w-3" /> Pricing
          </div>
          <h2 className="mt-4 text-3xl font-bold text-ink">Simple, transparent plans</h2>
          <p className="mt-3 mx-auto max-w-2xl text-[15px] text-slate-600">
            Pay once, use for the full period. Each plan includes the website, desktop app, Android app
            and all updates. When your subscription expires, the system locks automatically until you renew.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p) => (
            <div
              key={p.dur + p.price}
              className={`card relative overflow-hidden p-6 transition-all duration-300 ${
                (p as any).featured
                  ? "ring-2 ring-primary shadow-xl shadow-primary/10 scale-[1.02]"
                  : "hover:shadow-lg hover:-translate-y-1"
              }`}
            >
              {(p as any).featured && (
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-emerald-500" />
              )}
              <span className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${p.color} px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm`}>
                {(p as any).featured && <Star className="h-3 w-3" />}
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
                  {p.schools} school{p.schools > 1 ? "s" : ""} hosted
                </span>
              </div>
              <p className="mt-2 text-[13px] font-medium text-slate-600">{p.detail}</p>
            </div>
          ))}
        </div>

        {/* Contact for more */}
        <div className="mt-8 flex flex-col items-start gap-4 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-bold text-slate-900">Need more than 3 schools or a longer term?</p>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
                Contact the developer for a custom multi-school package tailored to your needs.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <a href={DEV.whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
            <a href={`mailto:${DEV.email}`} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:border-emerald-300">
              <Mail className="h-4 w-4" /> Email
            </a>
          </div>
        </div>
      </section>

      {/* ── What the System Includes ──────────────────────────────── */}
      <section className="border-y border-slate-200/70 bg-white">
        <div className="container-x py-16">
          <div className="mb-10 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-sky-700">
              <Sparkles className="h-3 w-3" /> What you get
            </div>
            <h2 className="mt-4 text-3xl font-bold text-ink">The complete system</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "School website, Windows desktop app & Android app",
              "Students, teachers, staff & parents management",
              "Assessments, SBA & report cards (GES/NaCCA)",
              "Online payments (MoMo, Paystack, Telecel)",
              "Messaging (Email, WhatsApp, SMS)",
              "Result checker & online admissions",
              "Finance, fees, payroll & expenses",
              "Library, hostel, transport & inventory",
              "Timetable, attendance & discipline",
              "Three UI themes (Light · Dark · Gold)",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span className="text-sm font-medium text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ────────────────────────────────────────────── */}
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
            <Link href="/buy" className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-8 py-3.5 text-sm font-bold text-white transition hover:bg-white/10">
              View Plans & Pricing <ArrowRight className="h-4 w-4" />
            </Link>
            <a href={DEV.whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-8 py-3.5 text-sm font-bold text-white transition hover:bg-white/10">
              <MessageCircle className="h-4 w-4" /> Contact Developer
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

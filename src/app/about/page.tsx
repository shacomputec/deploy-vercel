import Link from "next/link";
import {
  Mail, Phone, MessageCircle, ArrowRight, Play, CheckCircle2,
  Building2, Star, Sparkles, Globe, Shield, Users, BookOpen,
  GraduationCap, Code, Award, Heart, Zap, Monitor, Smartphone,
  CreditCard, BarChart3, FileText, School, Laptop,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About GES School MIS — Ghana's Complete School Management System",
  description:
    "GES School MIS is a comprehensive school management system built for Ghanaian schools. Website, desktop app, Android app — all in one platform.",
  openGraph: {
    title: "About GES School MIS",
    description: "Ghana's complete school management system — website, desktop app, Android app.",
    images: ["/logo-login.jpg"],
  },
};

const STATS = [
  { value: "210+", label: "Pages & Modules", icon: Layers },
  { value: "3", label: "Platforms", icon: Globe },
  { value: "10+", label: "Languages", icon: BookOpen },
  { value: "24/7", label: "Offline Support", icon: Zap },
];

function Layers({ className }: { className?: string }) {
  return <BarChart3 className={className} />;
}

const PLATFORMS = [
  {
    icon: Globe,
    title: "Web Application",
    desc: "Full-featured school website with online admissions, result checker, payment portal and parent portal. Responsive design works on any device.",
    color: "from-emerald-500 to-teal-600",
    features: ["Online Admissions", "Result Checker", "Payment Portal", "Parent Portal", "Staff Directory", "Gallery & News"],
  },
  {
    icon: Laptop,
    title: "Windows Desktop App",
    desc: "Offline-first desktop application for schools with unreliable internet. Full sync when connected, seamless operation when offline.",
    color: "from-blue-500 to-indigo-600",
    features: ["Offline Mode", "Auto-Sync", "Auto-Update", "Multi-School", "3 Themes", "Print Reports"],
  },
  {
    icon: Smartphone,
    title: "Android App",
    desc: "Mobile app for teachers and administrators on the go. Mark attendance, enter grades, communicate with parents from anywhere.",
    color: "from-violet-500 to-purple-600",
    features: ["Attendance", "Grade Entry", "Parent Chat", "Fee Collection", "Push Notifications", "Camera Scanner"],
  },
];

const MODULES = [
  { icon: Users, title: "Student Management", desc: "Complete student lifecycle from admission to graduation" },
  { icon: BarChart3, title: "Assessments & Grades", desc: "GES/NaCCA compliant report cards, SBA tracking" },
  { icon: CreditCard, title: "Finance & Fees", desc: "Fee collection, invoicing, MoMo/Paystack/Telecel payments" },
  { icon: FileText, title: "Result Checker", desc: "Online result checking with PIN codes for students & parents" },
  { icon: School, title: "Admissions", desc: "Online applications, screening, enrollment and placement" },
  { icon: BookOpen, title: "Library", desc: "Catalog management, borrowing, returns and fines" },
  { icon: BarChart3, title: "Payroll & HR", desc: "Staff records, salary processing, deductions and payslips" },
  { icon: Globe, title: "Messaging", desc: "Email, WhatsApp and SMS communication with parents & staff" },
  { icon: Shield, title: "Attendance", desc: "Student and staff attendance with SMS alerts to parents" },
  { icon: FileText, title: "Timetable", desc: "Automatic timetable generation with conflict detection" },
  { icon: Building2, title: "Hostel & Transport", desc: "Boarding management and school bus tracking" },
  { icon: Award, title: "Inventory", desc: "Stock management, procurement and asset tracking" },
];

const LANGUAGES = [
  "English", "Twi", "Fante", "Ewe", "Ga", "Dagbani",
  "Hausa", "Frafra", "Dagaare", " Nzema",
];

const DEV_INFO = {
  name: "Shacomputec",
  photo: "/developer/photo1.jpg",
  phone: "+233 530 941 750",
  phoneHref: "tel:+233530941750",
  email: "shacomputecgh@gmail.com",
  whatsapp: "https://wa.me/233530941750",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(800px_500px_at_50%_-10%,rgb(5_150_105/0.3),transparent_60%)]" />
        <div className="container-x relative py-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" /> About GES School MIS
          </div>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
            Ghana&apos;s Complete<br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              School Management System
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-relaxed text-slate-300">
            Built by a GES qualified teacher who understands the real challenges of managing schools
            in Ghana. Website, desktop app, Android app — one system, every platform, offline-ready.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:shadow-emerald-500/40 hover:scale-[1.02]"
            >
              <Play className="h-5 w-5" /> Try Free Demo
            </Link>
            <Link
              href="/buy"
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-8 py-4 text-base font-bold text-white transition hover:bg-white/10"
            >
              View Pricing <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────── */}
      <section className="relative -mt-8 z-10">
        <div className="container-x">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="card flex items-center gap-4 p-5 shadow-lg">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                  <s.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-ink">{s.value}</p>
                  <p className="text-[13px] font-medium text-slate-500">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The Story ─────────────────────────────────────────────── */}
      <section className="container-x py-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-700">
              <Heart className="h-3 w-3" /> Our Story
            </div>
            <h2 className="mt-4 text-3xl font-bold text-ink">
              Built by a teacher, for teachers
            </h2>
            <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-slate-600">
              <p>
                GES School MIS was born from a simple observation: Ghanaian schools were spending
                fortunes on imported software that didn&apos;t understand our education system.
                Report card formats were wrong. Payment methods didn&apos;t include Mobile Money.
                The Ghana Education Service had specific requirements that no foreign system met.
              </p>
              <p>
                As a GES qualified teacher with software development skills, I built the system
                I wished existed — one that speaks Twi, Fante and Ewe alongside English. One
                that understands NaCCA assessment standards. One that works offline when the
                internet drops, and syncs automatically when it returns.
              </p>
              <p>
                Today, GES School MIS serves schools across all 16 regions of Ghana, from
                single-classroom primary schools in rural communities to multi-campus SHS
                institutions in Accra and Kumasi.
              </p>
            </div>
          </div>
          <div className="relative">
            <div className="overflow-hidden rounded-3xl shadow-2xl">
              <img
                src={DEV_INFO.photo}
                alt="Shacomputec — Creator of GES School MIS"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="absolute -bottom-4 -left-4 rounded-2xl bg-white p-4 shadow-lg">
              <p className="text-sm font-bold text-ink">Shacomputec</p>
              <p className="text-[12px] text-slate-500">GES Licensed Teacher & Developer</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Platforms ─────────────────────────────────────────────── */}
      <section className="border-y border-slate-200/70 bg-white">
        <div className="container-x py-20">
          <div className="mb-12 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-blue-700">
              <Monitor className="h-3 w-3" /> Platforms
            </div>
            <h2 className="mt-4 text-3xl font-bold text-ink">One system, three platforms</h2>
            <p className="mt-3 mx-auto max-w-2xl text-[15px] text-slate-600">
              Access your school data from anywhere — web browser, desktop computer or mobile phone.
              All platforms share the same database and sync in real-time.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {PLATFORMS.map((p) => (
              <div key={p.title} className="group card card-hover overflow-hidden p-0">
                <div className={`bg-gradient-to-r ${p.color} p-6 text-white`}>
                  <p.icon className="h-10 w-10" />
                  <h3 className="mt-3 text-xl font-bold">{p.title}</h3>
                </div>
                <div className="p-6">
                  <p className="text-[14px] leading-relaxed text-slate-600">{p.desc}</p>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    {p.features.map((f) => (
                      <div key={f} className="flex items-center gap-2 text-[13px] text-slate-600">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Modules ───────────────────────────────────────────────── */}
      <section className="container-x py-20">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-violet-700">
            <Zap className="h-3 w-3" /> Modules
          </div>
          <h2 className="mt-4 text-3xl font-bold text-ink">Everything your school needs</h2>
          <p className="mt-3 mx-auto max-w-2xl text-[15px] text-slate-600">
            210+ pages covering every aspect of school management. Each module is designed
            specifically for the Ghanaian education system.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {MODULES.map((m) => (
            <div key={m.title} className="group card card-hover p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary transition group-hover:scale-110">
                <m.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-[15px] font-bold text-slate-900">{m.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Languages ─────────────────────────────────────────────── */}
      <section className="border-y border-slate-200/70 bg-gradient-to-br from-emerald-50 via-white to-teal-50/60">
        <div className="container-x py-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-700">
            <Globe className="h-3 w-3" /> Multi-Language
          </div>
          <h2 className="mt-4 text-3xl font-bold text-ink">Speaks your language</h2>
          <p className="mt-3 mx-auto max-w-2xl text-[15px] text-slate-600">
            Full interface available in Ghanaian languages — because every teacher and parent
            deserves to use technology in the language they&apos;re most comfortable with.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {LANGUAGES.map((lang) => (
              <span
                key={lang}
                className="rounded-full border border-emerald-200 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 hover:border-emerald-300"
              >
                {lang}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why GES School MIS ────────────────────────────────────── */}
      <section className="container-x py-20">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-700">
            <Award className="h-3 w-3" /> Why Choose Us
          </div>
          <h2 className="mt-4 text-3xl font-bold text-ink">Why schools choose GES School MIS</h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Shield, title: "Built for GES", desc: "NaCCA-compliant report cards, GES assessment standards, and proper grading systems built from the ground up." },
            { icon: Zap, title: "Offline-First", desc: "Works without internet. Desktop and mobile apps sync automatically when connection returns. Never lose data." },
            { icon: CreditCard, title: "Local Payments", desc: "MoMo, Paystack, Telecel — parents pay fees the way they already pay for everything else in Ghana." },
            { icon: Globe, title: "10 Languages", desc: "Full interface in English, Twi, Fante, Ewe, Ga, Dagbani, Hausa, Frafra, Dagaare and Nzema." },
            { icon: Code, title: "All-in-One", desc: "Website, desktop app, Android app — one purchase covers every platform. No per-user fees, no hidden costs." },
            { icon: Heart, title: "Local Support", desc: "Direct WhatsApp support from the developer. Fast responses, real solutions, not ticket queues." },
          ].map((item) => (
            <div key={item.title} className="group card card-hover p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md transition group-hover:scale-110">
                <item.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-[15px] font-bold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Contact / CTA ─────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-950 py-20 text-white">
        <div className="container-x">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-3xl font-extrabold">Ready to get started?</h2>
              <p className="mt-4 text-[15px] leading-relaxed text-slate-300">
                Try the free demo with sample data, then pick a plan that fits your school.
                One purchase — website, desktop app, Android app — everything included.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/login" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:shadow-emerald-500/40 hover:scale-[1.02]">
                  <Play className="h-4 w-4" /> Try Free Demo
                </Link>
                <Link href="/buy" className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-8 py-3.5 text-sm font-bold text-white transition hover:bg-white/10">
                  View Plans & Pricing <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
              <p className="text-sm font-bold uppercase tracking-widest text-emerald-300">Contact Developer</p>
              <div className="mt-5 space-y-4">
                <a href={DEV_INFO.whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                  <MessageCircle className="h-5 w-5 text-emerald-400" />
                  WhatsApp: {DEV_INFO.phone}
                </a>
                <a href={DEV_INFO.phoneHref} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                  <Phone className="h-5 w-5 text-emerald-400" />
                  Call: {DEV_INFO.phone}
                </a>
                <a href={`mailto:${DEV_INFO.email}`} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                  <Mail className="h-5 w-5 text-emerald-400" />
                  {DEV_INFO.email}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

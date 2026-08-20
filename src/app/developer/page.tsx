import Link from "next/link";
import {
  Mail, Phone, MessageCircle, Globe, ArrowRight, Play,
  CheckCircle2, Building2, Star, Sparkles, Wallet, Shield,
  GraduationCap, Code, Users, BookOpen, Award, Camera,
  ChevronLeft, ChevronRight, Quote, MapPin, Heart,
  Zap, Clock, Download, MonitorSmartphone, HelpCircle,
  Laptop, Smartphone, Globe2, HeadphonesIcon, CircleDollarSign,
  Timer, Rocket, UserPlus, Settings, CreditCard, BadgeCheck,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About the Developer · GES School MIS",
  description: "Meet Shacomputec — GES Qualified Licensed Teacher & Software Developer. Creator of the GES School MIS for Ghanaian schools.",
  openGraph: {
    title: "About the Developer · GES School MIS",
    description: "GES Qualified Professional Licensed Teacher & Software Developer. Built the complete GES School MIS.",
    images: ["/developer/photo1.jpg"],
  },
};

const DEV = {
  name: "shacomputec",
  realName: "Shacomputec",
  phone: "+233 530 941 750",
  phoneHref: "tel:+233530941750",
  email: "shacomputecgh@gmail.com",
  whatsapp: "https://wa.me/233530941750",
  photo: "/developer/photo1.jpg",
  location: "Ghana, West Africa",
};

const STATS = [
  { value: "210+", label: "Pages & Modules", icon: Layers },
  { value: "6", label: "Languages Supported", icon: Globe2 },
  { value: "3", label: "Platforms (Web/Desktop/Mobile)", icon: MonitorSmartphone },
  { value: "100%", label: "Offline Capable", icon: WifiOff },
];

function Layers(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" /><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" /><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
    </svg>
  );
}

function WifiOff(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="2" x2="22" y1="2" y2="22" /><path d="M8.5 16.5a5 5 0 0 1 7 0" /><path d="M2 8.82a15 15 0 0 1 4.17-2.65" /><path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76" /><path d="M16.85 11.25a10 10 0 0 1 2.22 1.68" /><path d="M5 12.55a10 10 0 0 1 5.17-2.39" /><line x1="12" x2="12.01" y1="20" y2="20" />
    </svg>
  );
}

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

const HOW_IT_WORKS = [
  { step: 1, icon: Rocket, title: "Try the Free Demo", desc: "Explore the full system with sample data — no signup needed. See every module in action." },
  { step: 2, icon: CreditCard, title: "Choose Your Plan", desc: "Pick a plan that fits your school. One-time payment — no hidden fees, no surprise charges." },
  { step: 3, icon: Settings, title: "We Set It Up", desc: "Your school data, students, teachers and classes are loaded into the system within 24 hours." },
  { step: 4, icon: Laptop, title: "Start Using It", desc: "Log in on the website, desktop app or Android app. Train your staff in minutes." },
];

const TESTIMONIALS = [
  {
    name: "Mrs. Akua Mensah",
    role: "Headmistress, St. Theresa RC School",
    location: "Kumasi, Ashanti Region",
    text: "GES School MIS has transformed how we manage our school. Report cards that took days now take minutes. The online payments feature has reduced parents' queues dramatically.",
    rating: 5,
  },
  {
    name: "Mr. Kwame Asante",
    role: "School Administrator, Hope Academy",
    location: "Accra, Greater Accra",
    text: "The desktop app is incredibly fast and works offline. When our internet goes down, we keep working. The student management and fee tracking are exactly what we needed.",
    rating: 5,
  },
  {
    name: "Nana Aba Osei",
    role: "Proprietress, Golden Star International School",
    location: "Takoradi, Western Region",
    text: "We run both PRY and JHS sections. Having everything in one system — admissions, results, fees, library — saves us so much time and money. Highly recommended!",
    rating: 5,
  },
  {
    name: "Mr. Emmanuel Boateng",
    role: "ICT Coordinator, Success Academy",
    location: "Tamale, Northern Region",
    text: "The Android app is perfect for our teachers. They can mark attendance, enter grades, and communicate with parents right from their phones. The GES/NaCCA format is spot on.",
    rating: 5,
  },
];

const PHOTOS = [
  { src: "/developer/photo1.jpg", alt: "Shacomputec — Developer" },
  { src: "/developer/photo2.jpg", alt: "Shacomputec — At work" },
];

const FEATURES = [
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
];

const FAQS = [
  {
    q: "Does it work offline?",
    a: "Yes! The Windows desktop app works fully offline. When the internet is back, data syncs automatically. The Android app also supports offline mode for attendance and basic tasks.",
  },
  {
    q: "Is it aligned with GES / NaCCA curriculum?",
    a: "Absolutely. Report cards, assessments and grading follow the official GES and NaCCA formats. The system uses standard Ghanaian subject codes and grading scales.",
  },
  {
    q: "What payment methods are accepted?",
    a: "We accept Mobile Money (MTN, Vodafone, AirtelTigo), Paystack (cards & bank transfers), and Telecel Cash. Parents can also pay directly through the school's online portal.",
  },
  {
    q: "Can I add more schools later?",
    a: "Yes. Start with one school and upgrade anytime. Contact us for a custom multi-school package — we offer special rates for 3+ schools.",
  },
  {
    q: "Do you provide training and support?",
    a: "Yes! Every subscription includes free onboarding support via WhatsApp and phone. We help set up your school, import data and train your staff. Premium plans include priority support.",
  },
  {
    q: "What happens when my subscription expires?",
    a: "The system locks automatically — your data is safe and preserved. Renew your subscription to unlock everything again. No data is ever lost.",
  },
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
                  loading="eager"
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
                  <MapPin className="h-4 w-4 text-emerald-300" />
                  <span className="text-sm font-semibold">{DEV.location}</span>
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

      {/* ── Key Stats ──────────────────────────────────────────────── */}
      <section className="border-b border-slate-200/70 bg-white">
        <div className="container-x py-10">
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                  <s.icon className="h-5 w-5" />
                </span>
                <p className="mt-3 text-2xl font-extrabold text-slate-900">{s.value}</p>
                <p className="mt-1 text-[13px] text-slate-500">{s.label}</p>
              </div>
            ))}
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

      {/* ── Photo Gallery ─────────────────────────────────────────── */}
      <section className="border-y border-slate-200/70 bg-white">
        <div className="container-x py-16">
          <div className="mb-10 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-pink-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-pink-700">
              <Camera className="h-3 w-3" /> Gallery
            </div>
            <h2 className="mt-4 text-3xl font-bold text-ink">Behind the Build</h2>
            <p className="mt-3 mx-auto max-w-2xl text-[15px] text-slate-600">
              From the classroom to the code editor — see the person behind GES School MIS.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {PHOTOS.map((photo, i) => (
              <div key={i} className="group relative overflow-hidden rounded-2xl shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <p className="text-sm font-semibold">{photo.alt}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────── */}
      <section className="container-x py-16">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-700">
            <Rocket className="h-3 w-3" /> How It Works
          </div>
          <h2 className="mt-4 text-3xl font-bold text-ink">Get started in 4 simple steps</h2>
          <p className="mt-3 mx-auto max-w-2xl text-[15px] text-slate-600">
            From free trial to fully running system — it takes less than 24 hours.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((s) => (
            <div key={s.step} className="group relative">
              {/* Connector line */}
              {s.step < 4 && (
                <div className="absolute left-1/2 top-10 hidden h-0.5 w-full bg-gradient-to-r from-indigo-200 to-indigo-100 lg:block" />
              )}
              <div className="relative card card-hover p-6 text-center z-10">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-sm font-extrabold text-white shadow-md shadow-indigo-200">
                  {s.step}
                </div>
                <span className="mx-auto mt-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 transition group-hover:scale-110">
                  <s.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-3 text-[15px] font-bold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-500">{s.desc}</p>
              </div>
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

      {/* ── Testimonials ───────────────────────────────────────────── */}
      <section className="border-y border-slate-200/70 bg-gradient-to-br from-slate-50 to-emerald-50/30">
        <div className="container-x py-16">
          <div className="mb-10 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-rose-700">
              <Heart className="h-3 w-3" /> Testimonials
            </div>
            <h2 className="mt-4 text-3xl font-bold text-ink">Loved by schools across Ghana</h2>
            <p className="mt-3 mx-auto max-w-2xl text-[15px] text-slate-600">
              Hear from headmasters, administrators and teachers who use GES School MIS every day.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="group card card-hover p-6 relative">
                <div className="absolute top-4 right-4 opacity-10 transition group-hover:opacity-20">
                  <Quote className="h-12 w-12 text-primary" />
                </div>
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-[14px] leading-relaxed text-slate-600 italic">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-emerald-600 text-sm font-bold text-white">
                    {t.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{t.name}</p>
                    <p className="text-[12px] text-slate-500">{t.role}</p>
                    <p className="flex items-center gap-1 text-[11px] text-slate-400">
                      <MapPin className="h-3 w-3" /> {t.location}
                    </p>
                  </div>
                </div>
              </div>
            ))}
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
            {FEATURES.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-emerald-200 hover:bg-emerald-50/50">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span className="text-sm font-medium text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────── */}
      <section className="container-x py-16">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-orange-700">
            <HelpCircle className="h-3 w-3" /> FAQ
          </div>
          <h2 className="mt-4 text-3xl font-bold text-ink">Frequently asked questions</h2>
          <p className="mt-3 mx-auto max-w-2xl text-[15px] text-slate-600">
            Everything you need to know about GES School MIS before you get started.
          </p>
        </div>
        <div className="mx-auto max-w-3xl space-y-4">
          {FAQS.map((faq, i) => (
            <details key={i} className="group card overflow-hidden">
              <summary className="flex cursor-pointer items-center justify-between gap-4 p-5 text-[15px] font-semibold text-slate-900 select-none hover:bg-slate-50/50 transition">
                <span>{faq.q}</span>
                <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition group-open:rotate-45">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" /></svg>
                </span>
              </summary>
              <div className="border-t border-slate-100 px-5 pb-5 pt-4 text-[14px] leading-relaxed text-slate-600">
                {faq.a}
              </div>
            </details>
          ))}
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

import Link from "next/link";
import {
  BookOpen, ArrowRight, Calendar, Clock, Tag,
  MessageCircle, Sparkles, Monitor, Smartphone, Globe,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog · GES School MIS",
  description: "Articles, guides and updates about GES School MIS — the complete school management system for Ghanaian schools.",
};

const ARTICLES = [
  {
    slug: "getting-started-ges-school-mis",
    title: "Getting Started with GES School MIS",
    excerpt: "A complete beginner's guide to setting up and using GES School MIS for your school — from first login to generating report cards.",
    category: "Getting Started",
    readTime: "5 min read",
    date: "August 15, 2026",
    icon: Sparkles,
    color: "from-emerald-500 to-teal-600",
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-700",
    content: [
      "GES School MIS is designed to be intuitive from the moment you log in. Whether you're a headmistress, administrator, teacher orICT coordinator, this guide walks you through the essential first steps.",
      "Step 1: Log in to the dashboard using the credentials provided by your school administrator. The system works on the website, Windows desktop app and Android app — choose whichever suits you.",
      "Step 2: Navigate to the Dashboard to see a snapshot of your school — total students, staff, fees collected, upcoming events and recent activity. The dashboard updates in real-time.",
      "Step 3: Set up your academic structure by going to Settings → Classes. Create your class levels (e.g., KG1, KG2, Class 1–6 for PRY; B7–B9 for JHS) and assign teachers as class managers.",
      "Step 4: Add students through the Students module. You can import from a CSV file or add them one by one. Each student profile includes personal details, guardian info, medical notes and fee status.",
      "Step 5: Start entering grades. Go to Academics → Assessments, select the term and class, then enter grades for each subject. The system automatically calculates averages and generates GES/NaCCA-formatted report cards.",
      "Step 6: Generate and print report cards with one click. The reports follow the official GES format with grades, remarks, attendance and conduct — ready to hand to parents.",
      "That's it! Your school is now running on GES School MIS. From here, explore online payments, messaging, the library module and more.",
    ],
  },
  {
    slug: "offline-desktop-app-guide",
    title: "Working Offline with the Desktop App",
    excerpt: "How the Windows desktop app keeps your school running even when the internet goes down — and syncs automatically when it's back.",
    category: "Desktop App",
    readTime: "4 min read",
    date: "August 12, 2026",
    icon: Monitor,
    color: "from-blue-500 to-indigo-600",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
    content: [
      "One of the most requested features from Ghanaian schools is offline capability — and GES School MIS delivers. The Windows desktop app stores data locally so your school never stops working.",
      "How it works: When you install the desktop app, it creates a local copy of your school's data on the computer. You can add students, enter grades, track fees and generate report cards — all without internet.",
      "Automatic sync: The moment your internet connection returns, the desktop app automatically syncs all changes with the cloud server. No manual upload needed — it just happens in the background.",
      "Conflict resolution: If two users make changes to the same record while offline, the system intelligently merges them. The most recent change wins for simple fields, and both changes are preserved for complex records.",
      "Setup is simple: Download the installer, log in once with internet, and the app caches your data. After that, you're good to go offline. The app shows a sync status indicator so you always know your data is safe.",
      "This is especially valuable for schools in areas with unreliable internet. Your fees tracking, attendance, grades and reports continue working regardless of connectivity.",
    ],
  },
  {
    slug: "online-payments-momo-paystack",
    title: "Accepting Online Payments: MoMo, Paystack & Telecel",
    excerpt: "Set up Mobile Money, card payments and Telecel Cash so parents can pay fees from anywhere — reducing queues and missed payments.",
    category: "Payments",
    readTime: "4 min read",
    date: "August 8, 2026",
    icon: Tag,
    color: "from-amber-500 to-orange-600",
    bgColor: "bg-amber-50",
    textColor: "text-amber-700",
    content: [
      "GES School MIS supports three major payment methods used in Ghana: Mobile Money (MTN, Vodafone, AirtelTigo), Paystack (bank transfers and card payments), and Telecel Cash.",
      "Mobile Money integration allows parents to pay school fees directly from their phone. They receive an SMS with a payment link, tap it, confirm with their MoMo PIN, and the payment is recorded instantly in the system.",
      "Paystack handles card payments and bank transfers. Parents can pay with Visa, Mastercard or Verve cards, or transfer directly from their bank account. This is ideal for parents who prefer traditional banking.",
      "Telecel Cash support covers the growing number of Vodafone/Telecel subscribers. Same flow as MoMo — parents receive a link, pay on their phone, and the system updates automatically.",
      "For administrators: Go to Settings → Payment Gateways to configure your API keys. Each gateway works independently — you can enable one, two or all three. The system shows real-time payment status on the finance dashboard.",
      "Benefits: Parents can pay anytime, from anywhere. No more cash handling. Automatic receipt generation. Real-time fee tracking. Outstanding balance alerts sent via SMS and WhatsApp.",
    ],
  },
  {
    slug: "ges-nacca-report-cards",
    title: "Generating GES/NaCCA Report Cards",
    excerpt: "Step-by-step guide to creating official Ghana Education Service format report cards with correct grading, remarks and conduct scores.",
    category: "Academics",
    readTime: "6 min read",
    date: "August 3, 2026",
    icon: BookOpen,
    color: "from-violet-500 to-purple-600",
    bgColor: "bg-violet-50",
    textColor: "text-violet-700",
    content: [
      "GES School MIS generates report cards that match the official Ghana Education Service and National Council for Curriculum and Assessment (NaCCA) format — ready to print and distribute to parents.",
      "The grading system uses the standard GES scale: A (75–100 = Excellent), B (60–74 = Very Good), C (50–59 = Good), D (40–49 = Average), E (0–39 = Below Average). You can customize these ranges in Settings.",
      "Report card sections include: Student info, school header, term/academic year, subject-by-subject grades with teacher remarks, overall average, class position, attendance record, conduct/special duties, headteacher's comment and next-term dates.",
      "To generate: Go to Academics → Report Cards → Generate. Select the term, class and students. The system calculates all averages automatically and fills in the official format. Preview before printing.",
      "Print options: A4 landscape for standard printing, A5 for compact booklets. You can also export as PDF for email or WhatsApp sharing. The system supports batch printing for entire classes.",
      "Teacher remarks are auto-generated based on performance (e.g., 'Excellent work, keep it up!' for A-grade students), but teachers can customize individual remarks before finalizing.",
    ],
  },
  {
    slug: "multi-platform-experience",
    title: "One System, Three Platforms",
    excerpt: "How the website, desktop app and Android app work together to give your school complete coverage — in the office, at home and on the go.",
    category: "Platform",
    readTime: "3 min read",
    date: "July 28, 2026",
    icon: Globe,
    color: "from-rose-500 to-pink-600",
    bgColor: "bg-rose-50",
    textColor: "text-rose-700",
    content: [
      "GES School MIS is one unified system accessible through three platforms: a responsive website, a Windows desktop app and an Android mobile app. Each platform has its strengths.",
      "The Website is the most feature-complete option. Access it from any browser on any device — Windows, Mac, Linux, tablets. It includes every module, every page, and the full admin dashboard. Ideal for school offices.",
      "The Windows Desktop App is designed for speed and offline access. It loads instantly (no browser overhead), caches data locally, and keeps working when the internet drops. Perfect for bursars and administrators who need fast data entry.",
      "The Android App is built for teachers and parents on the move. Teachers can mark attendance, enter quick grades, and view their class lists from anywhere. Parents can check their ward's results, pay fees, and receive notifications.",
      "All three platforms share the same database — a change on the website appears on the desktop and mobile apps instantly (or when synced). No double-entry, no data conflicts. One source of truth for your entire school.",
    ],
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_400px_at_70%_-10%,rgb(5_150_105/0.4),transparent_60%)]" />
        <div className="container-x relative py-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-300">
            <BookOpen className="h-3.5 w-3.5" />
            Blog &amp; Guides
          </div>
          <h1 className="mt-4 text-4xl font-extrabold sm:text-5xl">
            Learn <span className="text-emerald-400">GES School MIS</span>
          </h1>
          <p className="mt-4 mx-auto max-w-2xl text-[15px] leading-relaxed text-slate-300">
            Guides, tutorials and updates to help you get the most out of the
            complete school management system for Ghanaian schools.
          </p>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="container-x py-14">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {ARTICLES.map((article) => (
            <Link
              key={article.slug}
              href={`/blog/${article.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-emerald-200"
            >
              {/* Category header */}
              <div className={`${article.bgColor} px-6 py-8 text-center`}>
                <span className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${article.color} text-white shadow-lg`}>
                  <article.icon className="h-7 w-7" />
                </span>
                <p className={`mt-3 text-xs font-bold uppercase tracking-widest ${article.textColor}`}>
                  {article.category}
                </p>
              </div>

              {/* Content */}
              <div className="flex flex-1 flex-col p-6">
                <h2 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition">
                  {article.title}
                </h2>
                <p className="mt-3 flex-1 text-[14px] leading-relaxed text-slate-500">
                  {article.excerpt}
                </p>
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> {article.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {article.readTime}
                    </span>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 group-hover:text-emerald-700 transition">
                    Read <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <div className="mx-auto max-w-lg rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/60 p-8">
            <h3 className="text-xl font-bold text-slate-900">Have a question?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Can&apos;t find what you&apos;re looking for? Reach out to the developer directly.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <a
                href="https://wa.me/233530941750"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:shadow-emerald-500/40 hover:scale-[1.02]"
              >
                <MessageCircle className="h-4 w-4" /> Ask on WhatsApp
              </a>
              <Link
                href="/developer"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
              >
                View Developer Profile <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

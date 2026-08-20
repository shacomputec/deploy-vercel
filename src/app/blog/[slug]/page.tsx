import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, Calendar, Clock, Tag, BookOpen,
  MessageCircle, ArrowRight,
} from "lucide-react";
import type { Metadata } from "next";

const ARTICLES: Record<string, {
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  date: string;
  color: string;
  bgColor: string;
  textColor: string;
  content: string[];
}> = {
  "getting-started-ges-school-mis": {
    title: "Getting Started with GES School MIS",
    excerpt: "A complete beginner's guide to setting up and using GES School MIS for your school — from first login to generating report cards.",
    category: "Getting Started",
    readTime: "5 min read",
    date: "August 15, 2026",
    color: "from-emerald-500 to-teal-600",
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-700",
    content: [
      "GES School MIS is designed to be intuitive from the moment you log in. Whether you're a headmistress, administrator, teacher or ICT coordinator, this guide walks you through the essential first steps.",
      "Step 1: Log in to the dashboard using the credentials provided by your school administrator. The system works on the website, Windows desktop app and Android app — choose whichever suits you.",
      "Step 2: Navigate to the Dashboard to see a snapshot of your school — total students, staff, fees collected, upcoming events and recent activity. The dashboard updates in real-time.",
      "Step 3: Set up your academic structure by going to Settings → Classes. Create your class levels (e.g., KG1, KG2, Class 1–6 for PRY; B7–B9 for JHS) and assign teachers as class managers.",
      "Step 4: Add students through the Students module. You can import from a CSV file or add them one by one. Each student profile includes personal details, guardian info, medical notes and fee status.",
      "Step 5: Start entering grades. Go to Academics → Assessments, select the term and class, then enter grades for each subject. The system automatically calculates averages and generates GES/NaCCA-formatted report cards.",
      "Step 6: Generate and print report cards with one click. The reports follow the official GES format with grades, remarks, attendance and conduct — ready to hand to parents.",
      "That's it! Your school is now running on GES School MIS. From here, explore online payments, messaging, the library module and more.",
    ],
  },
  "offline-desktop-app-guide": {
    title: "Working Offline with the Desktop App",
    excerpt: "How the Windows desktop app keeps your school running even when the internet goes down — and syncs automatically when it's back.",
    category: "Desktop App",
    readTime: "4 min read",
    date: "August 12, 2026",
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
  "online-payments-momo-paystack": {
    title: "Accepting Online Payments: MoMo, Paystack & Telecel",
    excerpt: "Set up Mobile Money, card payments and Telecel Cash so parents can pay fees from anywhere — reducing queues and missed payments.",
    category: "Payments",
    readTime: "4 min read",
    date: "August 8, 2026",
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
  "ges-nacca-report-cards": {
    title: "Generating GES/NaCCA Report Cards",
    excerpt: "Step-by-step guide to creating official Ghana Education Service format report cards with correct grading, remarks and conduct scores.",
    category: "Academics",
    readTime: "6 min read",
    date: "August 3, 2026",
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
  "multi-platform-experience": {
    title: "One System, Three Platforms",
    excerpt: "How the website, desktop app and Android app work together to give your school complete coverage — in the office, at home and on the go.",
    category: "Platform",
    readTime: "3 min read",
    date: "July 28, 2026",
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
};

export function generateStaticParams() {
  return Object.keys(ARTICLES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const article = ARTICLES[params.slug];
  if (!article) return { title: "Article Not Found" };
  return {
    title: `${article.title} · Blog · GES School MIS`,
    description: article.excerpt,
  };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const article = ARTICLES[params.slug];
  if (!article) notFound();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <section className={`${article.bgColor} py-16`}>
        <div className="container-x">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-800"
          >
            <ArrowLeft className="h-4 w-4" /> All articles
          </Link>
          <div className="mt-4">
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${article.textColor} bg-white/60`}>
              <Tag className="h-3 w-3" /> {article.category}
            </span>
          </div>
          <h1 className="mt-4 max-w-3xl text-3xl font-extrabold text-slate-900 sm:text-4xl">
            {article.title}
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-600">
            {article.excerpt}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" /> {article.date}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> {article.readTime}
            </span>
          </div>
        </div>
      </section>

      {/* Article Body */}
      <article className="container-x py-12">
        <div className="mx-auto max-w-3xl space-y-5 text-[15px] leading-relaxed text-slate-600">
          {article.content.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        {/* Share / CTA */}
        <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h3 className="text-lg font-bold text-slate-900">Found this helpful?</h3>
          <p className="mt-2 text-sm text-slate-500">
            Try the free demo or contact the developer for a walkthrough.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:shadow-emerald-500/40 hover:scale-[1.02]"
            >
              <BookOpen className="h-4 w-4" /> Try Free Demo
            </Link>
            <a
              href="https://wa.me/233530941750"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
            >
              <MessageCircle className="h-4 w-4" /> Ask on WhatsApp
            </a>
          </div>
        </div>

        {/* More articles */}
        <div className="mx-auto mt-12 max-w-3xl border-t border-slate-200 pt-10">
          <h2 className="text-lg font-bold text-ink">More articles</h2>
          <ul className="mt-4 space-y-3">
            {Object.entries(ARTICLES)
              .filter(([slug]) => slug !== params.slug)
              .slice(0, 3)
              .map(([slug, art]) => (
                <li key={slug}>
                  <Link
                    href={`/blog/${slug}`}
                    className="group flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-emerald-300 hover:shadow-md"
                  >
                    <div>
                      <span className={`text-xs font-bold uppercase tracking-widest ${art.textColor}`}>
                        {art.category}
                      </span>
                      <p className="mt-1 font-medium text-slate-700 group-hover:text-emerald-700 transition">
                        {art.title}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-emerald-600" />
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      </article>
    </div>
  );
}

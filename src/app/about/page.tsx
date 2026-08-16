import Link from "next/link";
import { ArrowRight, GraduationCap, CreditCard, MessageSquare, FileText, BarChart3, ShieldCheck } from "lucide-react";
import { getSchool } from "@/lib/school";
import { SectionHeading } from "@/components/site/section-heading";
import { PageHero } from "@/components/site/page-hero";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "About Us" };

const PORTAL_FEATURES = [
  { icon: GraduationCap, t: "Online Admission", d: "Parents apply from any phone — passport photo, birth certificate and weighing card uploads, with live application tracking." },
  { icon: FileText, t: "Assessments & Report Cards", d: "GES-aligned SBA (class work, projects, tests, practicals, homework) plus exams; one-page A4 report cards with positions and aggregates." },
  { icon: CreditCard, t: "Fees & Mobile Money", d: "MTN MoMo, AirtelTigo, Telecel and Paystack payments with automatic receipts — no more chasing fees." },
  { icon: MessageSquare, t: "Messaging Center", d: "Email, WhatsApp and SMS to staff, parents and students — reports, results and announcements in one click." },
  { icon: BarChart3, t: "Analysis & Mocks", d: "Master and broad sheets, BECE/WASSCE-style mock analysis with aggregates, and year-end rollover for a smooth new term." },
  { icon: ShieldCheck, t: "Secure & Private", d: "Role-based access, developer-only licensing, OTP-protected results checking and encrypted records." },
];

export default async function AboutPage() {
  const school = await getSchool();
  const name = school?.name ?? "Our School";
  return (
    <div>
      <PageHero title="About Us" subtitle="Get to know our school — our story, our values and the people who make it special." kicker={name} />
      <section className="container-x grid gap-12 py-16 lg:grid-cols-2">
        <div>
          <SectionHeading eyebrow="Who We Are" title={name} />
          <p className="mt-5 text-[15px] leading-relaxed text-slate-600">{school?.welcomeMessage}</p>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-600">
            {school?.history}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/history" className="btn-outline">
              Our History <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/admissions" className="btn-primary">
              Apply for Admission
            </Link>
          </div>
        </div>
        <div className="space-y-5">
          <div className="rounded-2xl bg-gradient-to-br from-primary to-emerald-950 p-7 text-white shadow-lift">
            <h3 className="text-lg font-semibold">Our Vision</h3>
            <p className="mt-2 text-sm leading-relaxed text-emerald-50">{school?.vision}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-card">
            <h3 className="text-lg font-semibold text-ink">Our Mission</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{school?.mission}</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-7">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Our Motto</p>
            <p className="mt-2 text-xl font-semibold text-amber-900">{school?.motto}</p>
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="container-x">
          <SectionHeading center eyebrow="Core Values" title="The Values That Guide Us" />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { emoji: "🛡️", t: "Integrity", d: "Honesty, discipline and moral courage in everything we do." },
              { emoji: "⭐", t: "Excellence", d: "The pursuit of the highest academic and personal standards." },
              { emoji: "🤝", t: "Community", d: "We grow together — learners, teachers, parents and the wider community." },
              { emoji: "💛", t: "Respect", d: "We honour every culture, faith, ability and background." },
              { emoji: "🎖️", t: "Character", d: "Building responsible leaders of strong character for Ghana." },
              { emoji: "📖", t: "Lifelong Learning", d: "Igniting curiosity that continues well beyond the classroom." },
            ].map((v) => (
              <div key={v.t} className="card card-hover p-6 text-center">
                <span className="text-3xl">{v.emoji}</span>
                <h3 className="mt-3 font-semibold text-ink">{v.t}</h3>
                <p className="mt-1.5 text-sm text-slate-500">{v.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="container-x">
          <SectionHeading center eyebrow="School Portal" title="One system for the whole school" />
          <p className="mx-auto mt-3 max-w-2xl text-center text-[15px] leading-relaxed text-slate-600">
            {name} runs on a complete school management system — from admission to
            graduation. Staff manage academics and fees, while parents and students
            follow progress securely from any phone, tablet or computer.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PORTAL_FEATURES.map((f) => (
              <div key={f.t} className="card card-hover p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary-soft to-emerald-100 text-primary">
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-semibold text-ink">{f.t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{f.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/admissions" className="btn-primary">
              Start an Application <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="container-x">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-slate-900 px-8 py-8 text-center text-white sm:flex-row sm:justify-between sm:text-left">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">System Developed By</p>
              <h3 className="mt-1 text-xl font-bold">shacomputec</h3>
              <p className="mt-1 text-sm text-slate-300">
                For licensing, activation keys and support:{" "}
                <a href="mailto:shacomputecgh@gmail.com" className="font-semibold text-amber-300 hover:text-amber-200">shacomputecgh@gmail.com</a>{" "}
                · <a href="tel:+233530941750" className="font-semibold text-amber-300 hover:text-amber-200">+233 530 941 750</a>
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Schools run the portal with their own logo, colours and payment keys.
              </p>
            </div>
            <Link href="/login" className="btn-primary whitespace-nowrap">
              Portal Login <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

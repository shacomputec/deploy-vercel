import Link from "next/link";
import { ArrowRight, Award, BookOpen, Calculator, CreditCard, HeartHandshake, Lightbulb, Mail, PhoneCall, ShieldCheck, TicketCheck, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSchool, schoolWhere } from "@/lib/school";
import { getSettingJSON } from "@/lib/settings";
import { HeroSlider, type HeroSlide } from "@/components/site/hero-slider";
import { AnnouncementTicker } from "@/components/site/announcement-ticker";
import { SectionHeading } from "@/components/site/section-heading";
import { NewsCard } from "@/components/site/news-card";
import { Reveal } from "@/components/site/reveal";
import { CountUp } from "@/components/site/count-up";

const PROGRAMMES = [
  { name: "Crèche & Nursery", range: "Ages 1 – 4", desc: "Safe, play-based early years in a warm, caring environment.", emoji: "🍼" },
  { name: "Kindergarten (KG 1–2)", range: "Ages 4 – 6", desc: "Language, numeracy and creative play under the SBC.", emoji: "🎨" },
  { name: "Primary (Basic 1–6)", range: "Lower & Upper", desc: "Strong foundations in literacy, numeracy and STEM.", emoji: "📚" },
  { name: "Junior High (Basic 7–9)", range: "BECE Ready", desc: "Full CCP coverage with continuous BECE preparation.", emoji: "🎓" },
  { name: "Senior High (SHS 1–3)", range: "WASSCE Ready", desc: "All core subjects plus science, business & arts electives.", emoji: "🏫" },
];

const VALUES = [
  { icon: ShieldCheck, title: "Integrity", desc: "We nurture honesty, discipline and moral courage." },
  { icon: Lightbulb, title: "Excellence", desc: "We pursue the highest academic and personal standards." },
  { icon: Users, title: "Community", desc: "We grow together — learners, teachers and parents." },
  { icon: HeartHandshake, title: "Respect", desc: "We honour every culture, faith and background." },
  { icon: Award, title: "Character", desc: "We build leaders of strong character for Ghana." },
  { icon: BookOpen, title: "Lifelong Learning", desc: "We ignite curiosity that lasts a lifetime." },
];

const QUICK_ACTIONS = [
  { icon: Calculator, label: "Check Results", desc: "OTP-secured report cards", href: "/result-checker" },
  { icon: CreditCard, label: "Pay Fees Online", desc: "MoMo & card payments", href: "/pay" },
  { icon: TicketCheck, label: "Apply for Admission", desc: "Online applications", href: "/admissions" },
  { icon: PhoneCall, label: "Talk to Us", desc: "Visit or call the office", href: "/contact" },
];

export const revalidate = 60;

export default async function HomePage() {
  const scope = await schoolWhere();
  const [school, slides, announcements, news, events, gallery] = await Promise.all([
    getSchool(),
    getSettingJSON<HeroSlide[]>("hero.slides", []),
    prisma.announcement.findMany({ where: { published: true, ...scope }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.newsItem.findMany({ where: { published: true, ...scope }, orderBy: { publishedAt: "desc" }, take: 3 }),
    prisma.eventItem.findMany({ where: { published: true, ...scope }, orderBy: { startDate: "asc" }, take: 3 }),
    prisma.galleryImage.findMany({ where: scope, orderBy: { sortOrder: "asc" }, take: 4 }),
  ]);

  return (
    <>
      <HeroSlider slides={slides} defaultImage={school?.logo} />
      <AnnouncementTicker items={announcements} />

      {/* Quick access strip */}
      <section className="relative z-10 -mt-10 pb-4">
        <div className="container-x">
          <Reveal>
            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-lift sm:grid-cols-2 lg:grid-cols-4">
              {QUICK_ACTIONS.map((a) => (
                <Link
                  key={a.label}
                  href={a.href}
                  className="group flex items-center gap-3 rounded-xl px-4 py-3 transition hover:bg-primary-soft/60"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-emerald-700 text-white shadow-sm transition group-hover:scale-105">
                    <a.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-ink">{a.label}</span>
                    <span className="block truncate text-xs text-slate-500">{a.desc}</span>
                  </span>
                  <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Welcome + quick stats */}
      <section className="container-x grid gap-10 py-14 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
        <div>
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Headteacher&apos;s Welcome</p>
            <h2 className="mt-2 text-3xl font-bold text-ink">Welcome to {school?.name ?? "our School"}</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-slate-600">
              {school?.welcomeMessage ?? "Welcome to our school! Here, every child matters."}
            </p>
          </Reveal>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              { label: "Learners Enrolled", value: 800, suffix: "+" },
              { label: "Dedicated Staff", value: 60, suffix: "+" },
              { label: "BECE Pass Rate", value: 98, suffix: "%" },
              { label: "WASSCE Pass Rate", value: 95, suffix: "%" },
            ].map((s, i) => (
              <Reveal key={s.label} delay={i * 0.08}>
                <div className="group rounded-xl border border-slate-200 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lift">
                  <p className="text-2xl font-bold text-primary">
                    <CountUp value={s.value} suffix={s.suffix} />
                  </p>
                  <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-slate-500">{s.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
        <div className="grid gap-4">
          <Reveal delay={0.05}>
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-emerald-950 p-6 text-white shadow-lift">
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              <h3 className="text-lg font-semibold">Our Vision</h3>
              <p className="mt-2 text-sm leading-relaxed text-emerald-50">{school?.vision}</p>
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
              <h3 className="text-lg font-semibold text-ink">Our Mission</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{school?.mission}</p>
            </div>
          </Reveal>
          <Reveal delay={0.18}>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <h3 className="text-lg font-semibold text-amber-900">Motto</h3>
              <p className="mt-2 text-sm font-medium text-amber-800">{school?.motto}</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Programmes */}
      <section className="bg-white py-16">
        <div className="container-x">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeading eyebrow="Academic Programmes" title="From Crèche to Senior High School" subtitle="Full GES / NaCCA curriculum coverage — Standard-Based Curriculum, Common Core Programme and the current SHS curriculum." />
              <Link href="/programmes" className="btn-outline shrink-0">
                All Programmes <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PROGRAMMES.map((p, i) => (
              <Reveal key={p.name} delay={i * 0.07}>
                <div className="card card-hover group relative overflow-hidden p-6">
                  <span className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/5 blur-xl transition group-hover:bg-primary/10" />
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-lg font-bold text-primary transition group-hover:scale-110">
                      {p.emoji}
                    </span>
                    <span className="chip">{p.range}</span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-ink">{p.name}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{p.desc}</p>
                </div>
              </Reveal>
            ))}
            <Reveal delay={0.35}>
              <Link href="/admissions" className="card card-hover flex h-full flex-col items-center justify-center gap-3 border-2 border-dashed border-primary/40 p-6 text-center">
                <span className="text-3xl">✍️</span>
                <span className="text-lg font-semibold text-primary">Apply for Admission</span>
                <span className="text-sm text-slate-500">Online applications are open for the next academic year.</span>
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Core values */}
      <section className="container-x py-16">
        <Reveal>
          <SectionHeading center eyebrow="Who We Are" title="Our Core Values" />
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {VALUES.map((v, i) => (
            <Reveal key={v.title} delay={i * 0.06}>
              <div className="card card-hover flex items-start gap-4 p-6">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <v.icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-semibold text-ink">{v.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{v.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* News + Events */}
      <section className="bg-white py-16">
        <div className="container-x">
          <Reveal>
            <SectionHeading eyebrow="News & Events" title="What's Happening at School" />
          </Reveal>
          <div className="mt-10 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <div className="grid gap-6 sm:grid-cols-2">
              {news.map((n, i) => (
                <Reveal key={n.id} delay={i * 0.08}>
                  <NewsCard slug={n.slug} title={n.title} excerpt={n.excerpt} coverImage={n.coverImage} publishedAt={n.publishedAt} author={n.author} />
                </Reveal>
              ))}
            </div>
            <div className="space-y-4">
              <Reveal delay={0.1}>
                <div className="card p-5">
                  <h3 className="font-semibold text-ink">Upcoming Events</h3>
                  <ul className="mt-3 space-y-3">
                    {events.map((e) => (
                      <li key={e.id} className="flex gap-3">
                        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-primary-soft text-primary">
                          <span className="text-sm font-bold leading-none">{new Date(e.startDate).getDate()}</span>
                          <span className="text-[10px] font-semibold uppercase">
                            {new Date(e.startDate).toLocaleString("en-GB", { month: "short" })}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-700">{e.title}</p>
                          {e.location && <p className="text-xs text-slate-400">{e.location}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <Link href="/events" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    View calendar <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </Reveal>
              <Reveal delay={0.18}>
                <div className="rounded-2xl bg-slate-900 p-6 text-white">
                  <h3 className="text-lg font-semibold">Check Results Online</h3>
                  <p className="mt-2 text-sm text-slate-300">Secure OTP-based access to termly report cards — anytime, anywhere.</p>
                  <Link href="/result-checker" className="btn-accent mt-4">
                    Open Result Checker
                  </Link>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="container-x py-16">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-emerald-800 to-emerald-950 px-8 py-12 text-center text-white shadow-lift sm:px-14">
            <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -right-10 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" />
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">Enrolment Open</p>
            <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">
              Give your child the head start they deserve
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-emerald-50 sm:text-base">
              Admissions are open for the next academic year across all levels — Crèche to SHS 3. Places are limited, so apply today.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/admissions" className="btn-accent btn-lg">
                Apply for Admission <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/contact" className="btn-lg rounded-lg border border-white/30 bg-white/10 px-6 py-3 text-base font-semibold text-white backdrop-blur transition hover:bg-white/20">
                <Mail className="mr-1.5 inline h-4 w-4" /> Talk to Admissions
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Gallery strip */}
      <section className="container-x pb-16">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading eyebrow="Gallery" title="Life at Our School" />
            <Link href="/gallery" className="btn-outline shrink-0">
              View gallery <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {gallery.map((g, i) => (
            <Reveal key={g.id} delay={i * 0.06} className={`h-full ${i % 3 === 0 ? "row-span-2" : ""}`}>
              <Link href="/gallery" className="group relative block h-full w-full overflow-hidden rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.url} alt={g.title ?? "Gallery"} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-slate-950/70 to-transparent p-4 opacity-0 transition group-hover:opacity-100">
                  <p className="text-sm font-semibold text-white">{g.title}</p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}

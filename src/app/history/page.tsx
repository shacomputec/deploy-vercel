import { getSchool } from "@/lib/school";
import { SectionHeading } from "@/components/site/section-heading";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "School History" };

const TIMELINE = [
  { year: "2010", event: "Founded as a small crèche with 12 children in Kumasi." },
  { year: "2013", event: "Expanded to full Kindergarten; first primary class admitted." },
  { year: "2017", event: "Registered with the Ghana Education Service; first BECE cohort." },
  { year: "2020", event: "Opened the Senior High School and modern science laboratories." },
  { year: "2022", event: "Accredited by NaCCA; launched the STEM & robotics programme." },
  { year: "2024", event: "Rolled out the digital SMIS, result checker and online admissions." },
];

export default async function HistoryPage() {
  const school = await getSchool();
  return (
    <div>
      <section className="page-hero text-white">
        <div className="container-x">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Our Story</p>
          <h1 className="mt-2 text-4xl font-bold">School History</h1>
          <p className="mt-3 max-w-xl text-slate-300">From 12 children in a single classroom to a full GES-accredited basic and senior high school.</p>
        </div>
      </section>

      <section className="container-x py-16">
        <SectionHeading eyebrow="Milestones" title="How Far We've Come" />
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {TIMELINE.map((t) => (
            <div key={t.year} className="card card-hover flex items-start gap-5 p-6">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-lg font-bold text-primary">
                {t.year.slice(2)}
              </span>
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-accent">{t.year}</p>
                <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{t.event}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-8 shadow-card">
          <h3 className="text-xl font-semibold text-ink">A Legacy of Excellence</h3>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
            {school?.history} Today, our alumni are thriving in senior high schools, universities and careers across Ghana and beyond. We remain committed to our founding promise: to give every child a world-class education rooted in Ghanaian values.
          </p>
        </div>
      </section>
    </div>
  );
}

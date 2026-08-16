import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SectionHeading } from "@/components/site/section-heading";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Academic Programmes" };

const LEVEL_ICONS: Record<string, string> = {
  CRECHE: "🍼", NURSERY: "🧸", KG: "🎨", LOWER: "📚", UPPER: "📖", JHS: "🎓", SHS: "🏫",
};
const LEVEL_BLURB: Record<string, string> = {
  CRECHE: "Play-based early years for ages 1–3 in a warm, safe environment.",
  NURSERY: "Structured play, routines and early social skills for ages 3–4.",
  KG: "KG 1 & KG 2 — language, numeracy and creativity under the NaCCA SBC.",
  LOWER: "Basic 1–3 — strong foundations in literacy, numeracy and discovery.",
  UPPER: "Basic 4–6 — independent learning, STEM and character development.",
  JHS: "Basic 7–9 — full Common Core Programme with BECE preparation.",
  SHS: "SHS 1–3 — core subjects plus science, business, arts & vocational electives.",
};

export default async function ProgrammesPage() {
  const levels = await prisma.level.findMany({
    orderBy: { sortOrder: "asc" },
    include: { subjects: { orderBy: { name: "asc" } }, classes: { orderBy: { name: "asc" } } },
  });

  return (
    <div>
      <section className="page-hero text-white">
        <div className="container-x">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Curriculum</p>
          <h1 className="mt-2 text-4xl font-bold">Academic Programmes</h1>
          <p className="mt-3 max-w-2xl text-slate-300">
            Full coverage of the Ghana Education Service curriculum — the Standard-Based Curriculum (KG–Primary), the Common Core Programme (JHS) and the current SHS curriculum — aligned with BECE and WASSCE.
          </p>
        </div>
      </section>

      <section className="container-x py-16">
        <SectionHeading eyebrow="Levels & Subjects" title="Everything We Teach" subtitle="Tap any level to see the subjects taught under the NaCCA curriculum." />
        <div className="mt-10 space-y-6">
          {levels.map((l) => (
            <details key={l.id} open={l.code === "JHS"} className="card group overflow-hidden">
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-6 transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-2xl">
                    {LEVEL_ICONS[l.code] ?? "📘"}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-ink">{l.name}</h3>
                    <p className="text-sm text-slate-500">
                      {l.classes.map((c) => c.name).join(" · ")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="chip">{l.curriculumKey}</span>
                  <span className="chip">{l.assessment === "EE" ? "EE / ME / AE / NS" : l.assessment === "BECE" ? "BECE Grades 1–9" : "WASSCE A1–F9"}</span>
                  <span className="text-slate-400 transition group-open:rotate-180">▾</span>
                </div>
              </summary>
              <div className="border-t border-slate-100 bg-slate-50/50 p-6">
                <p className="max-w-3xl text-sm leading-relaxed text-slate-600">{LEVEL_BLURB[l.code] ?? l.name}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {l.subjects.map((s) => (
                    <span key={s.id} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm">
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            </details>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-2xl bg-slate-900 p-8 text-center sm:flex-row sm:text-left">
          <div>
            <h3 className="text-xl font-semibold text-white">Ready to join us?</h3>
            <p className="mt-1 text-sm text-slate-300">Online admission is open for Crèche through SHS 1.</p>
          </div>
          <Link href="/admissions" className="btn-accent shrink-0">Apply for Admission</Link>
        </div>
      </section>
    </div>
  );
}

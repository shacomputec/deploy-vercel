import { prisma } from "@/lib/prisma";
import { AdmissionForm } from "@/components/site/admission-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admissions" };

const STEPS = [
  { n: "01", t: "Apply Online", d: "Complete the 5-minute application form — you'll get a reference number instantly." },
  { n: "02", t: "Screening", d: "Our admissions office calls you within 48 hours to schedule a screening/assessment." },
  { n: "03", t: "Offer & Registration", d: "Successful applicants receive an offer letter and complete registration." },
  { n: "04", t: "Resume", d: "Report on the reopening date with your acceptance slip and required documents." },
];

const REQUIRED = [
  "Birth certificate or baptismal card",
  "Two recent passport-size photographs",
  "Previous school's report card (Basic 1 and above)",
  "Parent/guardian Ghana card",
  "Transfer letter (where applicable)",
];

export default async function AdmissionsPage() {
  const levels = await prisma.level.findMany({ orderBy: { sortOrder: "asc" } });
  const classes = await prisma.class.findMany({
    orderBy: [{ level: { sortOrder: "asc" } }, { name: "asc" }],
    include: { level: true },
  });

  return (
    <div>
      <section className="page-hero text-white">
        <div className="container-x">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Join Us</p>
          <h1 className="mt-2 text-4xl font-bold">Online Admission</h1>
          <p className="mt-3 max-w-2xl text-slate-300">
            Applications are open for the {new Date().getFullYear()}/{new Date().getFullYear() + 1} academic year — Crèche through SHS 1. Limited spaces per class.
          </p>
        </div>
      </section>

      <section className="container-x grid gap-10 py-16 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-10">
          <div>
            <h2 className="text-xl font-semibold text-ink">How It Works</h2>
            <div className="mt-5 space-y-5">
              {STEPS.map((s) => (
                <div key={s.n} className="flex gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-sm font-bold text-primary">{s.n}</span>
                  <div>
                    <h3 className="font-semibold text-slate-800">{s.t}</h3>
                    <p className="mt-0.5 text-sm leading-relaxed text-slate-500">{s.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
            <h2 className="text-lg font-semibold text-ink">Required Documents</h2>
            <ul className="mt-3 space-y-2.5">
              {REQUIRED.map((r) => (
                <li key={r} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <span className="mt-0.5 text-emerald-600">✓</span> {r}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <AdmissionForm
          levels={levels.map((l) => ({ id: l.id, name: l.name }))}
          classes={classes.map((c) => ({ id: c.id, name: c.name, levelId: c.levelId, levelName: c.level.name }))}
        />
      </section>
    </div>
  );
}

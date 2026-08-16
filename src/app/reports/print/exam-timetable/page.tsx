import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getRolePerms, hasPerm } from "@/lib/permissions";
import { getSchool } from "@/lib/school";
import { AutoPrint } from "@/components/print/auto-print";

export const metadata = { title: "Exam Timetable — Print" };

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const fmtDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/**
 * Printable A4 examination timetable — the notice-board schedule for a term
 * (optionally filtered to one class). Session-gated (login + timetable.read).
 */
export default async function ExamTimetablePrintPage({ searchParams }: { searchParams: { classId?: string; termId?: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const perms = await getRolePerms(user.roleId);
  if (!hasPerm(perms, "timetable", "read")) redirect("/admin");

  const { classId, termId } = searchParams;

  const [term, klass, school] = await Promise.all([
    termId ? prisma.term.findUnique({ where: { id: termId }, include: { academicYear: true } }) : null,
    classId ? prisma.class.findUnique({ where: { id: classId } }) : null,
    getSchool(),
  ]);

  const exams = await prisma.examTimetable.findMany({
    where: {
      ...(classId ? { classId } : {}),
      ...(termId ? { termId } : {}),
    },
    include: {
      class: { select: { name: true } },
      subject: { select: { name: true, code: true } },
      term: { select: { name: true } },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    take: 1000,
  });
  if (!exams.length) notFound();

  // Group by day, then by class for the grid.
  const byDay = new Map<string, typeof exams>();
  for (const e of exams) {
    const key = e.date.toISOString().slice(0, 10);
    const list = byDay.get(key) ?? [];
    list.push(e);
    byDay.set(key, list);
  }
  const days = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  const heading = `${term ? `${term.name} · ${term.academicYear.name}` : "Examination Period"}${klass ? ` — ${klass.name}` : " — All Classes"}`;
  const today = fmtDate(new Date());

  return (
    <div className="print-multi bg-white">
      <AutoPrint title={`Exam Timetable — ${heading}`} />
      <div className="exam-timetable-page">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b-4 border-amber-400 pb-3">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/sms-logo.png" alt="" className="h-14 w-14 rounded-xl object-contain" />
              <div>
                <p className="text-lg font-extrabold text-slate-900">{school?.name ?? "School"}</p>
                <p className="text-xs text-slate-500">{school?.motto ?? ""}</p>
                <p className="text-xs text-slate-500">{school?.address ?? ""} {school?.phone ?? ""}</p>
              </div>
            </div>
            <div className="text-right text-xs leading-relaxed text-slate-600">
              <p className="text-sm font-bold text-slate-900">Examination Timetable</p>
              <p>{term ? `${term.name} · ${term.academicYear.name}` : "Examination Period"}</p>
              <p>Printed {today} · {exams.length} paper{exams.length === 1 ? "" : "s"}</p>
            </div>
          </div>

          {/* Schedule */}
          <div className="mt-4 space-y-5">
            {days.map(([day, list]) => {
              const byClass = new Map<string, typeof list>();
              for (const e of list) {
                const list2 = byClass.get(e.class.name) ?? [];
                list2.push(e);
                byClass.set(e.class.name, list2);
              }
              return (
                <div key={day}>
                  <p className="mb-1.5 flex items-center gap-2 text-sm font-bold text-slate-900">
                    <span className="rounded-md bg-emerald-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      {WEEKDAYS[new Date(day + "T00:00:00").getDay()]}
                    </span>
                    {fmtDate(day)}
                  </p>
                  <table className="w-full border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-300 px-2 py-1.5 text-left font-semibold text-slate-600">Time</th>
                        <th className="border border-slate-300 px-2 py-1.5 text-left font-semibold text-slate-600">Class</th>
                        <th className="border border-slate-300 px-2 py-1.5 text-left font-semibold text-slate-600">Subject</th>
                        <th className="border border-slate-300 px-2 py-1.5 text-left font-semibold text-slate-600">Venue</th>
                        <th className="border border-slate-300 px-2 py-1.5 text-left font-semibold text-slate-600">Invigilator</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...byClass.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([className, rows]) =>
                        rows.map((e, i) => (
                          <tr key={e.id} className={i % 2 ? "bg-slate-50/60" : "bg-white"}>
                            <td className="border border-slate-300 px-2 py-1.5 font-mono font-semibold text-emerald-800">{e.startTime} – {e.endTime}</td>
                            <td className="border border-slate-300 px-2 py-1.5 font-medium text-slate-800">{className}</td>
                            <td className="border border-slate-300 px-2 py-1.5 text-slate-700">
                              {e.subject.name}
                              {e.subject.code ? <span className="ml-1 text-[9px] text-slate-400">({e.subject.code})</span> : null}
                            </td>
                            <td className="border border-slate-300 px-2 py-1.5 text-slate-600">{e.venue ?? "—"}</td>
                            <td className="border border-slate-300 px-2 py-1.5 text-slate-600">{e.invigilator ?? "—"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-auto pt-4">
            <p className="border-t border-slate-200 pt-3 text-center text-[9px] text-slate-400">
              Students must be seated 15 minutes before the start of each paper. No electronic devices are allowed during examinations.
              · This timetable is system-generated by {school?.name ?? "School"} · {heading}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getRolePerms, hasPerm } from "@/lib/permissions";
import { getSchool } from "@/lib/school";
import { AutoPrint } from "@/components/print/auto-print";

export const metadata = { title: "Attendance Register — Print" };

const DEV = { name: "shacomputec", email: "shacomputecgh@gmail.com", tel: "+233 530 941 750" };
const DAYS_PER_PAGE = 15;

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/**
 * Printable attendance register for a class + term — one landscape A4 page per
 * 15 school days, with a blank mark cell per student per day (mark P / L / E /
 * A by hand) and a Present/Absent totals column computed from saved records.
 * Session-gated (login + attendance.read).
 */
export default async function AttendanceRegisterPrintPage({ params }: { params: { classId: string; termId: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const perms = await getRolePerms(user.roleId);
  if (!hasPerm(perms, "attendance", "read")) redirect("/admin");

  const term = await prisma.term.findUnique({ where: { id: params.termId }, include: { academicYear: true } });
  if (!term) notFound();

  const klass = await prisma.class.findUnique({ where: { id: params.classId }, include: { level: true } });
  if (!klass) notFound();

  const [students, records, school] = await Promise.all([
    prisma.student.findMany({
      where: { classId: params.classId, status: "ACTIVE" },
      orderBy: { fullName: "asc" },
    }),
    prisma.attendanceRecord.findMany({
      where: { classId: params.classId, date: { gte: term.startDate, lte: term.endDate } },
    }),
    getSchool(),
  ]);
  if (!students.length) notFound();

  // School days: Mon–Fri from term start to term end (capped at today so
  // future dates don't appear on a register printed mid-term).
  const end = new Date(Math.min(term.endDate.getTime(), Date.now()));
  const dates: Date[] = [];
  for (let d = new Date(term.startDate); d <= end; d = addDays(d, 1)) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) dates.push(new Date(d));
  }

  const byStudent = new Map<string, Map<string, string>>();
  for (const r of records) {
    const key = r.date.toISOString().slice(0, 10);
    if (!byStudent.has(r.studentId)) byStudent.set(r.studentId, new Map());
    byStudent.get(r.studentId)!.set(key, r.status);
  }

  const totals = students.map((s) => {
    const map = byStudent.get(s.id) ?? new Map();
    let present = 0;
    let absent = 0;
    for (const d of dates) {
      const st = map.get(d.toISOString().slice(0, 10));
      if (st === "PRESENT" || st === "LATE" || st === "EXCUSED") present++;
      else if (st === "ABSENT") absent++;
    }
    return { s, present, absent };
  });

  const pages: typeof dates[] = [];
  for (let i = 0; i < dates.length; i += DAYS_PER_PAGE) pages.push(dates.slice(i, i + DAYS_PER_PAGE));
  if (pages.length === 0) pages.push([]);
  const fmt = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;

  return (
    <div className="print-multi bg-white">
      <style>{`@media print { @page { size: A4 landscape !important; margin: 0 !important; } }`}</style>
      <AutoPrint title={`${klass.name} — Attendance Register (${students.length} students)`} />
      {pages.map((chunk, pi) => (
        <div key={pi} className="register-page flex flex-col">
          {/* Header */}
          <div className="mb-2 flex items-center justify-between border-b-2 border-slate-400 pb-2">
            <div className="flex items-center gap-2">
              <img src="/sms-logo.png" alt="" className="h-8 w-8 rounded-md object-contain" />
              <div>
                <p className="text-sm font-extrabold text-slate-900">{school?.name ?? "School"}</p>
                <p className="text-[9px] uppercase tracking-widest text-slate-500">Attendance Register · {klass.name} · {term.name} Term · {term.academicYear.name}</p>
              </div>
            </div>
            <p className="text-[9px] font-semibold text-slate-400">Page {pi + 1} of {pages.length}</p>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-hidden">
            <table className="w-full border-collapse text-[8px]">
              <thead>
                <tr className="bg-slate-100 text-slate-600">
                  <th className="border border-slate-300 px-1 py-1 text-left font-bold">#</th>
                  <th className="border border-slate-300 px-1 py-1 text-left font-bold">Student</th>
                  <th className="border border-slate-300 px-1 py-1 text-left font-bold">Adm No</th>
                  {chunk.map((d) => (
                    <th key={d.toISOString()} className="border border-slate-300 px-0.5 py-1 text-center font-semibold">
                      {fmt(d)}
                    </th>
                  ))}
                  {Array.from({ length: DAYS_PER_PAGE - chunk.length }).map((_, k) => (
                    <th key={`b-${k}`} className="border border-slate-300 px-0.5 py-1" />
                  ))}
                  <th className="border border-slate-300 px-1 py-1 text-center font-bold">P</th>
                  <th className="border border-slate-300 px-1 py-1 text-center font-bold">A</th>
                </tr>
              </thead>
              <tbody>
                {totals.map(({ s, present, absent }, i) => (
                  <tr key={s.id}>
                    <td className="border border-slate-300 px-1 py-0.5 text-center text-slate-500">{i + 1}</td>
                    <td className="border border-slate-300 px-1 py-0.5 font-semibold text-slate-800">{s.fullName}</td>
                    <td className="border border-slate-300 px-1 py-0.5 font-mono">{s.admissionNo}</td>
                    {chunk.map((d) => {
                      const st = byStudent.get(s.id)?.get(d.toISOString().slice(0, 10));
                      const mark = st === "PRESENT" ? "P" : st === "LATE" ? "L" : st === "EXCUSED" ? "E" : st === "ABSENT" ? "A" : "";
                      return (
                        <td key={d.toISOString()} className="border border-slate-300 px-0.5 py-0.5 text-center">
                          <span className={st ? "font-bold" : ""}>{mark}</span>
                        </td>
                      );
                    })}
                    {Array.from({ length: DAYS_PER_PAGE - chunk.length }).map((_, k) => (
                      <td key={`b-${k}`} className="border border-slate-300 px-0.5 py-0.5" />
                    ))}
                    <td className="border border-slate-300 px-1 py-0.5 text-center font-bold text-emerald-700">{present || ""}</td>
                    <td className="border border-slate-300 px-1 py-0.5 text-center font-bold text-rose-700">{absent || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend + signature */}
          <div className="mt-1 flex items-end justify-between border-t border-slate-300 pt-1.5">
            <p className="text-[8px] text-slate-500">Mark daily: <b>P</b> present · <b>L</b> late · <b>E</b> excused · <b>A</b> absent. Totals auto-fill from saved attendance.</p>
            <p className="text-[8px] text-slate-500">Class Teacher: ______________&nbsp;&nbsp; Headteacher: ______________</p>
            <p className="text-[7px] text-slate-400">Powered by {DEV.name} · {DEV.tel}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

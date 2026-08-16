import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getRolePerms, hasPerm } from "@/lib/permissions";
import { getSchool } from "@/lib/school";
import { gradeForPercent } from "@/lib/grading";
import { AutoPrint } from "@/components/print/auto-print";
import type { ComputedReport } from "@/lib/report";

export const metadata = { title: "Class Summary — Print" };

const DEV = { name: "shacomputec", email: "shacomputecgh@gmail.com", tel: "+233 530 941 750" };

/**
 * Class summary cover sheet — one A4 page listing every student's position,
 * total percentage and grade for a class + term, ready to sit on top of the
 * report-card stack. Session-gated (login + reports.read).
 */
export default async function ClassSummaryPrintPage({ params }: { params: { classId: string; termId: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const perms = await getRolePerms(user.roleId);
  if (!hasPerm(perms, "reports", "read")) redirect("/admin");

  const term = await prisma.term.findUnique({ where: { id: params.termId }, include: { academicYear: true } });
  if (!term) notFound();

  const klass = await prisma.class.findUnique({ where: { id: params.classId }, include: { level: true } });
  if (!klass) notFound();

  const [reports, school] = await Promise.all([
    prisma.reportCard.findMany({
      where: { classId: params.classId, termId: params.termId },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      include: { student: true },
    }),
    getSchool(),
  ]);
  if (!reports.length) notFound();

  const rows = await Promise.all(
    reports.map(async (r) => {
      const data = r.data ? (JSON.parse(r.data) as ComputedReport) : null;
      const percent = data?.totalPercent ?? r.totalPercentage ?? 0;
      const grade = await gradeForPercent(klass.levelId, percent);
      return {
        id: r.id,
        name: r.student.fullName,
        admissionNo: r.student.admissionNo,
        position: r.position,
        percent,
        grade: grade.grade,
        points: grade.points,
        remark: grade.remark,
        promotionStatus: r.promotionStatus ?? data?.promotionStatus ?? null,
      };
    })
  );

  const avg = rows.reduce((a, r) => a + r.percent, 0) / (rows.length || 1);
  const passed = rows.filter((r) => r.grade !== "F").length;
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="print-multi bg-white">
      <AutoPrint title={`${klass.name} — ${term.name} Summary`} />
      <div className="fee-receipt-page">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b-4 border-amber-400 pb-3">
            <div className="flex items-center gap-3">
              <img src="/sms-logo.png" alt="" className="h-14 w-14 rounded-xl object-contain" />
              <div>
                <p className="text-lg font-extrabold text-slate-900">{school?.name ?? "School"}</p>
                <p className="text-xs text-slate-500">{school?.motto ?? ""}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="rounded-lg border-2 border-amber-400 px-3 py-1 text-sm font-extrabold uppercase tracking-widest text-amber-600">Class Summary</p>
              <p className="mt-1 text-xs font-semibold text-slate-600">{klass.name} · {term.name} Term · {term.academicYear.name}</p>
              <p className="text-[10px] text-slate-400">{today}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-4 gap-3 text-center text-sm">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">On roll</p>
              <p className="text-lg font-extrabold text-slate-900">{rows.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Class average</p>
              <p className="text-lg font-extrabold text-emerald-700">{avg.toFixed(1)}%</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Passed</p>
              <p className="text-lg font-extrabold text-emerald-700">{passed}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Best</p>
              <p className="text-lg font-extrabold text-amber-600">{rows[0]?.percent.toFixed(1) ?? "—"}%</p>
            </div>
          </div>

          {/* Table */}
          <table className="mt-4 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-slate-300 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                <th className="py-2">#</th>
                <th className="py-2">Student</th>
                <th className="py-2">Admission No</th>
                <th className="py-2 text-right">Total %</th>
                <th className="py-2 text-center">Grade</th>
                <th className="py-2 text-center">Points</th>
                <th className="py-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="py-1.5 text-slate-400">{r.position}</td>
                  <td className="py-1.5 font-semibold text-slate-800">{r.name}</td>
                  <td className="py-1.5 font-mono text-xs">{r.admissionNo}</td>
                  <td className="py-1.5 text-right font-bold text-slate-900">{r.percent.toFixed(1)}</td>
                  <td className="py-1.5 text-center font-extrabold">{r.grade}</td>
                  <td className="py-1.5 text-center text-slate-500">{r.points ?? "—"}</td>
                  <td className="py-1.5 text-right text-xs font-semibold">
                    <span className={r.promotionStatus === "PROMOTED" ? "text-emerald-700" : r.promotionStatus === "CONDITIONAL" ? "text-amber-700" : "text-rose-700"}>
                      {r.promotionStatus ?? "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-auto grid grid-cols-2 gap-10 pt-8">
            <div className="border-t border-slate-300 pt-2 text-center text-xs text-slate-500">Class Teacher</div>
            <div className="border-t border-slate-300 pt-2 text-center text-xs text-slate-500">Headteacher</div>
          </div>

          <p className="mt-4 border-t border-slate-100 pt-2 text-center text-[9px] text-slate-400">
            Generated by the {school?.name ?? "school"} management system · Powered by {DEV.name} · {DEV.tel} · {DEV.email}
          </p>
        </div>
      </div>
    </div>
  );
}

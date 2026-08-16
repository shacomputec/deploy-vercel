import { BadgeCheck, ShieldAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { verifyReportQr } from "@/lib/report";
import { fmtDate } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Verify Report Card" };

export default async function VerifyResultPage({
  searchParams,
}: {
  searchParams: { ref?: string; sig?: string };
}) {
  const token = searchParams.sig;
  const result = token ? await verifyReportQr(token) : { valid: false as const, reason: "missing" };

  if (!result.valid) {
    return (
      <div className="container-x flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
        <ShieldAlert className="h-16 w-16 text-rose-400" />
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Unable to Verify</h1>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          {result.reason === "tampered"
            ? "This verification code does not match the report card — the document may have been altered."
            : "This report card could not be found or has not been published."}
        </p>
      </div>
    );
  }

  const report = result.report;
  const [student, term, year, klass] = await Promise.all([
    prisma.student.findUnique({ where: { id: report.studentId } }),
    prisma.term.findUnique({ where: { id: report.termId } }),
    prisma.academicYear.findUnique({ where: { id: report.academicYearId } }),
    prisma.class.findUnique({ where: { id: report.classId } }),
  ]);

  return (
    <div className="container-x flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
        <BadgeCheck className="h-11 w-11 text-emerald-600" />
      </div>
      <h1 className="mt-5 text-3xl font-bold text-slate-900">Authentic Report Card</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        This report card has been verified as genuine and issued by the school&apos;s official system.
      </p>
      <div className="mt-8 grid w-full max-w-xl grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: "Student", value: student?.fullName },
          { label: "Class", value: klass?.name },
          { label: "Academic Year", value: year?.name },
          { label: "Term", value: term?.name },
          { label: "Total (%)", value: `${report.totalPercentage ?? "—"}%` },
          { label: "Position", value: report.position ? `${report.position} of ${report.onRoll}` : "—" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{s.label}</p>
            <p className="mt-1 font-semibold text-slate-800">{s.value ?? "—"}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 text-xs text-slate-400">
        Generated {fmtDate(report.createdAt)} · SHA-256 signed by {year?.name ?? "school"} system
      </p>
    </div>
  );
}

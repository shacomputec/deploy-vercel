import type { ComputedReport } from "@/lib/report";

function ordinal(n: number | null | undefined) {
  if (n == null) return "—";
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function ReportCardView({
  report,
  schoolName,
  motto,
  logo,
  qrDataUrl,
  vacationDate,
  reopeningDate,
  termStartDate,
  termEndDate,
  teacherComment,
  headComment,
  watermarkOpacity,
}: {
  report: ComputedReport;
  schoolName: string;
  motto?: string | null;
  logo?: string | null;
  qrDataUrl?: string;
  vacationDate?: string | null;
  reopeningDate?: string | null;
  /** When this term runs — shown on the card header. */
  termStartDate?: string | null;
  termEndDate?: string | null;
  teacherComment?: string;
  headComment?: string;
  /** Watermark strength 0–1 (default 0.05 = very faint). Admin-configurable in School Settings → System. */
  watermarkOpacity?: number;
}) {
  const isPrimary = report.levelCode === "KG" || report.levelCode === "LOWER" || report.levelCode === "UPPER" || report.levelCode === "CRECHE" || report.levelCode === "NURSERY";

  const attendanceRate = report.attendanceDays ? Math.round((report.attendancePresent / report.attendanceDays) * 100) : 0;

  const subjectRows = report.results;

  const wm = watermarkOpacity ?? 0.05;

  return (
    <div className="report-sheet relative overflow-hidden rounded-2xl border border-slate-200 shadow-lift" style={{ ["--report-wm" as string]: String(wm) }}>
      {/* watermark — deliberately very faint (5%) so the writing stays clear; the
          same strength applies on screen and in print via the --report-wm variable */}
      {logo && wm > 0 && (
        <div className="report-watermark pointer-events-none absolute inset-0 flex items-center justify-center" style={{ opacity: wm }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt="" className="h-[520px] w-[520px] object-contain" />
        </div>
      )}

      {/* Header */}
      <div className="relative flex items-center justify-between gap-4 border-b-4 border-amber-400 pb-4">
        <div className="flex items-center gap-3">
          {logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="h-16 w-16 rounded-xl object-contain" />
          )}
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">{schoolName}</h1>
            <p className="text-xs font-medium uppercase tracking-widest text-emerald-700">School Report Card</p>
            {motto && <p className="mt-0.5 text-[11px] italic text-slate-500">{motto}</p>}
          </div>
        </div>
        <div className="text-right text-[11px] leading-relaxed text-slate-600">
          <p><span className="font-semibold">Academic Year:</span> {report.yearName}</p>
          <p><span className="font-semibold">Term:</span> {report.termName}</p>
          {(termStartDate || termEndDate) && (
            <p><span className="font-semibold">Term Dates:</span> {fmtDate(termStartDate)} – {fmtDate(termEndDate)}</p>
          )}
          <p><span className="font-semibold">Vacation:</span> {fmtDate(vacationDate)}</p>
          <p><span className="font-semibold">Reopening:</span> {fmtDate(reopeningDate)}</p>
        </div>
      </div>

      {/* Student details */}
      <div className="relative mt-4 flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-1.5 text-[12px] text-slate-700 sm:grid-cols-3">
          <p className="col-span-2 text-sm font-bold text-slate-900">{report.student.fullName}</p>
          <p><span className="text-slate-400">Admission No:</span> <span className="font-semibold">{report.student.admissionNo}</span></p>
          <p><span className="text-slate-400">Class:</span> <span className="font-semibold">{report.className}</span></p>
          <p><span className="text-slate-400">Gender:</span> <span className="font-semibold">{report.student.gender === "MALE" ? "Male" : "Female"}</span></p>
          <p><span className="text-slate-400">Position:</span> <span className="font-semibold">{ordinal(report.position)} of {report.onRoll}</span></p>
          <p><span className="text-slate-400">Number on Roll:</span> <span className="font-semibold">{report.onRoll}</span></p>
        </div>
      </div>

      {/* Subjects */}
      <table className="relative mt-4 w-full border-collapse text-[12px]">
        <thead>
          <tr className="bg-emerald-800 text-white">
            <th className="border border-emerald-900 px-3 py-2 text-left font-semibold">Subject</th>
            {!isPrimary && <th className="border border-emerald-900 px-3 py-2 text-center font-semibold">Class Exercise ({report.sbaWeight ?? 50}%)</th>}
            {!isPrimary && <th className="border border-emerald-900 px-3 py-2 text-center font-semibold">End-of-Term Exam ({report.examWeight ?? 50}%)</th>}
            <th className="border border-emerald-900 px-3 py-2 text-center font-semibold">{isPrimary ? "Total" : "Total (100)"}</th>
            <th className="border border-emerald-900 px-3 py-2 text-center font-semibold">Grade</th>
            <th className="border border-emerald-900 px-3 py-2 text-center font-semibold">Remark</th>
          </tr>
        </thead>
        <tbody>
          {subjectRows.map((r, i) => (
            <tr key={r.subjectId} className={i % 2 ? "bg-slate-50/60" : "bg-white"}>
              <td className="border border-slate-200 px-3 py-1.5 font-medium text-slate-800">{r.subject}</td>
              {!isPrimary && (
                <td className="border border-slate-200 px-3 py-1.5 text-center text-slate-700">
                  {r.classWeighted != null ? r.classWeighted.toFixed(1) : "—"}
                </td>
              )}
              {!isPrimary && (
                <td className="border border-slate-200 px-3 py-1.5 text-center text-slate-700">
                  {r.examWeighted != null ? r.examWeighted.toFixed(1) : "—"}
                </td>
              )}
              <td className="border border-slate-200 px-3 py-1.5 text-center font-semibold text-slate-900">
                {r.total != null ? r.total.toFixed(1) : "—"}
              </td>
              <td className="border border-slate-200 px-3 py-1.5 text-center">
                <span className="inline-flex min-w-8 justify-center rounded-md bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">{r.grade}</span>
              </td>
              <td className="border border-slate-200 px-3 py-1.5 text-center text-slate-600">{r.remark ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="relative mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Score", value: report.totalScore.toFixed(1) },
          { label: "Class Average", value: report.classAverage.toFixed(1) },
          { label: "Overall Position", value: ordinal(report.position) },
          { label: "Promotion Status", value: report.promotionStatus.replaceAll("_", " ") },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-slate-200 bg-white p-2.5 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{s.label}</p>
            <p className="mt-0.5 text-sm font-bold text-emerald-700">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Attendance + conduct */}
      <div className="relative mt-4 grid grid-cols-2 gap-3 text-[12px] sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 p-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Days Present</p>
          <p className="font-semibold text-slate-800">{report.attendancePresent} / {report.attendanceDays}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Attendance Rate</p>
          <p className="font-semibold text-slate-800">{attendanceRate}%</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Conduct</p>
          <p className="font-semibold text-slate-800">{report.promotionStatus === "REPEAT" ? "Fair" : "Excellent"}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Subjects Offered</p>
          <p className="font-semibold text-slate-800">{subjectRows.length}</p>
        </div>
      </div>

      {/* Comments */}
      <div className="relative mt-4 space-y-3">
        <div className="rounded-lg border border-slate-200 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Form Teacher&apos;s Comment</p>
          <p className="mt-1 text-[12px] italic text-slate-700">
            {teacherComment ?? `${report.student.fullName} performed ${report.totalPercent >= 65 ? "very well" : report.totalPercent >= 50 ? "satisfactorily" : "below expectations"} this term.`}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Headteacher&apos;s Comment</p>
          <p className="mt-1 text-[12px] italic text-slate-700">
            {headComment ?? (report.promotionStatus === "PROMOTED"
              ? "A commendable performance. Keep up the excellent work!"
              : report.promotionStatus === "CONDITIONAL"
                ? "Good progress. More effort is needed in a few subjects."
                : "Extra effort and parental support are required to improve performance.")}
          </p>
        </div>
      </div>

      {/* Signatures + QR */}
      <div className="relative mt-6 flex items-end justify-between gap-6">
        <div className="flex gap-8 text-[11px] text-slate-600">
          <div className="text-center">
            <div className="h-10 w-32 border-b border-slate-400" />
            <p className="mt-1">Form Teacher</p>
          </div>
          <div className="text-center">
            <div className="h-10 w-32 border-b border-slate-400" />
            <p className="mt-1">Headteacher</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="Verification QR code" className="h-20 w-20 rounded border border-slate-200" />
          ) : (
            <div className="h-20 w-20 rounded border border-dashed border-slate-300" />
          )}
          <div className="max-w-40 text-[9px] leading-snug text-slate-400">
            <p className="font-bold text-slate-500">SECURE VERIFICATION</p>
            <p>Scan this QR code to verify the authenticity of this report card.</p>
          </div>
        </div>
      </div>

      <p className="relative mt-5 text-center text-[10px] text-slate-400">
        This report is system-generated · {schoolName} · {report.yearName} · {report.termName}
      </p>
    </div>
  );
}

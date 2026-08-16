import { Logo } from "@/components/site/logo";

export type CertificateData = {
  studentName: string;
  admissionNo: string;
  gender: string;
  className: string;
  yearName: string;
  termName: string;
  position: number | null;
  onRoll: number | null;
  promotionStatus: string | null;
  totalPercent: number | null;
  schoolName: string;
  motto: string | null;
};

export function CertificateView({ data, type = "PROGRESS" }: { data: CertificateData; type?: "PROGRESS" | "COMPLETION" }) {
  const title = type === "COMPLETION" ? "CERTIFICATE OF COMPLETION" : "CERTIFICATE OF ACHIEVEMENT";
  const subtitle =
    type === "COMPLETION"
      ? "This is to certify that"
      : "This is to certify that";

  return (
    <div className="mx-auto w-[210mm] max-w-full overflow-hidden rounded-xl border-8 border-double border-amber-400 bg-white">
      {/* watermark — deliberately very faint (5%) so the writing stays clear */}
      <div className="relative p-8">
        <div className="report-watermark pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.05]">
          <Logo school={null} className="h-72 w-72" />
        </div>
        <div className="relative">
          <div className="flex items-center justify-center gap-4">
            <div className="[&_span]:text-primary"><Logo school={null} className="h-16 w-16" /></div>
            <div className="text-center">
              <h1 className="text-2xl font-black tracking-wide text-slate-800">{data.schoolName}</h1>
              {data.motto && <p className="text-xs font-medium tracking-[0.2em] text-amber-600">{data.motto}</p>}
            </div>
            <div className="h-16 w-16" />
          </div>

          <div className="my-6 h-1 bg-gradient-to-r from-amber-500 via-emerald-600 to-amber-500" />

          <h2 className="text-center text-3xl font-black tracking-widest text-emerald-700">{title}</h2>

          <p className="mt-8 text-center text-lg text-slate-600">{subtitle}</p>
          <p className="mt-3 text-center font-serif text-3xl font-bold italic text-slate-800">{data.studentName}</p>
          <p className="mt-1 text-center text-sm text-slate-500">
            Admission No: <span className="font-mono">{data.admissionNo}</span> · {data.className} · {data.yearName} ({data.termName})
          </p>

          <p className="mx-auto mt-8 max-w-xl text-center text-sm leading-relaxed text-slate-600">
            for satisfactory performance and conduct during the academic year. This certificate is issued in accordance
            with the school&apos;s assessment policies under the Ghana Education Service curriculum.
            {data.position && data.onRoll
              ? ` The student placed ${data.position}${data.position === 1 ? "st" : data.position === 2 ? "nd" : data.position === 3 ? "rd" : "th"} out of ${data.onRoll} students with an overall score of ${data.totalPercent?.toFixed(1)}%.`
              : ""}
          </p>

          {data.promotionStatus && type === "PROGRESS" && (
            <p className="mt-3 text-center text-sm font-semibold text-slate-700">
              Promotion status: <span className={data.promotionStatus === "PROMOTED" ? "text-emerald-600" : "text-amber-600"}>{data.promotionStatus}</span>
            </p>
          )}

          <div className="mt-16 flex items-end justify-between">
            <div className="text-center">
              <div className="h-px w-44 bg-slate-400" />
              <p className="mt-1 text-xs font-semibold text-slate-600">Class Teacher</p>
            </div>
            <div className="text-center">
              <div className="h-px w-44 bg-slate-400" />
              <p className="mt-1 text-xs font-semibold text-slate-600">Headteacher / Headmaster</p>
            </div>
          </div>

          <p className="mt-10 text-center text-[10px] text-slate-400">
            Issued by {data.schoolName} · {data.yearName} · Verify authenticity at the school office
          </p>
        </div>
      </div>
    </div>
  );
}

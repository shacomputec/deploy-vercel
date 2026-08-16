import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getRolePerms, hasPerm } from "@/lib/permissions";
import { getSchool } from "@/lib/school";
import { AutoPrint } from "@/components/print/auto-print";
import { fmtDate } from "@/lib/utils";

export const metadata = { title: "Admission Application — Print" };

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-200 py-1.5">
      <span className="font-semibold text-slate-700">{k}</span>
      <span className="text-right text-slate-800">{v || "—"}</span>
    </div>
  );
}

export default async function AdmissionPrintPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const perms = await getRolePerms(user.roleId);
  if (!hasPerm(perms, "admissions", "read")) redirect("/admin");

  const app = await prisma.admissionApplication.findUnique({
    where: { id: params.id },
    include: { level: true, class: true, documents: { select: { category: true, fileName: true, size: true } } },
  });
  if (!app) notFound();
  const school = await getSchool();

  const docLabels: Record<string, string> = {
    BIRTH_CERTIFICATE: "Birth Certificate",
    PASSPORT_PHOTO: "Passport Picture",
    WEIGHING_CARD: "Weighing Card",
    PREVIOUS_REPORT: "Previous Report",
  };

  return (
    <div className="print-shell bg-white">
      <AutoPrint title={`${app.fullName} — Admission Form`} />
      <div className="report-sheet">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b-4 border-amber-400 pb-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{school?.name ?? "School"}</h1>
            <p className="text-xs font-medium uppercase tracking-widest text-emerald-700">Online Admission Application Form</p>
          </div>
          <div className="text-right text-[11px] text-slate-600">
            <p><span className="font-semibold">Reference:</span> {app.referenceNo}</p>
            <p><span className="font-semibold">Submitted:</span> {fmtDate(app.submittedAt)}</p>
            <p><span className="font-semibold">Status:</span> {app.status}</p>
          </div>
        </div>

        {/* Student */}
        <h2 className="mt-4 text-sm font-bold uppercase tracking-wider text-emerald-700">Student Details</h2>
        <div className="mt-1 rounded-lg border border-slate-200 p-3 text-[12px]">
          <Row k="Full name" v={app.fullName} />
          <Row k="Gender" v={app.gender ?? ""} />
          <Row k="Date of birth" v={fmtDate(app.dateOfBirth)} />
          <Row k="Class applying for" v={app.class ? `${app.class.name} (${app.level.name})` : app.level.name} />
          <Row k="NHIS number" v={app.nhisNumber ?? ""} />
          <Row k="Weighing card number" v={app.weighingCardNumber ?? ""} />
        </div>

        {/* Parent */}
        <h2 className="mt-3 text-sm font-bold uppercase tracking-wider text-emerald-700">Parent / Guardian</h2>
        <div className="mt-1 rounded-lg border border-slate-200 p-3 text-[12px]">
          <Row k="Name" v={app.parentName} />
          <Row k="Phone" v={app.parentPhone} />
          <Row k="Email" v={app.parentEmail ?? ""} />
          <Row k="Occupation" v={app.parentOccupation ?? ""} />
        </div>

        {/* Address + previous school */}
        <div className="mt-3 grid grid-cols-2 gap-3 text-[12px]">
          <div className="rounded-lg border border-slate-200 p-3">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Address</h3>
            <div className="mt-1">
              <Row k="Residential" v={app.address ?? ""} />
              <Row k="Digital" v={app.digitalAddress ?? ""} />
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Previous School</h3>
            <div className="mt-1">
              <Row k="Name" v={app.previousSchool ?? ""} />
              <Row k="Class" v={app.previousSchoolClass ?? ""} />
            </div>
          </div>
        </div>

        {/* Documents */}
        <h2 className="mt-3 text-sm font-bold uppercase tracking-wider text-emerald-700">Uploaded Documents</h2>
        <div className="mt-1 rounded-lg border border-slate-200 p-3 text-[12px]">
          {app.documents.length === 0 ? (
            <p className="text-slate-500">No documents uploaded.</p>
          ) : (
            app.documents.map((d) => (
              <div key={d.category} className="flex justify-between gap-4 border-b border-slate-200 py-1.5 last:border-b-0">
                <span className="font-semibold text-slate-700">{docLabels[d.category] ?? d.category}</span>
                <span className="text-right text-slate-600">{d.fileName} · {(d.size / 1024).toFixed(0)} KB</span>
              </div>
            ))
          )}
        </div>

        {/* Message + signatures */}
        {app.message && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12px]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Message</p>
            <p className="mt-0.5 text-slate-700">{app.message}</p>
          </div>
        )}

        <div className="mt-8 flex items-end justify-between gap-6 text-[11px] text-slate-600">
          <div className="text-center">
            <div className="h-10 w-36 border-b border-slate-400" />
            <p className="mt-1">Parent / Guardian Signature</p>
          </div>
          <div className="text-center">
            <div className="h-10 w-36 border-b border-slate-400" />
            <p className="mt-1">Admissions Officer</p>
          </div>
        </div>

        <p className="mt-5 text-center text-[10px] text-slate-400">
          This application was submitted online · {school?.name ?? "School"} · {fmtDate(app.submittedAt)}
        </p>
      </div>
    </div>
  );
}

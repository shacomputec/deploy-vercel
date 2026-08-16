import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getRolePerms, hasPerm } from "@/lib/permissions";
import { getSchool } from "@/lib/school";
import { AutoPrint } from "@/components/print/auto-print";
import { fmtDate } from "@/lib/utils";

export const metadata = { title: "Admission Offer Letter — Print" };

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-200 py-1.5">
      <span className="font-semibold text-slate-700">{k}</span>
      <span className="text-right text-slate-800">{v || "—"}</span>
    </div>
  );
}

export default async function AdmissionOfferPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const perms = await getRolePerms(user.roleId);
  if (!hasPerm(perms, "admissions", "read")) redirect("/admin");

  const app = await prisma.admissionApplication.findUnique({
    where: { id: params.id },
    include: {
      level: true,
      class: true,
      student: { select: { id: true, admissionNo: true, fullName: true } },
    },
  });
  if (!app) notFound();
  // An offer letter only exists for approved applications (a student was enrolled).
  if (app.status !== "APPROVED" || !app.student) notFound();

  const school = await getSchool();
  const year = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
  const term = await prisma.term.findFirst({ where: { isCurrent: true } });

  const className = app.class ? app.class.name : app.level.name;
  const reopened = term?.reopeningDate ? fmtDate(term.reopeningDate) : "the reopening date";
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);

  return (
    <div className="print-shell bg-white">
      <AutoPrint title={`Admission Offer — ${app.fullName}`} />
      <div className="report-sheet">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b-4 border-emerald-600 pb-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{school?.name ?? "School"}</h1>
            {school?.motto && <p className="text-xs italic text-slate-500">{school.motto}</p>}
            <p className="text-[11px] text-slate-500">
              {school?.address ?? ""}{school?.phone ? ` · ${school.phone}` : ""}{school?.email ? ` · ${school.email}` : ""}
            </p>
          </div>
          <div className="text-right text-[11px] text-slate-600">
            <p><span className="font-semibold">Date:</span> {fmtDate(new Date())}</p>
            <p><span className="font-semibold">Reference:</span> {app.referenceNo}</p>
            <p><span className="font-semibold">Status:</span> OFFERED</p>
          </div>
        </div>

        <h2 className="mt-5 text-center text-lg font-bold uppercase tracking-wide text-emerald-700">
          Admission Offer Letter
        </h2>

        <div className="mt-4 text-[13px] leading-relaxed text-slate-700">
          <p>
            Dear {app.parentName},
          </p>
          <p className="mt-3">
            We are delighted to inform you that <span className="font-semibold">{app.fullName}</span> has been
            offered admission to <span className="font-semibold">{school?.name ?? "our school"}</span> in{" "}
            <span className="font-semibold">{className}</span> for the{" "}
            <span className="font-semibold">{year?.name ?? ""}</span> academic year.
          </p>
          <p className="mt-3">
            The child has been issued the admission number{" "}
            <span className="font-mono font-semibold">{app.student.admissionNo}</span>. Please present this letter
            and the documents listed below when reporting to school on{" "}
            <span className="font-semibold">{reopened}</span>.
          </p>
        </div>

        {/* Child + admission details */}
        <h3 className="mt-4 text-sm font-bold uppercase tracking-wider text-emerald-700">Admission Details</h3>
        <div className="mt-1 rounded-lg border border-slate-200 p-3 text-[12px]">
          <Row k="Child's full name" v={app.fullName} />
          <Row k="Admission number" v={app.student.admissionNo} />
          <Row k="Class admitted to" v={className} />
          <Row k="Academic year" v={year?.name ?? ""} />
          <Row k="Gender" v={app.gender ?? ""} />
          <Row k="Date of birth" v={fmtDate(app.dateOfBirth)} />
        </div>

        {/* Required documents */}
        <h3 className="mt-3 text-sm font-bold uppercase tracking-wider text-emerald-700">Please Bring On Reporting Day</h3>
        <ul className="mt-1 rounded-lg border border-slate-200 p-3 text-[12px] text-slate-700">
          {[
            "This offer letter (printed or on your phone)",
            "Two recent passport-size photographs",
            "Birth certificate or baptismal card",
            "Previous school's report card (Basic 1 and above)",
            "Medical / NHIS information where applicable",
          ].map((d) => (
            <li key={d} className="flex items-start gap-2 py-0.5">
              <span className="mt-0.5 text-emerald-600">✓</span> {d}
            </li>
          ))}
        </ul>

        {/* Acceptance */}
        <h3 className="mt-3 text-sm font-bold uppercase tracking-wider text-emerald-700">Acceptance</h3>
        <p className="mt-1 text-[12px] leading-relaxed text-slate-600">
          To accept this offer, please confirm with the school office on or before{" "}
          <span className="font-semibold">{fmtDate(dueDate)}</span>. If we do not hear from you by then, the place
          may be offered to another applicant.
        </p>

        {/* Signatures */}
        <div className="mt-10 flex items-end justify-between gap-6 text-[11px] text-slate-600">
          <div className="text-center">
            <div className="h-10 w-40 border-b border-slate-400" />
            <p className="mt-1">Parent / Guardian Signature</p>
            <p className="text-slate-400">Date: ______________</p>
          </div>
          <div className="text-center">
            <div className="h-10 w-40 border-b border-slate-400" />
            <p className="mt-1">Headteacher / Admissions Officer</p>
            <p className="text-slate-400">Date: ______________</p>
          </div>
        </div>

        <p className="mt-6 text-center text-[10px] text-slate-400">
          {school?.name ?? "School"} · Admission Offer · {app.referenceNo} · {fmtDate(new Date())}
        </p>
      </div>
    </div>
  );
}

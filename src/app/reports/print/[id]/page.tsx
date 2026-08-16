import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getRolePerms, hasPerm } from "@/lib/permissions";
import { getSchool } from "@/lib/school";
import { getSettingJSON } from "@/lib/settings";
import { ReportCardView } from "@/components/reports/report-card-view";
import { AutoPrint } from "@/components/print/auto-print";
import type { ComputedReport } from "@/lib/report";

export const metadata = { title: "Report Card — Print" };

/**
 * Bare A4 print page — no admin shell, no sidebar. The middleware requires a
 * valid session (same rule as /admin), and this server component additionally
 * checks the reports.read permission. It renders ONLY the report sheet with
 * strict A4 portrait CSS and auto-opens the print dialog.
 */
export default async function ReportPrintPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const perms = await getRolePerms(user.roleId);
  if (!hasPerm(perms, "reports", "read")) redirect("/admin");

  const report = await prisma.reportCard.findUnique({
    where: { id: params.id },
    include: { student: true, term: true, academicYear: true, class: { include: { level: true } } },
  });
  if (!report) notFound();

  const data = report.data ? (JSON.parse(report.data) as ComputedReport) : null;
  const school = await getSchool();
  const wm = await getSettingJSON<{ enabled: boolean; opacity: number }>("report.watermark", { enabled: true, opacity: 0.05 });
  const host = headers().get("host") ?? "localhost:61701";
  const proto = headers().get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;
  const qrDataUrl = await QRCode.toDataURL(
    `${origin}/verify-result?ref=${report.id}&sig=${report.qrToken ?? ""}`,
    { width: 240, margin: 1, color: { dark: "#065f46" } }
  );

  if (!data) notFound();

  return (
    <div className="print-shell bg-white">
      <AutoPrint title={`${report.student.fullName} — Report Card`} />
      <ReportCardView
        report={data}
        schoolName={school?.name ?? "School"}
        motto={school?.motto}
        logo="/sms-logo.png"
        qrDataUrl={qrDataUrl}
        vacationDate={report.term.vacationDate?.toISOString()}
        reopeningDate={report.term.reopeningDate?.toISOString()}
        termStartDate={report.term.startDate?.toISOString()}
        termEndDate={report.term.endDate?.toISOString()}
        teacherComment={report.teacherComment ?? undefined}
        headComment={report.headComment ?? undefined}
        watermarkOpacity={wm.enabled ? wm.opacity : 0}
      />
    </div>
  );
}

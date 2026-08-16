import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getSchool } from "@/lib/school";
import { getSettingJSON } from "@/lib/settings";
import { ReportCardView } from "@/components/reports/report-card-view";
import { AutoPrint } from "@/components/print/auto-print";
import type { ComputedReport } from "@/lib/report";

export const metadata = { title: "Report Card — Print" };

/**
 * Parent-portal print page: lets a parent download/print their own ward's
 * PUBLISHED report card as a one-front A4 PDF. The parent role + ward-linkage
 * are verified server-side — a parent can only ever print a report whose
 * student is linked to their own account.
 */
export default async function ParentReportPrintPage({ params }: { params: { reportId: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/portal");
  if (user.role.name !== "parent") redirect("/portal");

  const report = await prisma.reportCard.findUnique({
    where: { id: params.reportId },
    include: { student: true, term: true, academicYear: true, class: { include: { level: true } } },
  });
  if (!report || !report.published) notFound();

  // Ownership check: this parent must be linked to the report's student.
  const linked = await prisma.studentParent.findFirst({
    where: { studentId: report.studentId, parent: { userId: user.id } },
  });
  if (!linked) notFound();

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

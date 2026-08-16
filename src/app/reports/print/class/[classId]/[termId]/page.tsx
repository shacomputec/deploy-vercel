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

export const metadata = { title: "Report Cards — Print All" };

/**
 * Bulk print page: every report card for one class + term, each on its own
 * A4 front page (`.print-card` breaks after every sheet). Session-gated like
 * the single-card print page (login + reports.read).
 */
export default async function PrintAllPage({ params }: { params: { classId: string; termId: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const perms = await getRolePerms(user.roleId);
  if (!hasPerm(perms, "reports", "read")) redirect("/admin");

  const term = await prisma.term.findUnique({ where: { id: params.termId }, include: { academicYear: true } });
  if (!term) notFound();

  const reports = await prisma.reportCard.findMany({
    where: { classId: params.classId, termId: params.termId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: { student: true, term: true, class: { include: { level: true } } },
  });
  if (!reports.length) notFound();

  const school = await getSchool();
  const wm = await getSettingJSON<{ enabled: boolean; opacity: number }>("report.watermark", { enabled: true, opacity: 0.05 });
  const host = headers().get("host") ?? "localhost:61701";
  const proto = headers().get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;

  const cards = await Promise.all(
    reports.map(async (report) => {
      const data = report.data ? (JSON.parse(report.data) as ComputedReport) : null;
      if (!data) return null;
      const qrDataUrl = await QRCode.toDataURL(
        `${origin}/verify-result?ref=${report.id}&sig=${report.qrToken ?? ""}`,
        { width: 240, margin: 1, color: { dark: "#065f46" } }
      );
      return { report, data, qrDataUrl };
    })
  );
  const valid = cards.filter((c): c is NonNullable<typeof c> => c !== null);

  return (
    <div className="print-multi bg-white">
      <AutoPrint title={`${term.name} · ${term.academicYear.name} — ${valid.length} report cards`} />
      {valid.map(({ report, data, qrDataUrl }) => (
        <div key={report.id} className="print-card">
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
      ))}
    </div>
  );
}

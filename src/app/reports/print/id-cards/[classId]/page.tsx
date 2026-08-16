import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getRolePerms, hasPerm } from "@/lib/permissions";
import { getSchool } from "@/lib/school";
import { getIdCardDesign, safeHex } from "@/lib/id-card-builder";
import { AutoPrint } from "@/components/print/auto-print";

export const metadata = { title: "Student ID Cards — Print" };

const DEV = { name: "shacomputec", email: "shacomputecgh@gmail.com", tel: "+233 530 941 750" };

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "—";
}

function fmtDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Printable student ID cards for one class, using the school's saved Card
 * Builder design (Admin → ID Cards → Card Builder). One A4 page per student —
 * the card front sits above a dashed cut line and the card back below it, so
 * each page prints one 85.6×54mm card (front + back). Session-gated.
 */
export default async function IdCardsPrintPage({ params }: { params: { classId: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const perms = await getRolePerms(user.roleId);
  if (!hasPerm(perms, "students", "read")) redirect("/admin");

  const klass = await prisma.class.findUnique({ where: { id: params.classId }, include: { level: true } });
  if (!klass) notFound();

  const [students, school, currentYear, design] = await Promise.all([
    prisma.student.findMany({
      where: { classId: params.classId, status: "ACTIVE" },
      orderBy: { fullName: "asc" },
    }),
    getSchool(),
    prisma.academicYear.findFirst({ where: { isCurrent: true } }),
    getIdCardDesign(),
  ]);
  if (!students.length) notFound();

  const headerBg = safeHex(design.headerBg, "#0f172a");
  const headerTextColor = safeHex(design.headerTextColor, "#ffffff");
  const accent = safeHex(design.accent, "#0f172a");
  const headerTitle = design.headerText.trim() || school?.name || "School";
  const headerSub = design.subtitleText.trim() || `${klass.level?.name ?? ""} · ${klass.name}`;
  const footerText = design.footerText.trim() || `Powered by ${DEV.name} · ${DEV.tel} · ${DEV.email}`;

  const host = headers().get("host") ?? "localhost:61701";
  const proto = headers().get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;

  const cards = await Promise.all(
    students.map(async (s) => {
      const qr = design.back.qr
        ? await QRCode.toDataURL(`${origin}/result-checker`, {
            width: 160, margin: 1, color: { dark: "#0f172a" },
          })
        : null;
      const idNo = s.nhisNumber || s.ghanaCard || "—";
      return { s, qr, idNo };
    })
  );

  return (
    <div className="print-multi bg-white">
      <AutoPrint
        title={`${klass.name} — Student ID Cards (${cards.length})`}
        pdfHref={`/api/id-cards/pdf?kind=students&classId=${params.classId}`}
      />
      {cards.map(({ s, qr, idNo }, i) => (
        <div key={s.id} className="idcard-page flex flex-col items-center gap-[6mm]">
          <p className="idcard-title text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {klass.name} · Student ID Card · {i + 1} of {cards.length}
          </p>

          {/* ── FRONT ── */}
          <div className="idcard flex flex-col">
            <div className="flex items-center justify-between gap-2 border-b border-slate-300 px-3 py-1.5 text-white" style={{ backgroundColor: headerBg, color: headerTextColor }}>
              <div className="min-w-0">
                <p className="text-lg font-extrabold leading-tight">{headerTitle}</p>
                <p className="text-xs opacity-80">{headerSub}</p>
              </div>
              {design.showLogo && <img src="/sms-logo.png" alt="" className="h-8 w-8 shrink-0 rounded-md bg-white object-contain p-0.5" />}
            </div>
            <div className="flex flex-1 items-center gap-3 px-3 py-2">
              {design.front.photo ? (
                s.photo ? (
                  <img src={s.photo} alt="" className="h-[34mm] w-[26mm] shrink-0 rounded-md border border-slate-300 object-cover" />
                ) : (
                  <div className="flex h-[34mm] w-[26mm] shrink-0 items-center justify-center rounded-md border border-slate-300 bg-slate-100 text-2xl font-bold text-slate-400">
                    {initials(s.fullName)}
                  </div>
                )
              ) : (
                <div className="flex h-[34mm] w-[26mm] shrink-0 items-center justify-center rounded-md border border-dashed border-slate-300 text-[10px] text-slate-300">
                  no photo
                </div>
              )}
              <div className="min-w-0 space-y-0.5">
                {design.front.name && <p className="text-sm font-extrabold uppercase leading-tight text-slate-900">{s.fullName}</p>}
                {design.front.classLine && (
                  <p className="text-xs text-slate-500">Class: <span className="font-semibold text-slate-800">{klass.name}</span></p>
                )}
                {design.front.admissionNo && (
                  <p className="text-xs text-slate-500">Admission No: <span className="font-mono font-semibold text-slate-800">{s.admissionNo}</span></p>
                )}
                {design.front.year && (
                  <p className="text-xs text-slate-500">Academic Year: <span className="font-semibold text-slate-800">{currentYear?.name ?? "—"}</span></p>
                )}
                {design.front.gender && (
                  <p className="text-xs text-slate-500">Gender: <span className="font-semibold text-slate-800">{s.gender === "FEMALE" ? "Female" : "Male"}</span></p>
                )}
              </div>
            </div>
            <div className="border-t border-slate-300 px-3 py-1 text-center text-xs font-semibold uppercase tracking-widest text-white" style={{ backgroundColor: accent }}>
              Student Identity Card
            </div>
          </div>

          <div className="idcard-cutline w-[85.6mm] text-center text-[8px] uppercase tracking-widest text-slate-400">
            — cut here · fold & laminate —
          </div>

          {/* ── BACK ── */}
          <div className="idcard flex flex-col">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 px-3 py-2">
              {design.back.idNo && <p className="text-xs text-slate-500">NHIS / ID No: <span className="font-semibold text-slate-900">{idNo}</span></p>}
              {design.back.dob && <p className="text-xs text-slate-500">Date of Birth: <span className="font-semibold text-slate-900">{fmtDate(s.dateOfBirth)}</span></p>}
              {design.back.hometown && <p className="text-xs text-slate-500">Home Town: <span className="font-semibold text-slate-900">{s.hometown || "—"}</span></p>}
              {design.back.region && <p className="text-xs text-slate-500">Region: <span className="font-semibold text-slate-900">{s.region || "—"}</span></p>}
              {design.back.phone && <p className="text-xs text-slate-500">Phone: <span className="font-semibold text-slate-900">{s.phone || "—"}</span></p>}
              {design.back.nationality && <p className="text-xs text-slate-500">Nationality: <span className="font-semibold text-slate-900">{s.nationality || "Ghanaian"}</span></p>}
              {!design.back.idNo && !design.back.dob && !design.back.hometown && !design.back.region && !design.back.phone && !design.back.nationality && (
                <p className="col-span-2 text-[10px] text-slate-300">No back fields selected in the Card Builder.</p>
              )}
            </div>
            <div className="flex flex-1 items-end justify-between gap-3 border-t border-slate-200 px-3 py-1.5">
              {qr ? (
                <div className="min-w-0 text-[8px] leading-tight text-slate-500">
                  <p>Scan the code to check results on the</p>
                  <p>Result Checker portal.</p>
                  <p className="mt-1 font-semibold text-slate-700">{school?.phone ?? ""} {school?.email ?? ""}</p>
                </div>
              ) : (
                <span />
              )}
              {qr && <img src={qr} alt="QR" className="h-11 w-11 shrink-0" />}
            </div>
            {design.back.devFooter && (
              <div className="border-t border-slate-200 px-3 py-1 text-center text-[8px] font-semibold text-white" style={{ backgroundColor: accent }}>
                {footerText}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

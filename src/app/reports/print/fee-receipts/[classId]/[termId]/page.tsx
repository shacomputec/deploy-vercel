import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getRolePerms, hasPerm } from "@/lib/permissions";
import { getSchool } from "@/lib/school";
import { AutoPrint } from "@/components/print/auto-print";

export const metadata = { title: "Fee Receipts — Print" };

const DEV = { name: "shacomputec", email: "shacomputecgh@gmail.com", tel: "+233 530 941 750" };

const ghs = (n: number) =>
  `GHS ${n.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Bulk fee receipts: one official A4 receipt per student in a class for a term,
 * showing every mandatory fee item for their level, the total expected, what has
 * been paid and the balance. Session-gated (login + fees.read).
 */
export default async function FeeReceiptsPrintPage({ params }: { params: { classId: string; termId: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const perms = await getRolePerms(user.roleId);
  if (!hasPerm(perms, "fees", "read")) redirect("/admin");

  const term = await prisma.term.findUnique({ where: { id: params.termId }, include: { academicYear: true } });
  if (!term) notFound();

  const klass = await prisma.class.findUnique({ where: { id: params.classId }, include: { level: true } });
  if (!klass) notFound();

  const [students, feeItems, school] = await Promise.all([
    prisma.student.findMany({
      where: { classId: params.classId, status: "ACTIVE" },
      orderBy: { fullName: "asc" },
      include: { payments: { orderBy: { date: "desc" } } },
    }),
    prisma.feeItem.findMany({ where: { mandatory: true }, include: { level: true } }),
    getSchool(),
  ]);
  if (!students.length) notFound();

  const rows = students.map((s) => {
    const levelId = klass.levelId ?? null;
    const items = feeItems.filter((f) => f.level === null || f.level.id === levelId);
    const expected = items.reduce((a, f) => a + f.amount, 0);
    const paid = s.payments.reduce((a, p) => a + p.amount, 0);
    const balance = Math.max(0, expected - paid);
    return { student: s, items, expected, paid, balance };
  });

  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="print-multi bg-white">
      <AutoPrint title={`${klass.name} — Fee Receipts (${rows.length})`} />
      {rows.map(({ student: s, items, expected, paid, balance }, i) => (
        <div key={s.id} className="fee-receipt-page">
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b-4 border-amber-400 pb-3">
              <div className="flex items-center gap-3">
                <img src="/sms-logo.png" alt="" className="h-14 w-14 rounded-xl object-contain" />
                <div>
                  <p className="text-lg font-extrabold text-slate-900">{school?.name ?? "School"}</p>
                  <p className="text-xs text-slate-500">{school?.motto ?? ""}</p>
                  <p className="text-xs text-slate-500">{school?.address ?? ""} {school?.phone ?? ""}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="rounded-lg border-2 border-amber-400 px-3 py-1 text-sm font-extrabold uppercase tracking-widest text-amber-600">Official Receipt</p>
                <p className="mt-1 text-[10px] font-semibold text-slate-500">No. RCP-{s.admissionNo}-{term.id.slice(-4).toUpperCase()}</p>
                <p className="text-[10px] text-slate-400">{today}</p>
              </div>
            </div>

            {/* Student + term info */}
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <p><span className="text-slate-500">Student:</span> <span className="font-bold text-slate-900">{s.fullName}</span></p>
              <p><span className="text-slate-500">Admission No:</span> <span className="font-mono font-bold text-slate-900">{s.admissionNo}</span></p>
              <p><span className="text-slate-500">Class:</span> <span className="font-bold text-slate-900">{klass.name}</span></p>
              <p><span className="text-slate-500">Term:</span> <span className="font-bold text-slate-900">{term.name} · {term.academicYear.name}</span></p>
            </div>

            {/* Fee items table */}
            <table className="mt-4 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-slate-300 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-2">Fee item</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((f) => (
                  <tr key={f.id} className="border-b border-slate-100">
                    <td className="py-2 text-slate-800">{f.name}</td>
                    <td className="py-2 text-right font-medium text-slate-800">{ghs(f.amount)}</td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={2} className="py-2 text-slate-400">No mandatory fee items set for this level.</td></tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 text-sm font-bold text-slate-900">
                  <td className="py-2">Total expected</td>
                  <td className="py-2 text-right">{ghs(expected)}</td>
                </tr>
                <tr className="text-emerald-700">
                  <td className="py-1">Paid to date</td>
                  <td className="py-1 text-right font-bold">{ghs(paid)}</td>
                </tr>
                <tr className={`text-sm font-extrabold ${balance > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                  <td className="py-2">Balance {balance > 0 ? "owing" : "settled"}</td>
                  <td className="py-2 text-right">{ghs(balance)}</td>
                </tr>
              </tfoot>
            </table>

            {/* Signature block */}
            <div className="mt-auto grid grid-cols-2 gap-10 pt-10">
              <div className="border-t border-slate-300 pt-2 text-center text-xs text-slate-500">Accountant / Bursar</div>
              <div className="border-t border-slate-300 pt-2 text-center text-xs text-slate-500">Received by (parent / guardian)</div>
            </div>

            <p className="mt-4 border-t border-slate-100 pt-2 text-center text-[9px] text-slate-400">
              This receipt was generated by the {school?.name ?? "school"} management system · Powered by {DEV.name} · {DEV.tel} · {DEV.email}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

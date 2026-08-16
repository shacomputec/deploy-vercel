import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getSchool } from "@/lib/school";
import { AutoPrint } from "@/components/print/auto-print";

export const metadata = { title: "License Receipt — Print" };

/**
 * Bare A4 print page for a license payment receipt — no admin shell, no
 * sidebar. Requires a valid session (middleware rule like /admin) and prints
 * ONLY the receipt sheet with strict A4 portrait CSS.
 */
export default async function LicenseReceiptPrintPage({ params }: { params: { reference: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const tx = await prisma.paymentGatewayTx.findUnique({
    where: { reference: params.reference },
  });
  if (!tx || (tx.purpose !== "LICENSE" && tx.purpose !== "LICENSE_PURCHASE")) notFound();

  const school = await getSchool();
  const amount = tx.amount.toFixed(2);
  const method = tx.method === "MOMO"
    ? `Mobile Money${tx.provider ? ` (${tx.provider})` : ""}`
    : "Paystack (card / mobile money)";

  return (
    <div className="print-shell bg-white">
      <AutoPrint title="License payment receipt" />
      <div className="receipt-sheet mx-auto max-w-[794px] bg-white p-10">
        {/* Brand row */}
        <div className="flex items-start justify-between gap-6 border-b border-slate-200 pb-6">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/sms-logo.png" alt="shacomputec" className="h-14 w-auto" />
            <div>
              <p className="text-lg font-black tracking-tight text-slate-900">{school?.name ?? "School"}</p>
              <p className="text-xs text-slate-500">GES School MIS · License payment receipt</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Receipt</p>
            <p className="mt-0.5 font-mono text-sm font-semibold text-slate-800">{tx.reference}</p>
            <p className="text-xs text-slate-500">{new Date(tx.createdAt).toLocaleString()}</p>
          </div>
        </div>

        {/* Status pill */}
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <p className="text-sm font-bold text-emerald-800">
            {tx.status === "SUCCESS" ? "✓ Payment confirmed" : tx.status === "PENDING" ? "Payment pending confirmation" : "Payment not completed"}
          </p>
          <p className="mt-0.5 text-xs text-emerald-700/80">
            {tx.status === "SUCCESS"
              ? "Your license key was delivered to your email / WhatsApp / SMS."
              : "This receipt is a record of the payment attempt."}
          </p>
        </div>

        {/* Details */}
        <table className="mt-6 w-full text-sm">
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Reference</td>
              <td className="py-3 text-right font-mono text-slate-800">{tx.reference}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Amount</td>
              <td className="py-3 text-right font-bold text-slate-900">GHS {amount}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Method</td>
              <td className="py-3 text-right text-slate-700">{method}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Date</td>
              <td className="py-3 text-right text-slate-700">{new Date(tx.createdAt).toLocaleString()}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Purpose</td>
              <td className="py-3 text-right text-slate-700">License activation (GES School MIS)</td>
            </tr>
            <tr>
              <td className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Status</td>
              <td className="py-3 text-right font-semibold text-slate-800">{tx.status}</td>
            </tr>
          </tbody>
        </table>

        {/* Total */}
        <div className="mt-6 flex items-center justify-between rounded-2xl bg-slate-900 px-6 py-4 text-white">
          <span className="text-sm font-semibold">Total paid</span>
          <span className="text-xl font-black">GHS {amount}</span>
        </div>

        {/* Footer */}
        <div className="mt-8 border-t border-slate-200 pt-5 text-center">
          <p className="text-xs text-slate-500">
            {school?.developerName ? `Developed by ${school.developerName}` : "Developed by shacomputec"} —{" "}
            {school?.developerPhone || "+233 530 941 750"} · {school?.developerEmail || "shacomputecgh@gmail.com"}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Keep this receipt together with your license key. It is for your records.
          </p>
        </div>
      </div>
    </div>
  );
}

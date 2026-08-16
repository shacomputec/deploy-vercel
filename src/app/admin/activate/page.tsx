import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/admin/page-header";
import { LicensePayPanel } from "@/components/dev/license-pay-panel";

export const metadata = { title: "Activate the license" };

/**
 * The BUYER's activation page — reachable from the dashboard setup checklist
 * and Settings. It only lets the school PAY (Paystack online or direct mobile
 * money to the developer); the developer's console, keys and technical details
 * are never shown here. Payment runs on the developer's own gateway keys.
 */
export default async function ActivatePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div>
      <PageHeader
        title="Activate the license"
        subtitle="Remove the trial countdown — pay securely online or by mobile money, and your license key arrives instantly."
      />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="card p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <KeyRound className="h-5 w-5 text-primary" /> License activation
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            This screen only handles payment. No API keys or technical details are shown — activation is
            completed by your developer the moment your payment is confirmed, and the license key is delivered
            instantly to the contact you provide.
          </p>
          <div className="mt-5">
            <LicensePayPanel />
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-900 p-6 text-white">
            <h4 className="text-sm font-bold uppercase tracking-wider text-amber-300">How it works</h4>
            <ol className="mt-3 space-y-3 text-sm text-slate-300">
              <li className="flex gap-2"><span className="font-bold text-white">1.</span> Choose a payment method below — Paystack (card / mobile money) or direct mobile money to the developer&apos;s number.</li>
              <li className="flex gap-2"><span className="font-bold text-white">2.</span> Complete the payment — a receipt confirms your purchase.</li>
              <li className="flex gap-2"><span className="font-bold text-white">3.</span> Your license key is delivered instantly by SMS / WhatsApp / email to the contact you give. The trial countdown disappears.</li>
            </ol>
          </div>
          <div className="card p-6">
            <h4 className="text-sm font-bold text-slate-800">Need help?</h4>
            <p className="mt-1 text-xs text-slate-500">
              Payments run on the developer&apos;s own accounts. For anything about payment, activation or support,
              contact your system developer directly — their details are shown on the payment panel below.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

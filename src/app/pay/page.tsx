import { PayCheckout } from "@/components/site/pay-checkout";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pay Fees Online" };

export default function PayPage() {
  return (
    <div>
      <section className="page-hero text-white">
        <div className="container-x">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Secure Payments</p>
          <h1 className="mt-2 text-4xl font-bold">Pay School Fees Online</h1>
          <p className="mt-3 max-w-2xl text-slate-300">
            Settle fees securely with MTN, AirtelTigo or Telecel Mobile Money, or Paystack. An official receipt number is issued automatically the moment your payment is confirmed — no login required.
          </p>
        </div>
      </section>
      <section className="container-x py-14">
        <PayCheckout />
      </section>
    </div>
  );
}

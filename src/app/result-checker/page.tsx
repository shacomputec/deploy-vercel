import { ResultChecker } from "@/components/site/result-checker";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Result Checker" };

export default function ResultCheckerPage() {
  return (
    <div>
      <section className="page-hero text-white">
        <div className="container-x">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Secure Portal</p>
          <h1 className="mt-2 text-4xl font-bold">Result Checker</h1>
          <p className="mt-3 max-w-2xl text-slate-300">
            View, download and print termly report cards securely. Each check is protected by a one-time password (OTP) sent to the registered phone number — no login required.
          </p>
        </div>
      </section>
      <section className="container-x py-14">
        <ResultChecker />
      </section>
    </div>
  );
}

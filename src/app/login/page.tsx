import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginContent } from "@/components/auth/login-content";
import { getSchool } from "@/lib/school";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Portal Login" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/admin");

  const school = await getSchool();
  const loginLogo = school?.logo || "/login-screen.jpg"; // editable by the school via Admin → School & Settings
  const schoolName = school?.name || "Our School";
  const motto = school?.motto || "Hard Works Never Fail";

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      <div className="absolute right-4 top-4 z-20">
        {/* developer logo — fixed brand mark, not editable. The public website
            has NO theme switcher — the UI-theme panel is developer-mode only
            (visible in the Developer Console and the developer's admin shell). */}
        <div
          className="flex items-center rounded-full border border-white/60 bg-white/70 py-1 pr-2 pl-1 shadow-card backdrop-blur-2xl"
          title="Developed by shacomputec — Hard Works Never Fail"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/sms-logo.png"
            alt="shacomputec — Hard Works Never Fail"
            className="h-9 w-auto rounded-lg"
          />
        </div>
      </div>

      {/* ── Signature aurora background ── */}
      <div className="absolute inset-0 -z-10">
        {/* drifting gradient orbs */}
        <div className="animate-aurora absolute -left-40 -top-48 h-[34rem] w-[34rem] rounded-full bg-primary/25 blur-3xl" />
        <div className="animate-aurora-rev absolute -bottom-40 -right-32 h-[30rem] w-[30rem] rounded-full bg-accent/25 blur-3xl" />
        <div className="animate-aurora absolute left-1/2 top-1/3 h-96 w-96 rounded-full bg-gradient-to-br from-primary-soft to-emerald-200/60 blur-3xl" />
        {/* subtle grid texture */}
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgb(var(--c-primary) / 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgb(var(--c-primary) / 0.06) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 90% 70% at 50% 40%, black, transparent)",
          }}
        />
      </div>

      <LoginContent schoolName={schoolName} motto={motto} loginLogo={loginLogo} />
    </div>
  );
}

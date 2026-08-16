import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { SetupForm } from "@/components/auth/setup-form";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "System Setup" };

export default async function SetupPage() {
  const user = await getCurrentUser();
  if (user) redirect("/admin");

  const userCount = await prisma.user.count();
  if (userCount > 0) redirect("/login");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center text-white">
          <div className="mb-5 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/sms-logo.png" alt="shacomputec — Hard Works Never Fail" className="h-28 w-auto rounded-2xl shadow-2xl" />
          </div>
          <h1 className="text-2xl font-bold">Welcome — First-Time Setup</h1>
          <p className="mt-2 text-sm text-emerald-100/80">
            Create the <span className="font-bold">Developer</span> account. This is the highest-authority account and controls system licensing and administrators.
          </p>
        </div>
        <div className="card p-8">
          <SetupForm />
        </div>
      </div>
    </div>
  );
}

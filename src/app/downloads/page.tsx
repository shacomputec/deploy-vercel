import Link from "next/link";
import {
  Download, Smartphone, Monitor, Globe, ShieldCheck, CheckCircle2,
  MessageCircle, Phone, FileDown, HardDrive,
} from "lucide-react";
import { getSchool } from "@/lib/school";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Downloads" };

const DEV = {
  name: "shacomputec",
  phone: "+233 530 941 750",
  phoneHref: "tel:+233530941750",
  email: "shacomputecgh@gmail.com",
};

const APK = {
  path: "/mobile/GES-School-MIS-1.4.3.apk",
  version: "1.4.3",
  size: "59 MB",
};

const STEPS = [
  { t: "Download", d: "Get the Android app below, or ask for the Windows installer on WhatsApp." },
  { t: "Install", d: "Windows: double-click Setup.exe — nothing else needed. Android: allow “unknown apps”, tap Install." },
  { t: "Log in", d: "The accounts created on first run (developer, super admin, admin, staff) work on every device." },
  { t: "Sync", d: "Desktop: Settings → Cloud ↔ offline sync to mirror the live website's data on the PC." },
];

export default async function DownloadsPage() {
  const school = await getSchool();
  const waMessage = encodeURIComponent(
    "Hello, I'd like to download the GES School MIS Windows installer for my school."
  );

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_300px_at_80%_-20%,rgb(5_150_105/0.5),transparent_60%),radial-gradient(500px_280px_at_10%_110%,rgb(217_119_6/0.35),transparent_55%)]" />
        <div className="container-x relative py-16">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-300">
            <Download className="h-3.5 w-3.5" /> v{APK.version} · Latest release
          </div>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">
            Download the <span className="text-gradient">GES School MIS</span> apps
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-slate-300">
            One system for your whole school — a <strong className="text-white">Windows desktop app</strong>,
            an <strong className="text-white">Android app</strong> and your <strong className="text-white">school website</strong>,
            all sharing the same live database, even offline.
          </p>
        </div>
      </section>

      {/* Download cards */}
      <section className="container-x py-14">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Android */}
          <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Smartphone className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-ink">Android app</h2>
            <p className="mt-1 text-sm text-slate-600">
              Install on any Android phone. Already points at the live system — no setup needed.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> Version {APK.version} · {APK.size}</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> Teachers &amp; administrators on the go</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> Same data as the website, synced live</li>
            </ul>
            <a
              href={APK.path}
              className="btn-primary mt-6 inline-flex items-center justify-center gap-2"
            >
              <FileDown className="h-4 w-4" /> Download APK
            </a>
            <p className="mt-3 text-xs text-slate-500">
              When asked, allow “Install unknown apps” for your browser or file manager.
            </p>
          </div>

          {/* Windows */}
          <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Monitor className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-ink">Windows desktop app</h2>
            <p className="mt-1 text-sm text-slate-600">
              The full system on the school's computer — app, server and database in one installer.
              Works completely offline.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> One Setup.exe — no .NET, no Node, no internet needed</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> First run creates all accounts automatically</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> Cloud ↔ offline sync built in</li>
            </ul>
            <a
              href={`https://wa.me/233530941750?text=${waMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-accent mt-6 inline-flex items-center justify-center gap-2"
            >
              <MessageCircle className="h-4 w-4" /> Request the installer on WhatsApp
            </a>
            <p className="mt-3 text-xs text-slate-500">
              The installer (~350&nbsp;MB) is delivered directly by {DEV.name} — {DEV.phone}. Schools receive
              it with their purchase, plus the full release package.
            </p>
          </div>
        </div>

        {/* Note strip */}
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary-soft/50 p-5 text-sm text-slate-700">
          <Globe className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p>
            <strong>Already using the system?</strong> You don't need to download anything — the{" "}
            <Link href="/login" className="font-semibold text-primary underline">website portal</Link> works
            from any phone or computer with a browser. The apps add offline access and one-click shortcuts.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="border-t border-slate-200 bg-white py-14">
        <div className="container-x">
          <p className="section-kicker text-primary">After installing</p>
          <h2 className="mt-2 text-3xl font-bold text-ink">From download to full system in minutes</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.t} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">{i + 1}</div>
                <h3 className="font-bold text-ink">{s.t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="container-x py-14">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-6">
            <HardDrive className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <h3 className="font-bold text-ink">Works offline</h3>
              <p className="mt-1 text-sm text-slate-600">The Windows app runs with no internet — data syncs to the cloud whenever you want.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-6">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <h3 className="font-bold text-ink">Secure by default</h3>
              <p className="mt-1 text-sm text-slate-600">Role-based access, encrypted records, audit logs and automatic backups.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-6">
            <Phone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <h3 className="font-bold text-ink">Support included</h3>
              <p className="mt-1 text-sm text-slate-600">Installation, staff training and support from {DEV.name} — {DEV.phone}.</p>
            </div>
          </div>
        </div>

        <div className="mt-10 text-center">
          <p className="text-sm text-slate-600">Not sure yet? See everything the system does.</p>
          <Link href="/buy" className="btn-primary mt-4 inline-flex items-center gap-2">
            Explore the full system <Download className="h-4 w-4 rotate-180" />
          </Link>
        </div>
      </section>
    </div>
  );
}

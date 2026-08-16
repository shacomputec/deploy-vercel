"use client";

import {
  ArrowRight, BadgeCheck, BookOpenCheck, FileSearch, GraduationCap,
  Landmark, Lock, MessageCircle, Phone, ShieldCheck, Sparkles, Users, Wallet, Zap,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/client";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { PortalSignIn } from "@/components/auth/portal-signin";

type Props = { schoolName: string; motto: string; loginLogo: string };

export function LoginContent({ schoolName, motto, loginLogo }: Props) {
  const { t } = useLanguage();

  const portals = [
    { icon: GraduationCap, title: t("login.studentPortal"), desc: t("login.studentPortalDesc"), href: "/portal/student" },
    { icon: Users, title: t("login.parentPortal"), desc: t("login.parentPortalDesc"), href: "/portal/parent" },
    { icon: ShieldCheck, title: t("login.staffAdmin"), desc: t("login.staffAdminDesc"), href: "/admin" },
  ];

  const guestLinks = [
    { href: "/results", label: t("login.checkResults"), icon: FileSearch },
    { href: "/pay", label: t("login.payFeesOnline"), icon: Wallet },
    { href: "/admissions", label: t("login.applyAdmission"), icon: BookOpenCheck },
  ];

  const trust = [
    { icon: BadgeCheck, label: t("login.naacca") },
    { icon: Landmark, label: t("login.gesGrading") },
    { icon: Lock, label: t("login.secureOtp") },
  ];

  return (
    <div className="container-x grid min-h-full items-center gap-12 py-14 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
      {/* ── Brand panel ── */}
      <div className="order-2 lg:order-1">
        <div className="mx-auto max-w-xl">
          <div className="animate-fade-up rounded-3xl border border-white/60 bg-white/70 p-8 shadow-lift backdrop-blur-2xl sm:p-10">
            <div className="flex items-start gap-5">
              <div className="relative shrink-0">
                <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-primary/30 via-transparent to-accent/30 blur-md" aria-hidden />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={loginLogo}
                  alt={schoolName}
                  className="relative h-28 w-28 rounded-2xl border border-white bg-white object-contain p-1 shadow-card sm:h-32 sm:w-32"
                />
              </div>
              <div className="min-w-0 pt-1">
                <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
                  <Zap className="h-3 w-3" /> {t("login.schoolPortal")}
                </p>
                <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight text-ink sm:text-3xl">
                  {schoolName}
                </h1>
                {motto && (
                  <p className="mt-1 bg-gradient-to-r from-primary to-accent bg-clip-text text-sm font-bold text-transparent">
                    “{motto}”
                  </p>
                )}
              </div>
            </div>

            <p className="mt-6 leading-relaxed text-slate-500">{t("login.signInSubtitle")}</p>

            {/* trust chips */}
            <div className="mt-5 flex flex-wrap gap-2">
              {trust.map((tr) => (
                <span key={tr.label} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100/90 px-3 py-1.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200/80">
                  <tr.icon className="h-3.5 w-3.5 text-primary" /> {tr.label}
                </span>
              ))}
            </div>

            <div className="mt-8 space-y-3">
              {portals.map((p) => (
                <a
                  key={p.href}
                  href={p.href}
                  className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white/90 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-soft to-emerald-100 text-primary transition group-hover:scale-105">
                    <p.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-800 group-hover:text-primary">{p.title}</span>
                    <span className="block text-xs text-slate-400">{p.desc}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-primary" />
                </a>
              ))}
            </div>

            {/* guest quick links — things visitors can do without signing in */}
            <div className="mt-6 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{t("login.noAccount")}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {guestLinks.map((g) => (
                  <a
                    key={g.href}
                    href={g.href}
                    className="group flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 transition hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary hover:shadow-card"
                  >
                    <g.icon className="h-3.5 w-3.5 text-primary" /> {g.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sign-in card ── */}
      <div className="order-1 lg:order-2">
        <div className="relative mx-auto w-full max-w-md">
          <div className="animate-fade-up absolute -inset-1 rounded-[26px] bg-gradient-to-br from-primary/35 via-transparent to-accent/35 blur-lg" aria-hidden />
          <div className="card relative p-8 sm:p-10" style={{ animationDelay: "80ms" }}>
            {/* gradient hairline */}
            <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" aria-hidden />
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-accent">
                <Sparkles className="h-3.5 w-3.5" />
                {t("login.securePortal")}
              </div>
              <LanguageSwitcher variant="pills" className="justify-end" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-ink">{t("login.signInTitle")}</h2>
            <p className="mb-5 mt-1 text-sm text-slate-500">{t("login.signInSubtitle")}</p>
            <PortalSignIn />
          </div>

          {/* Public 'Buy this system' — the developer's sales card, shown to
              everyone (not developer-mode). The developer info & logo are
              fixed and cannot be changed or edited. */}
          <div className="animate-fade-up mt-5 rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-card backdrop-blur-xl" style={{ animationDelay: "140ms" }}>
            <p className="text-sm font-extrabold text-ink">{t("login.buyTitle")}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{t("login.buyDesc")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href="/buy"
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-accent px-3.5 py-2 text-xs font-bold text-white shadow-card transition hover:-translate-y-0.5 hover:shadow-lift"
              >
                {t("login.seeOffers")} <ArrowRight className="h-3.5 w-3.5" />
              </a>
              <a
                href="https://wa.me/233530941750"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-card"
              >
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </a>
              <a
                href="tel:+233530941750"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-600 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-card"
              >
                <Phone className="h-3.5 w-3.5" /> Call
              </a>
            </div>
            <p className="mt-3 text-[11px] font-semibold text-slate-400">
              Built by shacomputec · +233 530 941 750 · shacomputecgh@gmail.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

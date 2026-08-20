"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, GraduationCap, Menu, ShieldCheck, Wallet, X } from "lucide-react";
import type { School } from "@prisma/client";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/client";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { Logo } from "@/components/site/logo";
import type { UiKey } from "@/lib/i18n/translations";

type NavItem = { href?: string; label: UiKey; children?: { href: string; label: UiKey }[] };

const NAV: NavItem[] = [
  { href: "/", label: "nav.home" },
  {
    label: "nav.about",
    children: [
      { href: "/about", label: "nav.aboutUs" },
      { href: "/developer", label: "nav.developer" },
      { href: "/history", label: "nav.history" },
      { href: "/staff", label: "nav.staff" },
      { href: "/gallery", label: "nav.gallery" },
    ],
  },
  { href: "/programmes", label: "nav.programmes" },
  { href: "/news", label: "nav.news" },
  { href: "/blog", label: "nav.blog" },
  { href: "/events", label: "nav.events" },
  { href: "/admissions", label: "nav.admissions" },
  { href: "/buy", label: "nav.buy" },
  { href: "/downloads", label: "nav.downloads" },
  { href: "/contact", label: "nav.contact" },
];

export function SiteNavbar({ school }: { school: School | null }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="no-print sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Link href="/" onClick={() => setOpen(false)}>
          <Logo school={school} />
        </Link>

        {/* desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) =>
            item.children ? (
              <div key={item.label} className="group relative" onMouseEnter={() => setAboutOpen(true)} onMouseLeave={() => setAboutOpen(false)}>
                <button className={cn("flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-ink", aboutOpen && "text-ink")}>
                  {t(item.label)}
                  <ChevronDown className={cn("h-3.5 w-3.5 transition", aboutOpen && "rotate-180")} />
                </button>
                <div className={cn("absolute left-0 top-full w-48 overflow-hidden rounded-xl border border-slate-200 bg-white pt-1 shadow-lift transition-all", aboutOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0")}>
                  {item.children.map((c) => (
                    <Link key={c.href} href={c.href} className={cn("block px-4 py-2.5 text-sm text-slate-600 hover:bg-primary-soft hover:text-ink", isActive(c.href) && "text-ink font-semibold")}>
                      {c.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href!}
                className={cn("rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-slate-100 hover:text-ink", isActive(item.href!) ? "text-ink" : "text-slate-600")}
              >
                {t(item.label)}
              </Link>
            )
          )}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <LanguageSwitcher />
          <ThemeSwitcher compact />
          <Link href="/pay" className="btn-outline btn-sm">
            <Wallet className="h-4 w-4" />
            {t("nav.payFees")}
          </Link>
          <Link href="/result-checker" className="btn-outline btn-sm">
            <GraduationCap className="h-4 w-4" />
            {t("nav.resultChecker")}
          </Link>
          <Link href="/admin" className="btn-outline btn-sm">
            <ShieldCheck className="h-4 w-4" />
            {t("nav.adminPortal")}
          </Link>
          <Link href="/login" className="btn-primary btn-sm">
            {t("nav.portalLogin")}
          </Link>
        </div>

        {/* mobile toggle */}
        <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* mobile menu */}
      {open && (
        <div className="border-t border-slate-200 bg-white px-4 pb-6 pt-2 lg:hidden">
          {NAV.map((item) =>
            item.children ? (
              <div key={item.label}>
                <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{item.label}</p>
                {item.children.map((c) => (
                  <Link key={c.href} href={c.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
                    {t(c.label)}
                  </Link>
                ))}
              </div>
            ) : (
              <Link key={item.href} href={item.href!} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
                {t(item.label)}
              </Link>
            )
          )}
          <div className="mt-2 flex items-center justify-between gap-2">
            <LanguageSwitcher />
            <ThemeSwitcher compact />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/pay" onClick={() => setOpen(false)} className="btn-outline flex-1">
              {t("nav.payFees")}
            </Link>
            <Link href="/result-checker" onClick={() => setOpen(false)} className="btn-outline flex-1">
              {t("nav.resultChecker")}
            </Link>
            <Link href="/admin" onClick={() => setOpen(false)} className="btn-outline flex-1">
              {t("nav.adminPortal")}
            </Link>
            <Link href="/login" onClick={() => setOpen(false)} className="btn-primary flex-1">
              {t("nav.portalLogin")}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

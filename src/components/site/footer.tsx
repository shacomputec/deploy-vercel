import Link from "next/link";
import { Facebook, Instagram, Mail, MapPin, Phone, Twitter, Youtube, MessageCircle } from "lucide-react";
import type { School } from "@prisma/client";
import { Logo } from "@/components/site/logo";
import { DeveloperCredit } from "@/components/site/developer-credit";

export function SiteFooter({ school, isDeveloper = false }: { school: School | null; isDeveloper?: boolean }) {
  const socials = [
    school?.facebook && { href: school.facebook, icon: Facebook, label: "Facebook" },
    school?.twitter && { href: school.twitter, icon: Twitter, label: "X / Twitter" },
    school?.instagram && { href: school.instagram, icon: Instagram, label: "Instagram" },
    school?.youtube && { href: school.youtube, icon: Youtube, label: "YouTube" },
    school?.whatsapp && { href: `https://wa.me/${school.whatsapp.replace(/\D/g, "")}`, icon: MessageCircle, label: "WhatsApp" },
  ].filter(Boolean) as { href: string; icon: typeof Facebook; label: string }[];

  const quickLinks = [
    { href: "/about", label: "About Us" },
    { href: "/programmes", label: "Academic Programmes" },
    { href: "/admissions", label: "Online Admission" },
    { href: "/result-checker", label: "Result Checker" },
    { href: "/pay", label: "Pay Fees Online" },
    { href: "/gallery", label: "Gallery" },
    { href: "/news", label: "News & Events" },
    { href: "/buy", label: "Buy This System" },
  ];

  return (
    <footer className="no-print border-t border-slate-200 bg-slate-900 text-slate-300">
      <div className="container-x grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="[&_span]:text-white">
            <Logo school={school} />
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
            {school?.motto && <span className="font-medium text-slate-200">{school.motto}</span>}
            {" — "}A GES-accredited institution nurturing learners from Crèche to Senior High School under the NaCCA curriculum.
          </p>
          {socials.length > 0 && (
            <div className="mt-5 flex gap-2">
              {socials.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label} className="rounded-lg bg-slate-800 p-2 text-slate-300 transition hover:bg-primary hover:text-white">
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          )}
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-white">Quick Links</h4>
          <ul className="mt-4 space-y-2.5 text-sm">
            {quickLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-slate-400 transition hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-white">Contact</h4>
          <ul className="mt-4 space-y-3 text-sm text-slate-400">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-soft" />
              <span>
                {school?.address}
                <br />
                {school?.district}, {school?.region}
              </span>
            </li>
            {school?.phone && (
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-primary-soft" />
                <a href={`tel:${school.phone}`} className="hover:text-white">{school.phone}</a>
              </li>
            )}
            {school?.email && (
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-primary-soft" />
                <a href={`mailto:${school.email}`} className="hover:text-white">{school.email}</a>
              </li>
            )}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-white">Office Hours</h4>
          <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
            <li className="flex justify-between gap-4"><span>Monday – Friday</span><span>7:30 AM – 4:30 PM</span></li>
            <li className="flex justify-between gap-4"><span>Saturday</span><span>9:00 AM – 12:00 PM</span></li>
            <li className="flex justify-between gap-4"><span>Sunday</span><span>Closed</span></li>
          </ul>
          <Link href="/admissions" className="btn-accent mt-6 w-full">
            Apply for Admission
          </Link>
        </div>
      </div>
      <div className="border-t border-slate-800">
        <div className="container-x flex flex-col items-center justify-between gap-3 py-5 text-xs text-slate-500 lg:flex-row">
          <p className="text-center lg:text-left">© {new Date().getFullYear()} {school?.name ?? "School"} · All rights reserved</p>
          <DeveloperCredit isDeveloper={isDeveloper} />
          <div className="flex items-center gap-2">
            <span>Powered by</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/sms-logo.png" alt="shacomputec — Hard Works Never Fail" className="h-9 w-auto rounded-lg" />
          </div>
        </div>
      </div>
    </footer>
  );
}

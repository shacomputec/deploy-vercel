import { Mail, Phone, ShieldCheck } from "lucide-react";

/**
 * Official developer information — hardcoded by contract and shown in the
 * footer of every page (public site, admin portal, student/parent/teacher/
 * staff portals, login). These values are intentionally NOT read from the
 * school settings or any editable store: they identify the developer
 * (shacomputec) and must never be changed or removed.
 */
export const DEVELOPER = {
  name: "shacomputec",
  email: "shacomputecgh@gmail.com",
  phone: "+233 530 941 750",
} as const;

export function DeveloperCredit({ dark = true, isDeveloper = false }: { dark?: boolean; isDeveloper?: boolean }) {
  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs ${
        dark ? "text-slate-400" : "text-slate-500"
      }`}
      title="Official developer information — cannot be edited"
    >
      {isDeveloper ? (
        /* Deliberately a plain badge, NOT a link: the footer must never be a
           doorway into the developer console. The console is reached only via
           the developer's own login flow at /dev. */
        <span
          className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 font-semibold text-slate-200 ring-1 ring-white/15"
          title="Official developer information — cannot be edited"
        >
          <ShieldCheck className="h-3 w-3 text-emerald-400" />
          {DEVELOPER.name}
          <span className="rounded-full bg-emerald-400/20 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-emerald-300">Dev</span>
        </span>
      ) : (
        <span className="font-semibold text-slate-300">Developed by {DEVELOPER.name}</span>
      )}
      <a
        href={`mailto:${DEVELOPER.email}`}
        className="inline-flex items-center gap-1 transition hover:text-white"
      >
        <Mail className="h-3 w-3" /> {DEVELOPER.email}
      </a>
      <a href={`tel:${DEVELOPER.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1 transition hover:text-white">
        <Phone className="h-3 w-3" /> {DEVELOPER.phone}
      </a>
    </div>
  );
}

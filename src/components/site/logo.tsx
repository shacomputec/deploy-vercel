import { cn } from "@/lib/utils";
import type { School } from "@prisma/client";

export function Logo({ school, className }: { school: Pick<School, "name" | "shortName" | "logo"> | null; className?: string }) {
  // The developer brand mark is fixed (not editable from the admin panel); the
  // editable school logo only drives the login screen and report cards.
  const src = "/sms-logo.png";
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-10 w-10 shrink-0 rounded-xl object-contain" />
      <span className="flex flex-col leading-tight">
        <span className="text-[15px] font-bold tracking-tight text-ink">{school?.name ?? "School MIS"}</span>
        {school?.shortName && <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{school.shortName}</span>}
      </span>
    </span>
  );
}

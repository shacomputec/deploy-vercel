"use client";

import { Megaphone } from "lucide-react";

export function AnnouncementTicker({ items }: { items: { title: string; body?: string | null }[] }) {
  if (!items.length) return null;
  const text = items.map((i) => `${i.title}${i.body ? ` — ${i.body}` : ""}`).join("   •   ");
  return (
    <div className="no-print flex items-center gap-3 overflow-hidden border-b border-amber-200 bg-amber-50 px-4 py-2">
      <span className="flex shrink-0 items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-700">
        <Megaphone className="h-4 w-4" />
        Announcements
      </span>
      <div className="relative flex-1 overflow-hidden">
        <div className="animate-marquee flex w-max gap-8 whitespace-nowrap text-sm text-amber-800">
          <span>{text}</span>
          <span aria-hidden>{text}</span>
        </div>
      </div>
    </div>
  );
}

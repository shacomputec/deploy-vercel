import { prisma } from "@/lib/prisma";
import { schoolWhere } from "@/lib/school";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Calendar" };

export default async function CalendarPage() {
  const scope = await schoolWhere();
  const events = await prisma.eventItem.findMany({
    where: { published: true, ...scope },
    orderBy: { startDate: "asc" },
  });

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay.getDay(); // 0 = Sunday
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const eventsByDay = new Map<number, typeof events>();
  for (const e of events) {
    const d = new Date(e.startDate);
    if (d.getMonth() === month && d.getFullYear() === year) {
      const arr = eventsByDay.get(d.getDate()) ?? [];
      arr.push(e);
      eventsByDay.set(d.getDate(), arr);
    }
  }

  return (
    <div>
      <section className="page-hero text-white">
        <div className="container-x">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">School Calendar</p>
          <h1 className="mt-2 text-4xl font-bold">
            {firstDay.toLocaleString("en-GB", { month: "long", year: "numeric" })}
          </h1>
          <p className="mt-3 max-w-xl text-slate-300">Upcoming events and important dates for this month.</p>
        </div>
      </section>

      <section className="container-x py-14">
        <div className="card overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {dayNames.map((d) => (
              <div key={d} className="px-2 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-500">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`blank-${i}`} className="min-h-24 border-b border-r border-slate-100 bg-slate-50/50" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = eventsByDay.get(day) ?? [];
              const isToday = day === now.getDate();
              return (
                <div key={day} className={cn("min-h-24 border-b border-r border-slate-100 p-2", isToday && "bg-primary-soft/60")}>
                  <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold", isToday ? "bg-primary text-white" : "text-slate-600")}>
                    {day}
                  </span>
                  <div className="mt-1.5 space-y-1">
                    {dayEvents.map((e) => (
                      <div key={e.id} className="truncate rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800" title={e.title}>
                        {e.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-lg font-semibold text-ink">All Upcoming Events</h2>
          <ul className="mt-4 space-y-2.5">
            {events.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-3.5">
                <div>
                  <p className="font-medium text-slate-700">{e.title}</p>
                  {e.location && <p className="text-xs text-slate-400">{e.location}</p>}
                </div>
                <span className="shrink-0 text-xs text-slate-400">
                  {new Date(e.startDate).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

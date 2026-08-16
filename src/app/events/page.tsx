import { CalendarDays, MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { schoolWhere } from "@/lib/school";
import { EmptyState } from "@/components/ui/empty";
import { fmtDate } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Events" };

export default async function EventsPage() {
  const scope = await schoolWhere();
  const events = await prisma.eventItem.findMany({
    where: { published: true, ...scope },
    orderBy: { startDate: "asc" },
  });

  const upcoming = events.filter((e) => new Date(e.startDate) >= new Date());
  const past = events.filter((e) => new Date(e.startDate) < new Date()).slice(0, 8);

  return (
    <div>
      <section className="page-hero text-white">
        <div className="container-x">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Calendar</p>
          <h1 className="mt-2 text-4xl font-bold">Events</h1>
          <p className="mt-3 max-w-xl text-slate-300">Open days, ceremonies, sports and everything happening at school.</p>
        </div>
      </section>

      <section className="container-x py-14">
        {upcoming.length === 0 && past.length === 0 && <EmptyState title="No events scheduled" />}
        {upcoming.length > 0 && (
          <>
            <h2 className="text-xl font-semibold text-ink">Upcoming</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((e) => (
                <div key={e.id} className="card card-hover p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-primary text-white">
                      <span className="text-xl font-bold leading-none">{new Date(e.startDate).getDate()}</span>
                      <span className="text-[11px] font-semibold uppercase">{new Date(e.startDate).toLocaleString("en-GB", { month: "short" })}</span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold leading-snug text-ink">{e.title}</h3>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                        <CalendarDays className="h-3.5 w-3.5" /> {fmtDate(e.startDate)}
                      </p>
                      {e.location && (
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                          <MapPin className="h-3.5 w-3.5" /> {e.location}
                        </p>
                      )}
                    </div>
                  </div>
                  {e.description && <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-500">{e.description}</p>}
                </div>
              ))}
            </div>
          </>
        )}
        {past.length > 0 && (
          <div className="mt-14">
            <h2 className="text-xl font-semibold text-ink">Past Events</h2>
            <ul className="mt-5 space-y-2.5">
              {past.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-3.5">
                  <span className="font-medium text-slate-700">{e.title}</span>
                  <span className="shrink-0 text-xs text-slate-400">{fmtDate(e.startDate)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

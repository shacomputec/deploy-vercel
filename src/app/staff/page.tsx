import { BadgeCheck, Building2, Mail, Phone, UserRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSchool } from "@/lib/school";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Meet Our Staff" };

export const dynamic = "force-dynamic";

export default async function StaffDirectoryPage() {
  const school = await getSchool();
  const staff = await prisma.staff.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ department: "asc" }, { fullName: "asc" }],
    select: { id: true, fullName: true, designation: true, department: true, photo: true, email: true, phone: true },
  });

  const grouped = staff.reduce<Record<string, typeof staff>>((acc, s) => {
    const key = s.department || "General";
    (acc[key] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="container-x py-14">
      <div className="mx-auto max-w-2xl text-center">
        <p className="section-kicker text-primary">Our Team</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">Meet Our Staff</h1>
        <p className="mt-3 text-slate-500">
          The dedicated teachers and officers of {school?.name ?? "our school"} — committed to every learner.
        </p>
      </div>

      {staff.length === 0 ? (
        <div className="empty-state mx-auto mt-10 max-w-lg">
          <div className="empty-state-icon"><UserRound className="h-5 w-5" /></div>
          <p className="mt-3 text-sm font-medium text-slate-600">Staff directory coming soon</p>
          <p className="mt-1 text-xs text-slate-400">Staff profiles appear here once the school adds them.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([dept, members]) => (
          <section key={dept} className="mt-12">
            <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
              <Building2 className="h-5 w-5 text-primary" /> {dept}
              <span className="text-sm font-medium text-slate-400">({members.length})</span>
            </h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {members.map((s) => (
                <div key={s.id} className="card card-hover group overflow-hidden p-5 text-center">
                  <div className="mx-auto h-24 w-24 overflow-hidden rounded-full bg-slate-100 ring-2 ring-slate-100 transition group-hover:ring-primary/40">
                    {s.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.photo} alt={s.fullName} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-soft to-slate-100 text-primary">
                        <UserRound className="h-10 w-10" />
                      </div>
                    )}
                  </div>
                  <h3 className="mt-4 font-bold text-ink">{s.fullName}</h3>
                  <p className="mt-0.5 text-sm font-medium text-primary">{s.designation ?? "Staff"}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-400">
                    {s.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {s.phone}</span>}
                    {s.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {s.email}</span>}
                  </div>
                  <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                    <BadgeCheck className="h-3 w-3 text-emerald-500" /> Verified staff
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

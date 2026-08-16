import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getRolePerms, hasPerm } from "@/lib/permissions";
import { getSchool } from "@/lib/school";
import { AutoPrint } from "@/components/print/auto-print";

export const metadata = { title: "Class Photo Wall — Print" };

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "—";
}

const PER_PAGE = 12; // 3 columns × 4 rows on one A4 page

/**
 * Printable class photo wall — every student's photo (or initials placeholder)
 * with name + admission number, 12 per A4 page. Session-gated (login + students.read).
 */
export default async function PhotoWallPrintPage({ params }: { params: { classId: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const perms = await getRolePerms(user.roleId);
  if (!hasPerm(perms, "students", "read")) redirect("/admin");

  const klass = await prisma.class.findUnique({ where: { id: params.classId }, include: { level: true } });
  if (!klass) notFound();

  const [students, school] = await Promise.all([
    prisma.student.findMany({
      where: { classId: params.classId, status: "ACTIVE" },
      orderBy: { fullName: "asc" },
    }),
    getSchool(),
  ]);
  if (!students.length) notFound();

  const pages: typeof students[] = [];
  for (let i = 0; i < students.length; i += PER_PAGE) pages.push(students.slice(i, i + PER_PAGE));

  return (
    <div className="print-multi bg-white">
      <AutoPrint title={`${klass.name} — Photo Wall (${students.length})`} />
      {pages.map((group, pi) => (
        <div key={pi} className="photowall-page flex flex-col">
          <div className="mb-3 flex items-center justify-between border-b-2 border-slate-300 pb-2">
            <div className="flex items-center gap-2">
              <img src="/sms-logo.png" alt="" className="h-9 w-9 rounded-md object-contain" />
              <div>
                <p className="text-sm font-extrabold text-slate-900">{school?.name ?? "School"}</p>
                <p className="text-[10px] uppercase tracking-widest text-slate-500">Class Photo Wall · {klass.name}</p>
              </div>
            </div>
            <p className="text-[10px] font-semibold text-slate-400">Page {pi + 1} of {pages.length}</p>
          </div>
          <div className="grid flex-1 grid-cols-3 grid-rows-4 gap-3">
            {group.map((s) => (
              <div key={s.id} className="photowall-cell flex flex-col">
                <div className="flex flex-1 items-center justify-center overflow-hidden bg-slate-100">
                  {s.photo ? (
                    <img src={s.photo} alt="" className="h-full w-full" />
                  ) : (
                    <span className="text-2xl font-bold text-slate-400">{initials(s.fullName)}</span>
                  )}
                </div>
                <div className="border-t border-slate-200 bg-white px-1.5 py-1 text-center">
                  <p className="truncate text-[10px] font-bold leading-tight text-slate-800">{s.fullName}</p>
                  <p className="truncate text-[8px] leading-tight text-slate-500">{s.admissionNo}</p>
                </div>
              </div>
            ))}
            {Array.from({ length: PER_PAGE - group.length }).map((_, k) => (
              <div key={`blank-${k}`} className="photowall-cell border-dashed" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

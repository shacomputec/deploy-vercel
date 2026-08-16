"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BookMarked, BookOpen, CalendarCheck, CalendarClock, ClipboardCheck, School, Sparkles, UserRound } from "lucide-react";
import { api } from "@/lib/client";
import { Badge } from "@/components/ui/badge";
import { TeacherFirstRunTour } from "@/components/portal/teacher-first-run-tour";

type Overview = {
  portal: "teacher";
  teacher: { fullName: string; staffId: string; mainSubject: string | null; highestProfQual: string | null };
  classes: { id: string; name: string; level: { name: string } }[];
  subjectClasses: { id: string; subject: { name: string }; class: { name: string } }[];
};

export default function TeacherPortalPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    api<Overview>("/api/portal/overview").then(setData).catch((e) => setError(e.message));
  }, []);

  // The dashboard Tours panel links here with ?tour=1 to auto-open the tour.
  useEffect(() => {
    if (searchParams.get("tour") === "1") {
      const t = setTimeout(() => {
        window.dispatchEvent(new CustomEvent("smis:replay-teacher-tour"));
        const url = new URL(window.location.href);
        url.searchParams.delete("tour");
        window.history.replaceState({}, "", url);
      }, 350);
      return () => clearTimeout(t);
    }
  }, [searchParams]);

  if (error) return <p className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700">{error}</p>;
  if (!data) return <div className="card p-8"><div className="skeleton h-4 w-full" /></div>;

  return (
    <div>
      <TeacherFirstRunTour />
      <div className="card mb-6 flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h1 className="text-xl font-bold text-ink">Welcome, {data.teacher.fullName}</h1>
          <p className="text-sm text-slate-500">{data.teacher.staffId} · {data.teacher.mainSubject ?? "Teacher"}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("smis:replay-teacher-tour"))}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary-soft/60 px-3 py-1.5 text-xs font-semibold text-primary transition hover:border-primary/40 hover:bg-primary-soft"
          >
            <Sparkles className="h-3.5 w-3.5" /> Replay tour
          </button>
          <Badge tone="blue">Teacher Portal</Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-6">
          <h2 className="flex items-center gap-2 font-semibold text-ink"><School className="h-5 w-5 text-primary" /> My Form Classes</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {data.classes.map((c) => <Badge key={c.id} tone="green">{c.name} · {c.level.name}</Badge>)}
            {data.classes.length === 0 && <p className="text-sm text-slate-400">No form classes assigned.</p>}
          </div>
        </div>
        <div className="card p-6">
          <h2 className="flex items-center gap-2 font-semibold text-ink"><BookOpen className="h-5 w-5 text-primary" /> Subjects I Teach</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {data.subjectClasses.map((s) => <Badge key={s.id} tone="blue">{s.subject.name} — {s.class.name}</Badge>)}
            {data.subjectClasses.length === 0 && <p className="text-sm text-slate-400">No subject assignments yet.</p>}
          </div>
        </div>
      </div>

      <h2 className="mb-4 mt-8 text-lg font-semibold text-ink">Quick Actions</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { href: "/admin/attendance", label: "Mark Attendance", desc: "Daily class attendance", icon: CalendarCheck },
          { href: "/admin/assessments", label: "Enter Scores", desc: "SBA & exam scores", icon: ClipboardCheck },
          { href: "/admin/teacher-tools", label: "Lesson Notes", desc: "Write, submit & get vetted", icon: BookMarked },
          { href: "/admin/reports", label: "Report Cards", desc: "View class reports", icon: BookOpen },
          { href: "/admin/exams", label: "Exam Timetable", desc: "Dates, times & venues", icon: CalendarClock },
          { href: "/portal/staff", label: "My Staff Profile", desc: "Update my info & photo", icon: UserRound },
        ].map((a) => (
          <Link key={a.href} href={a.href} className="card card-hover flex items-center gap-4 p-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary"><a.icon className="h-5 w-5" /></span>
            <div>
              <p className="font-semibold text-slate-800">{a.label}</p>
              <p className="text-xs text-slate-400">{a.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

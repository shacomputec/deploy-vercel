export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "emerald",
  hint,
  progress,
  progressClass,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "emerald" | "sky" | "amber" | "violet" | "rose";
  hint?: string;
  progress?: number; // 0–100; renders a slim bar under the value
  progressClass?: string; // override bar gradient (e.g. a two-tone split)
}) {
  const tones: Record<string, string> = {
    emerald: "from-emerald-500 to-emerald-700 shadow-emerald-500/30",
    sky: "from-sky-500 to-sky-700 shadow-sky-500/30",
    amber: "from-amber-500 to-orange-600 shadow-amber-500/30",
    violet: "from-violet-500 to-violet-700 shadow-violet-500/30",
    rose: "from-rose-500 to-rose-700 shadow-rose-500/30",
  };
  const bar =
    progress !== undefined
      ? progressClass ?? "bg-gradient-to-r from-emerald-500 to-emerald-600"
      : "";
  return (
    <div className="card group relative overflow-hidden p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift">
      <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br opacity-[0.08] transition group-hover:opacity-[0.14] ${tones[tone].split(" ")[0]}`} aria-hidden />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg ${tones[tone]}`}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      {progress !== undefined && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${bar} transition-all duration-700`} style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
        </div>
      )}
    </div>
  );
}

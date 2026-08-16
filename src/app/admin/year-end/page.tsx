"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Archive as ArchiveIcon, Boxes, CalendarPlus, Download, Eraser, History,
  Lock, Rocket, ShieldAlert, TrendingUp,
} from "lucide-react";
import { api } from "@/lib/client";
import { fmtDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/admin/page-header";
import { useToast } from "@/components/ui/toast";

type Meta = { classes: { id: string; name: string }[]; terms: { id: string; name: string; academicYear: { name: string } }[] };
type Section = { key: string; label: string; count: number };
type Archive = { id: string; title: string; scope: string; sections: string[]; counts: Record<string, number>; createdAt: string; clearedAt: string | null; createdBy: string | null };
type Overview = { sections: Section[]; archives: Archive[]; totals: { students: number; classes: number }; canManage: boolean };
type Year = { id: string; name: string; startDate: string; endDate: string; isCurrent: boolean; terms?: { id: string; name: string; startDate: string; endDate: string }[] };
type TermDef = { name: string; start: string; end: string };

/** Ghana-standard term dates for a "YYYY/YYYY+1" year name. */
function stdTerms(name: string): TermDef[] {
  const m = /^(\d{4})\/(\d{4})$/.exec(name.trim());
  if (!m) return [];
  const y = Number(m[1]);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return [
    { name: "First Term", start: iso(new Date(Date.UTC(y, 8, 1))), end: iso(new Date(Date.UTC(y, 11, 13))) },
    { name: "Second Term", start: iso(new Date(Date.UTC(y + 1, 0, 6))), end: iso(new Date(Date.UTC(y + 1, 3, 11))) },
    { name: "Third Term", start: iso(new Date(Date.UTC(y + 1, 4, 5))), end: iso(new Date(Date.UTC(y + 1, 6, 25))) },
  ];
}

export default function YearEndPage() {
  const toast = useToast();
  const [meta, setMeta] = useState<Meta>({ classes: [], terms: [] });
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // promotion panel
  const [classId, setClassId] = useState("");
  const [termId, setTermId] = useState("");
  const [onlyPromoted, setOnlyPromoted] = useState(true);
  const [promoResult, setPromoResult] = useState<{ promoted: number; repeated: number } | null>(null);

  // archive panel
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [archiveTitle, setArchiveTitle] = useState("");

  // academic-year manager
  const [years, setYears] = useState<Year[]>([]);
  const [newName, setNewName] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [newCurrent, setNewCurrent] = useState(false);
  const [newTerms, setNewTerms] = useState<TermDef[]>([
    { name: "First Term", start: "", end: "" },
    { name: "Second Term", start: "", end: "" },
    { name: "Third Term", start: "", end: "" },
  ]);
  const [yearBusy, setYearBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [m, o, ys] = await Promise.all([api<Meta>("/api/meta"), api<Overview>("/api/year-end"), api<{ years: Year[] }>("/api/academic-years")]);
      setMeta(m);
      setOverview(o);
      setYears(ys.years);
    } catch (e) {
      toast.toast({ title: "Failed to load", description: (e as Error).message, variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  function onNewName(name: string) {
    setNewName(name);
    if (!newStart && !newEnd) {
      const m = /^(\d{4})\/(\d{4})$/.exec(name.trim());
      if (m) {
        const y = Number(m[1]);
        const iso = (d: Date) => d.toISOString().slice(0, 10);
        setNewStart(iso(new Date(Date.UTC(y, 8, 1))));
        setNewEnd(iso(new Date(Date.UTC(y + 1, 6, 25))));
        setNewTerms(stdTerms(name));
      }
    }
  }

  async function createYear(e: React.FormEvent) {
    e.preventDefault();
    setYearBusy(true);
    try {
      await api("/api/academic-years", {
        method: "POST",
        body: JSON.stringify({
          action: "create",
          name: newName,
          startDate: newStart,
          endDate: newEnd,
          isCurrent: newCurrent,
          terms: newTerms.filter((t) => t.start && t.end),
        }),
      });
      toast.toast({ title: "Academic year created", description: `${newName} is ready — its terms appear in every picker.`, variant: "success" });
      setNewName(""); setNewStart(""); setNewEnd(""); setNewCurrent(false);
      setNewTerms([
        { name: "First Term", start: "", end: "" },
        { name: "Second Term", start: "", end: "" },
        { name: "Third Term", start: "", end: "" },
      ]);
      load();
    } catch (err) {
      toast.toast({ title: "Could not create the year", description: (err as Error).message, variant: "error" });
    } finally {
      setYearBusy(false);
    }
  }

  async function setCurrentYear(yearId: string) {
    setYearBusy(true);
    try {
      await api("/api/academic-years", { method: "POST", body: JSON.stringify({ action: "set-current", yearId }) });
      toast.toast({ title: "Current year updated", variant: "success" });
      load();
    } catch (err) {
      toast.toast({ title: "Could not update", description: (err as Error).message, variant: "error" });
    } finally {
      setYearBusy(false);
    }
  }

  async function startNextYear() {
    if (!confirm("Start the next academic year now? It becomes the current year everywhere (report cards, fees, timetable pickers). The finished year stays in the database untouched.")) return;
    setYearBusy(true);
    try {
      const data = await api<{ currentName: string }>("/api/academic-years", { method: "POST", body: JSON.stringify({ action: "start-next" }) });
      toast.toast({ title: `${data.currentName} is now current`, description: "Everything now records into the new academic year.", variant: "success" });
      load();
    } catch (err) {
      toast.toast({ title: "Could not start the next year", description: (err as Error).message, variant: "error" });
    } finally {
      setYearBusy(false);
    }
  }

  async function deleteYear(year: Year) {
    if (!confirm(`Delete academic year ${year.name} permanently? Only possible while it holds no scores, reports or payments.`)) return;
    setYearBusy(true);
    try {
      await api("/api/academic-years", { method: "DELETE", body: JSON.stringify({ yearId: year.id }) });
      toast.toast({ title: "Academic year removed", variant: "success" });
      load();
    } catch (err) {
      toast.toast({ title: "Could not delete", description: (err as Error).message, variant: "error" });
    } finally {
      setYearBusy(false);
    }
  }

  useEffect(() => { load(); }, [load]);

  async function runPromotion() {
    if (!classId || !termId) return;
    setBusy(true);
    try {
      const data = await api<{ promoted: number; repeated: number }>("/api/promotions", {
        method: "POST",
        body: JSON.stringify({ classId, termId, onlyPromoted }),
      });
      setPromoResult(data);
      toast.toast({ title: "Promotion complete", description: `${data.promoted} promoted · ${data.repeated} repeating`, variant: "success" });
    } catch (e) {
      toast.toast({ title: "Promotion failed", description: (e as Error).message, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function archive() {
    const sections = Object.entries(picked).filter(([, v]) => v).map(([k]) => k);
    if (!sections.length) { toast.toast({ title: "Select sections", description: "Tick at least one section to archive.", variant: "info" }); return; }
    setBusy(true);
    try {
      const data = await api<{ archiveId: string; title: string; rows: number }>("/api/year-end?action=archive", {
        method: "POST",
        body: JSON.stringify({ title: archiveTitle, sections }),
      });
      toast.toast({ title: "Archived safely", description: `${data.rows} record(s) saved to “${data.title}”. Nothing was deleted.`, variant: "success" });
      setArchiveTitle("");
      setPicked({});
      load();
    } catch (e) {
      toast.toast({ title: "Archive failed", description: (e as Error).message, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function clearFromArchive(a: Archive) {
    if (a.clearedAt) { toast.toast({ title: "Already used", description: "This archive was already used to clear the system — create a fresh archive for the new data.", variant: "info" }); return; }
    if (!confirm(`Clear the sections saved in “${a.title}”? This permanently deletes every live record of those sections (the archive itself is kept).`)) return;
    setBusy(true);
    try {
      const data = await api<{ cleared: number }>("/api/year-end?action=clear", {
        method: "POST",
        body: JSON.stringify({ archiveId: a.id }),
      });
      toast.toast({ title: "System cleared", description: `${data.cleared} record(s) cleared. Archive kept for reference.`, variant: "success" });
      load();
    } catch (e) {
      toast.toast({ title: "Clear failed", description: (e as Error).message, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function downloadArchive(a: Archive) {
    try {
      const res = await fetch(`/api/year-end/archives/${a.id}/download`);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const el = document.createElement("a");
      el.href = url;
      el.download = `archive-${a.title.replace(/[^\w.-]+/g, "-").slice(0, 50)}.json`;
      el.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.toast({ title: "Download failed", description: (e as Error).message, variant: "error" });
    }
  }

  if (loading) return <div className="card p-8"><div className="skeleton h-4 w-full" /></div>;

  const totalPicked = (overview?.sections ?? []).filter((s) => picked[s.key]).reduce((a, s) => a + s.count, 0);

  return (
    <div>
      <PageHeader
        title="Year-End & New Academic Year"
        subtitle="Mass-promote a whole class, safely archive what the year produced, then clear the live system for a fresh year — every cleared record is kept in an archive."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Mass promotion */}
        <div className="card p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <TrendingUp className="h-5 w-5 text-primary" /> Mass promotion
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Promotes the entire class to the next class based on report-card status. Available to teachers, the headmistress and admins.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Class">
              <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
                <option value="">Select class…</option>
                {meta.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Term (report cards)">
              <Select value={termId} onChange={(e) => setTermId(e.target.value)}>
                <option value="">Select term…</option>
                {meta.terms.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.academicYear.name}</option>)}
              </Select>
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Field label="Move conditional students too?">
              <Select value={String(onlyPromoted)} onChange={(e) => setOnlyPromoted(e.target.value === "true")}>
                <option value="true">No — only full passes</option>
                <option value="false">Yes — include conditional</option>
              </Select>
            </Field>
            <Button onClick={runPromotion} loading={busy} disabled={!classId || !termId} className="mt-5">
              <Rocket className="h-4 w-4" /> Run Promotion
            </Button>
          </div>
          {promoResult && (
            <div className="mt-4 flex gap-6 rounded-xl bg-emerald-50 p-4">
              <div><p className="text-2xl font-bold text-emerald-700">{promoResult.promoted}</p><p className="text-xs text-emerald-600">Promoted</p></div>
              <div><p className="text-2xl font-bold text-amber-600">{promoResult.repeated}</p><p className="text-xs text-amber-600">Repeating</p></div>
            </div>
          )}
        </div>

        {/* Archive */}
        <div className="card p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <ArchiveIcon className="h-5 w-5 text-amber-600" /> Archive (safe snapshot)
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Take a safe copy of any sections before clearing. Archiving <strong>never deletes anything</strong> — archives are stored in the
            database, survive server moves and are included in database backups. Clear a section, or the whole system, only after archiving.
          </p>
          <div className="mt-4 space-y-2">
            {(overview?.sections ?? []).map((s) => (
              <label key={s.key} className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 px-4 py-2.5 transition hover:border-primary/40">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input type="checkbox" checked={!!picked[s.key]} onChange={(e) => setPicked((p) => ({ ...p, [s.key]: e.target.checked }))} className="h-4 w-4 rounded accent-primary" />
                  {s.label}
                </span>
                <Badge tone={s.count > 0 ? "amber" : "slate"}>{s.count} row{s.count === 1 ? "" : "s"}</Badge>
              </label>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <Field label="Archive title (optional)" className="min-w-56">
              <Input value={archiveTitle} onChange={(e) => setArchiveTitle(e.target.value)} placeholder={`Academic year 2025/2026 rollover`} />
            </Field>
            <Button onClick={archive} loading={busy} disabled={totalPicked === 0} variant="outline">
              <Boxes className="h-4 w-4" /> Archive {totalPicked > 0 ? `(${totalPicked} rows)` : ""}
            </Button>
          </div>
        </div>
      </div>

      {/* Clear + archives */}
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="card p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <Eraser className="h-5 w-5 text-rose-600" /> Clear for the new year
          </h3>
          {overview?.canManage ? (
            <>
              <p className="mt-1 text-sm text-slate-500">
                Pick an archive below and clear exactly the sections it saved — the rest of the system (students, teachers, classes, fees history outside the archive) stays untouched.
              </p>
              {overview.archives.length === 0 ? (
                <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-400">
                  No archives yet. Create one on the left first — clearing is only allowed from an existing archive.
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {overview.archives.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{a.title}</p>
                        <p className="text-xs text-slate-400">
                          {a.sections.length} section(s) · {Object.values(a.counts).reduce((x, y) => x + y, 0)} rows · {fmtDateTime(a.createdAt)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => downloadArchive(a)} className="btn-outline btn-sm"><Download className="h-4 w-4" /> Download</button>
                        {a.clearedAt ? (
                          <Badge tone="slate">✓ Used to clear</Badge>
                        ) : (
                          <button onClick={() => clearFromArchive(a)} className="btn-outline btn-sm !text-rose-600 hover:!bg-rose-50"><Eraser className="h-4 w-4" /> Clear these</button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
              <Lock className="h-4 w-4 shrink-0 text-slate-400" /> Only the developer, system admin or headteacher can clear the system.
            </p>
          )}
        </div>

        {/* Stored archives */}
        <div className="card p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <History className="h-5 w-5 text-sky-600" /> Stored archives <Badge tone="blue">{overview?.archives.length ?? 0}</Badge>
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Every archive is kept forever for later reference — download any of them anytime, even after clearing.
          </p>
          {overview?.archives.length ? (
            <ul className="mt-4 space-y-2">
              {overview.archives.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{a.title}</p>
                    <p className="text-xs text-slate-400">
                      {a.scope === "FULL" ? "Full system" : a.sections.join(", ")} · {Object.values(a.counts).reduce((x, y) => x + y, 0)} rows · {a.createdBy ?? "system"} · {fmtDateTime(a.createdAt)}
                      {a.clearedAt ? " · used to clear" : ""}
                    </p>
                  </div>
                  {overview?.canManage ? (
                    <button onClick={() => downloadArchive(a)} className="btn-outline btn-sm shrink-0"><Download className="h-4 w-4" /></button>
                  ) : (
                    <Lock className="h-4 w-4 shrink-0 text-slate-300" />
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4"><EmptyState title="No archives yet" hint="Archives are created from the panel on the left — nothing is ever cleared without a saved archive." /></div>
          )}
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            Preparing for a new academic year? Suggested order: run promotion → archive the academic sections → clear them → start the next year below.
          </p>
        </div>
      </div>

      {/* Academic-year manager */}
      <div className="card mt-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-ink">
              <CalendarPlus className="h-5 w-5 text-primary" /> Academic years <Badge tone="blue">{years.length}</Badge>
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              The system ships 2024/2025 → 2032/2033. Create your own years, make any of them current, or start the next one with one click — every picker (timetable, reports, fees, mocks…) updates instantly.
            </p>
          </div>
          <Button onClick={startNextYear} loading={yearBusy} variant="outline">
            <Rocket className="h-4 w-4" /> Start next academic year
          </Button>
        </div>

        <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {years.map((y) => (
            <li key={y.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="text-sm font-bold text-slate-800">{y.name}</span>
                {y.isCurrent && <Badge tone="green">CURRENT</Badge>}
                <span className="hidden text-xs text-slate-400 sm:inline">{y.terms?.length ?? 0} term(s) · {y.startDate?.slice(0, 10) ?? "—"} → {y.endDate?.slice(0, 10) ?? "—"}</span>
              </div>
              <div className="flex gap-2">
                {!y.isCurrent && (
                  <button onClick={() => setCurrentYear(y.id)} disabled={yearBusy} className="btn-outline btn-sm">Make current</button>
                )}
                <button onClick={() => deleteYear(y)} disabled={yearBusy} className="btn-outline btn-sm !text-rose-600 hover:!bg-rose-50"><Eraser className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ul>

        <form onSubmit={createYear} className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-slate-800"><CalendarPlus className="h-4 w-4 text-primary" /> Create a new academic year</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Field label="Year name" hint="e.g. 2033/2034">
              <Input value={newName} onChange={(e) => onNewName(e.target.value)} placeholder="2033/2034" required pattern="\d{4}/\d{4}" />
            </Field>
            <Field label="Starts">
              <Input type="date" value={newStart} onChange={(e) => setNewStart(e.target.value)} required />
            </Field>
            <Field label="Ends">
              <Input type="date" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} required />
            </Field>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {newTerms.map((t, i) => (
              <div key={t.name} className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{t.name}</p>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Start"><Input type="date" value={t.start} onChange={(e) => setNewTerms((ts) => ts.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))} /></Field>
                  <Field label="End"><Input type="date" value={t.end} onChange={(e) => setNewTerms((ts) => ts.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))} /></Field>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={newCurrent} onChange={(e) => setNewCurrent(e.target.checked)} className="h-4 w-4 rounded accent-primary" />
              Make this the current year now
            </label>
            <Button type="submit" loading={yearBusy}><CalendarPlus className="h-4 w-4" /> Create year + terms</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

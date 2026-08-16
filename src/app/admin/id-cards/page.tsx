"use client";

import { useEffect, useState } from "react";
import { FileDown, IdCard, Images, Palette, Printer, Save, Users } from "lucide-react";
import { api } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/admin/page-header";
import { useToast } from "@/components/ui/toast";
import { DEFAULT_DESIGN, TEMPLATES, type IdCardDesign, type IdCardTemplate } from "@/lib/id-card-builder";

type Meta = {
  classes: { id: string; name: string; level: { name: string } }[];
};

type ToggleKey =
  | "front.photo" | "front.name" | "front.classLine" | "front.admissionNo" | "front.year" | "front.gender"
  | "back.idNo" | "back.dob" | "back.hometown" | "back.region" | "back.phone" | "back.nationality" | "back.qr" | "back.devFooter";

const FRONT_FIELDS: { key: ToggleKey; label: string }[] = [
  { key: "front.photo", label: "Photo" },
  { key: "front.name", label: "Full name" },
  { key: "front.classLine", label: "Class" },
  { key: "front.admissionNo", label: "Admission number" },
  { key: "front.year", label: "Academic year" },
  { key: "front.gender", label: "Gender" },
];
const BACK_FIELDS: { key: ToggleKey; label: string }[] = [
  { key: "back.idNo", label: "NHIS / Ghana Card number" },
  { key: "back.dob", label: "Date of birth" },
  { key: "back.hometown", label: "Home town" },
  { key: "back.region", label: "Region" },
  { key: "back.phone", label: "Phone" },
  { key: "back.nationality", label: "Nationality" },
  { key: "back.qr", label: "QR code (result checker)" },
  { key: "back.devFooter", label: "Developer footer" },
];

export default function IdCardsPage() {
  const toast = useToast();
  const [meta, setMeta] = useState<Meta>({ classes: [] });
  const [classId, setClassId] = useState("");
  const [tab, setTab] = useState<"students" | "staff" | "design">("students");
  const [design, setDesign] = useState<IdCardDesign>({ ...DEFAULT_DESIGN, front: { ...DEFAULT_DESIGN.front }, back: { ...DEFAULT_DESIGN.back } });
  const [saving, setSaving] = useState(false);
  const [loadedDesign, setLoadedDesign] = useState(false);

  useEffect(() => { api<Meta>("/api/meta").then(setMeta).catch(() => {}); }, []);

  // Load the saved design once.
  useEffect(() => {
    api<{ value: string }>(`/api/settings/id-card-builder`).then((res) => {
      if (res?.value) {
        try {
          const saved = JSON.parse(res.value) as Partial<IdCardDesign>;
          setDesign({
            ...DEFAULT_DESIGN,
            ...saved,
            front: { ...DEFAULT_DESIGN.front, ...(saved.front ?? {}) },
            back: { ...DEFAULT_DESIGN.back, ...(saved.back ?? {}) },
          });
        } catch { /* fall back to defaults */ }
      }
    }).catch(() => {}).finally(() => setLoadedDesign(true));
  }, []);

  function applyTemplate(key: IdCardTemplate) {
    const t = TEMPLATES.find((x) => x.key === key);
    if (!t) return;
    setDesign((d) => ({ ...d, template: key, headerBg: t.headerBg, headerTextColor: t.headerTextColor, accent: t.accent }));
  }

  function toggle(key: ToggleKey) {
    setDesign((d) => {
      const [group, field] = key.split(".") as ["front" | "back", string];
      return { ...d, [group]: { ...d[group], [field]: !(d[group] as Record<string, boolean>)[field] } };
    });
  }

  async function saveDesign() {
    setSaving(true);
    try {
      await api("/api/settings", { method: "PUT", body: JSON.stringify([{ key: "idCardBuilder", value: JSON.stringify(design) }]) });
      toast.toast({ title: "Card design saved", description: "New student & staff cards will use this design.", variant: "success" });
    } catch (e) {
      toast.toast({ title: "Save failed", description: (e as Error).message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  const klass = meta.classes.find((c) => c.id === classId);

  return (
    <div>
      <PageHeader
        title="ID Cards & Photo Wall"
        subtitle="Design your identity cards, then print them for a whole class or for staff — one A4 page per person (front above the cut line, back below)."
      />

      <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
        {([
          ["students", "Students", Users],
          ["staff", "Staff", Users],
          ["design", "Card Builder", Palette],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === key ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50"}`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "students" && (
        <>
          <div className="card mb-6 flex flex-wrap items-end gap-4 p-5">
            <Field label="Class *" className="min-w-72">
              <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
                <option value="">Select class…</option>
                {meta.classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} · {c.level.name}</option>
                ))}
              </Select>
            </Field>
            <Button
              onClick={() => window.open(`/reports/print/id-cards/${classId}`, "_blank", "noopener")}
              disabled={!classId}
            >
              <Printer className="h-4 w-4" /> Print ID Cards
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(`/api/id-cards/pdf?kind=students&classId=${classId}`, "_blank", "noopener")}
              disabled={!classId}
              title="Download a ready-made PDF file — one A4 page per student (front + back), print it anytime"
            >
              <FileDown className="h-4 w-4" /> Download PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(`/reports/print/photo-wall/${classId}`, "_blank", "noopener")}
              disabled={!classId}
              title="One A4 page with 12 student photos (name + admission number under each)"
            >
              <Images className="h-4 w-4" /> Class Photo Wall
            </Button>
          </div>

          {!classId ? (
            <EmptyState
              title="Select a class"
              hint="Every active student in the class is included. Cards use the design from the Card Builder tab — school name, photo, admission number, NHIS / Ghana Card number and a QR code to the Result Checker."
            />
          ) : (
            <div className="card flex items-start gap-4 p-6">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <IdCard className="h-6 w-6" />
              </span>
              <div className="text-sm text-slate-600">
                <p className="font-semibold text-slate-800">{klass?.name} — identity cards & photo wall</p>
                <p className="mt-1">
                  <strong>ID cards:</strong> one A4 page per student — the card <strong>front</strong> above a dashed
                  cut line and the card <strong>back</strong> below it. Cut each card out, fold and laminate.
                </p>
                <p className="mt-2">
                  <strong>Photo wall:</strong> 12 students per A4 page in a tidy 3×4 grid, ideal for class boards
                  and term registers.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {tab === "staff" && (
        <div className="card flex items-start gap-4 p-6">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <IdCard className="h-6 w-6" />
          </span>
          <div className="text-sm text-slate-600">
            <p className="font-semibold text-slate-800">Staff identity cards</p>
            <p className="mt-1">
              Prints an identity card for every <strong>active staff member</strong> using the design from the Card
              Builder tab — staff ID number, rank, grade, main subject and photo on the front; contact details, home
              town and a QR code on the back. One A4 page per person.
            </p>
            <p className="mt-3 flex flex-wrap gap-2">
              <Button onClick={() => window.open("/reports/print/id-cards/staff", "_blank", "noopener")}>
                <Printer className="h-4 w-4" /> Print Staff ID Cards
              </Button>
              <Button variant="outline" onClick={() => window.open("/api/id-cards/pdf?kind=staff", "_blank", "noopener")}>
                <FileDown className="h-4 w-4" /> Download Staff PDF
              </Button>
            </p>
          </div>
        </div>
      )}

      {tab === "design" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            {/* Templates */}
            <div className="card p-5">
              <h3 className="font-semibold text-ink">1 · Choose a template</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => applyTemplate(t.key)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${design.template === t.key ? "border-primary bg-primary-soft text-primary" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
                  >
                    <span className="h-4 w-4 rounded-full ring-2 ring-white" style={{ backgroundColor: t.headerBg }} />
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Header title">
                  <Input value={design.headerText} onChange={(e) => setDesign({ ...design, headerText: e.target.value })} placeholder="Leave empty for the school name" />
                </Field>
                <Field label="Header subtitle">
                  <Input value={design.subtitleText} onChange={(e) => setDesign({ ...design, subtitleText: e.target.value })} placeholder="Leave empty for the class · level" />
                </Field>
                <Field label="Header colour">
                  <div className="flex items-center gap-2">
                    <input type="color" value={design.headerBg} onChange={(e) => setDesign({ ...design, headerBg: e.target.value })} className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200 bg-white p-1" />
                    <span className="font-mono text-xs text-slate-500">{design.headerBg}</span>
                  </div>
                </Field>
                <Field label="Accent colour (strips)">
                  <div className="flex items-center gap-2">
                    <input type="color" value={design.accent} onChange={(e) => setDesign({ ...design, accent: e.target.value })} className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200 bg-white p-1" />
                    <span className="font-mono text-xs text-slate-500">{design.accent}</span>
                  </div>
                </Field>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={design.showLogo} onChange={(e) => setDesign({ ...design, showLogo: e.target.checked })} className="h-4 w-4 rounded accent-emerald-600" />
                  Show developer logo on the front
                </label>
                <Field label="Back footer text" className="sm:col-span-2">
                  <Input value={design.footerText} onChange={(e) => setDesign({ ...design, footerText: e.target.value })} placeholder="Leave empty for the default developer footer" />
                </Field>
              </div>
            </div>

            {/* Field toggles */}
            <div className="card p-5">
              <h3 className="font-semibold text-ink">2 · Fields on the card</h3>
              <div className="mt-3 grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Front</p>
                  <div className="mt-2 space-y-1.5">
                    {FRONT_FIELDS.map((f) => (
                      <label key={f.key} className="flex items-center gap-2 text-sm text-slate-600">
                        <input type="checkbox" checked={design.front[f.key.split(".")[1] as keyof typeof design.front]} onChange={() => toggle(f.key)} className="h-4 w-4 rounded accent-emerald-600" />
                        {f.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Back</p>
                  <div className="mt-2 space-y-1.5">
                    {BACK_FIELDS.map((f) => (
                      <label key={f.key} className="flex items-center gap-2 text-sm text-slate-600">
                        <input type="checkbox" checked={design.back[f.key.split(".")[1] as keyof typeof design.back]} onChange={() => toggle(f.key)} className="h-4 w-4 rounded accent-emerald-600" />
                        {f.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={saveDesign} loading={saving} disabled={!loadedDesign}>
                <Save className="h-4 w-4" /> Save card design
              </Button>
            </div>
          </div>

          {/* Live preview */}
          <div className="lg:sticky lg:top-24">
            <div className="card p-5">
              <h3 className="font-semibold text-ink">Live preview</h3>
              <p className="mt-1 text-xs text-slate-400">85.6 × 54 mm — shown at 1.3×</p>
              <div className="mt-4 flex flex-col items-center gap-3">
                {/* Front */}
                <div className="w-[290px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md" style={{ aspectRatio: "85.6 / 54" }}>
                  <div className="flex h-[64px] items-center justify-between gap-2 px-3" style={{ backgroundColor: design.headerBg, color: design.headerTextColor }}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold leading-tight">{design.headerText || "Your School Name"}</p>
                      <p className="truncate text-[10px] opacity-80">{design.subtitleText || "Class · Level"}</p>
                    </div>
                    {design.showLogo && <img src="/sms-logo.png" alt="" className="h-7 w-7 shrink-0 rounded bg-white object-contain p-0.5" />}
                  </div>
                  <div className="flex flex-1 items-center gap-2 px-3 py-1.5">
                    <div className="flex h-[70px] w-[52px] shrink-0 items-center justify-center rounded border border-slate-300 bg-slate-100 text-sm font-bold text-slate-400">AB</div>
                    <div className="min-w-0 space-y-[2px]">
                      <p className="truncate text-[11px] font-extrabold uppercase text-slate-900">Abena Boakye</p>
                      {design.front.classLine && <p className="text-[9px] text-slate-500">Class: Basic 4</p>}
                      {design.front.admissionNo && <p className="text-[9px] text-slate-500">Admission No: 2024/001</p>}
                      {design.front.year && <p className="text-[9px] text-slate-500">Year: 2024/2025</p>}
                      {design.front.gender && <p className="text-[9px] text-slate-500">Gender: Female</p>}
                    </div>
                  </div>
                  <div className="px-3 py-[3px] text-center text-[8px] font-bold uppercase tracking-widest" style={{ backgroundColor: design.accent, color: "#fff" }}>
                    Student Identity Card
                  </div>
                </div>

                {/* Back */}
                <div className="w-[290px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md" style={{ aspectRatio: "85.6 / 54" }}>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-[2px] px-3 py-1.5 text-[9px] text-slate-500">
                    {design.back.idNo && <p>ID No: GH-2401-0000</p>}
                    {design.back.dob && <p>DOB: 12 Mar 2013</p>}
                    {design.back.hometown && <p>Home Town: Kumasi</p>}
                    {design.back.region && <p>Region: Ashanti</p>}
                    {design.back.phone && <p>Phone: 0244 000 000</p>}
                    {design.back.nationality && <p>Nationality: Ghanaian</p>}
                    {!design.back.idNo && !design.back.dob && !design.back.hometown && !design.back.region && !design.back.phone && !design.back.nationality && (
                      <p className="col-span-2 text-slate-300">No back fields selected</p>
                    )}
                  </div>
                  <div className="flex flex-1 items-end justify-between gap-2 px-3 pb-1">
                    {design.back.qr ? (
                      <p className="text-[7px] leading-tight text-slate-400">Scan to check results on the Result Checker portal.</p>
                    ) : (
                      <span />
                    )}
                    {design.back.qr && <div className="flex h-9 w-9 items-center justify-center bg-slate-900 text-[6px] font-bold text-white">QR</div>}
                  </div>
                  <div className="px-3 py-[3px] text-center text-[7px] font-semibold" style={{ backgroundColor: design.accent, color: "#fff" }}>
                    {design.footerText || "Powered by shacomputec · +233 530 941 750"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

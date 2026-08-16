"use client";

import { useState } from "react";
import { CheckCircle2, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";

type Level = { id: string; name: string };

type ClassOption = { id: string; name: string; levelId: string; levelName: string };

type Files = {
  birthCertificate: File | null;
  passportPhoto: File | null;
  weighingCard: File | null;
  previousReport: File | null;
};

const emptyFiles: Files = { birthCertificate: null, passportPhoto: null, weighingCard: null, previousReport: null };

const FILE_LABELS: { key: keyof Files; label: string; required: boolean; hint: string }[] = [
  { key: "birthCertificate", label: "Birth Certificate", required: true, hint: "PDF or image (required)" },
  { key: "passportPhoto", label: "Passport Picture", required: true, hint: "Recent photo of the child (required)" },
  { key: "weighingCard", label: "Weighing Card", required: false, hint: "PDF or image (recommended for KG)" },
  { key: "previousReport", label: "Previous Report", required: false, hint: "Previous school's report (Basic 1 and above)" },
];

export function AdmissionForm({ levels, classes }: { levels: Level[]; classes: ClassOption[] }) {
  const [form, setForm] = useState({
    fullName: "", dateOfBirth: "", gender: "", levelId: "", classId: "", nhisNumber: "", weighingCardNumber: "",
    previousSchool: "", previousSchoolClass: "", parentName: "", parentPhone: "", parentEmail: "",
    parentOccupation: "", address: "", digitalAddress: "", message: "",
  });
  const [files, setFiles] = useState<Files>(emptyFiles);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [ref, setRef] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const setFile = (k: keyof Files, f: File | null) => setFiles((prev) => ({ ...prev, [k]: f }));

  function validateFiles(): boolean {
    const next: Record<string, string> = {};
    if (!files.birthCertificate) next.birthCertificate = "Birth certificate is required";
    if (!files.passportPhoto) next.passportPhoto = "Passport picture is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setApiError(null);
    if (!validateFiles()) return;
    setBusy(true);
    try {
      const fd = new FormData();
      for (const [k, v] of Object.entries(form)) {
        if (v !== "") fd.append(k, v);
      }
      for (const { key } of FILE_LABELS) {
        const f = files[key];
        if (f) fd.append(key, f);
      }
      const res = await fetch("/api/admissions", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.ok) {
        setApiError(json.issues?.[0] ?? json.error ?? "Please check your details and try again.");
        return;
      }
      setRef(json.data.referenceNo);
    } catch {
      setApiError("Network error. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (ref) {
    return (
      <div className="card flex flex-col items-center p-10 text-center">
        <CheckCircle2 className="h-14 w-14 text-emerald-500" />
        <h3 className="mt-4 text-xl font-semibold text-ink">Application Submitted!</h3>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          Your application reference number is:
        </p>
        <p className="mt-3 rounded-xl bg-primary-soft px-6 py-3 text-2xl font-bold tracking-wider text-primary">
          {ref}
        </p>
        <p className="mt-4 max-w-md text-sm text-slate-500">
          Please keep this number safe. Our admissions office will contact {form.parentName} at {form.parentPhone} within 48 hours to schedule a screening.
        </p>
        <Button variant="outline" className="mt-6" onClick={() => { setRef(null); setForm({ fullName: "", dateOfBirth: "", gender: "", levelId: "", classId: "", nhisNumber: "", weighingCardNumber: "", previousSchool: "", previousSchoolClass: "", parentName: "", parentPhone: "", parentEmail: "", parentOccupation: "", address: "", digitalAddress: "", message: "" }); setFiles(emptyFiles); }}>
          Submit another application
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-5 p-6 sm:p-8">
      <div>
        <h3 className="text-lg font-semibold text-ink">Child&apos;s Details</h3>
        <p className="text-sm text-slate-500">The application takes about 5 minutes.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Child's full name *" error={errors.fullName}>
          <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="e.g. Ama Serwaa" />
        </Field>
        <Field label="Date of birth">
          <Input type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} />
        </Field>
        <Field label="Gender">
          <Select value={form.gender} onChange={(e) => set("gender", e.target.value)}>
            <option value="">Select…</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </Select>
        </Field>
        {classes.length > 0 ? (
          <Field label="Class applying for *" hint="Select the exact class — e.g. Basic 4, SHS 1">
            <Select
              value={form.classId}
              onChange={(e) => {
                const c = classes.find((x) => x.id === e.target.value);
                set("classId", e.target.value);
                set("levelId", c ? c.levelId : "");
              }}
            >
              <option value="">Select class…</option>
              {levels
                .map((l) => ({ l, cs: classes.filter((c) => c.levelId === l.id) }))
                .filter((g) => g.cs.length > 0)
                .map((g) => (
                  <optgroup key={g.l.id} label={g.l.name}>
                    {g.cs.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </optgroup>
                ))}
            </Select>
          </Field>
        ) : (
          <Field label="Class applying for *">
            <Select value={form.levelId} onChange={(e) => set("levelId", e.target.value)}>
              <option value="">Select level…</option>
              {levels.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="NHIS Number" hint="National Health Insurance Scheme number">
          <Input value={form.nhisNumber} onChange={(e) => set("nhisNumber", e.target.value)} placeholder="e.g. 5100xxxxxx" />
        </Field>
        <Field label="Weighing Card Number" hint="Child health / weighing card (if available)">
          <Input value={form.weighingCardNumber} onChange={(e) => set("weighingCardNumber", e.target.value)} />
        </Field>
      </div>

      <div className="border-t border-slate-100 pt-5">
        <h3 className="text-lg font-semibold text-ink">Parent / Guardian Details</h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name *">
          <Input value={form.parentName} onChange={(e) => set("parentName", e.target.value)} placeholder="Parent or guardian" />
        </Field>
        <Field label="Phone number *">
          <Input value={form.parentPhone} onChange={(e) => set("parentPhone", e.target.value)} placeholder="e.g. 0244 000 000" />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.parentEmail} onChange={(e) => set("parentEmail", e.target.value)} placeholder="you@example.com" />
        </Field>
        <Field label="Occupation">
          <Input value={form.parentOccupation} onChange={(e) => set("parentOccupation", e.target.value)} placeholder="e.g. Teacher, Trader, Nurse" />
        </Field>
      </div>

      <div className="border-t border-slate-100 pt-5">
        <h3 className="text-lg font-semibold text-ink">Address</h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Residential address">
          <Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="House / street / town" />
        </Field>
        <Field label="Digital address" hint="GhanaPost GPS code, e.g. AK-039-5028">
          <Input value={form.digitalAddress} onChange={(e) => set("digitalAddress", e.target.value)} placeholder="e.g. AK-039-5028" />
        </Field>
      </div>

      <div className="border-t border-slate-100 pt-5">
        <h3 className="text-lg font-semibold text-ink">Previous School</h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name of previous school (if any)">
          <Input value={form.previousSchool} onChange={(e) => set("previousSchool", e.target.value)} placeholder="Name of previous school" />
        </Field>
        <Field label="Last class attended">
          <Input value={form.previousSchoolClass} onChange={(e) => set("previousSchoolClass", e.target.value)} placeholder="e.g. Basic 6" />
        </Field>
      </div>

      <div className="border-t border-slate-100 pt-5">
        <h3 className="text-lg font-semibold text-ink">Upload Documents</h3>
        <p className="text-sm text-slate-500">Birth certificate and passport picture are required. All uploads are stored securely (encrypted).</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {FILE_LABELS.map(({ key, label, required, hint }) => (
          <label key={key} className={`cursor-pointer rounded-xl border-2 border-dashed p-4 transition ${files[key] ? "border-emerald-300 bg-emerald-50/50" : "border-slate-200 bg-slate-50/50 hover:border-slate-300"} ${errors[key] ? "border-rose-300 bg-rose-50/50" : ""}`}>
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <FileUp className="h-4 w-4 text-slate-400" /> {label} {required && <span className="text-rose-500">*</span>}
            </span>
            <span className="mt-1 block text-xs text-slate-400">{files[key] ? `✓ ${files[key].name}` : hint}</span>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={(e) => { setFile(key, e.target.files?.[0] ?? null); setErrors((er) => ({ ...er, [key]: "" })); }}
            />
            {errors[key] && <span className="mt-1 block text-xs font-medium text-rose-600">{errors[key]}</span>}
          </label>
        ))}
      </div>

      <Field label="Any message for the school?">
        <Textarea rows={3} value={form.message} onChange={(e) => set("message", e.target.value)} placeholder="Special needs, questions, etc." />
      </Field>

      {apiError && <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{apiError}</p>}

      <Button type="submit" loading={busy} className="w-full sm:w-auto" size="lg">
        {busy ? "Submitting…" : "Submit Application"}
      </Button>
      <p className="text-xs text-slate-400">
        By submitting you agree to be contacted by the school about this application. All data and uploads are handled securely.
      </p>
    </form>
  );
}

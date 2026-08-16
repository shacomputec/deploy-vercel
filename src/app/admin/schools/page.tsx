"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle, Building2, CheckCircle2, CreditCard, Download, FileUp, Loader2, Pencil, Plus, ShieldCheck,
  Smartphone, Star, Trash2, XCircle,
} from "lucide-react";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";
import { DEFAULT_FREE_SCHOOL_LIMIT } from "@/lib/school";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/admin/page-header";
import { useToast } from "@/components/ui/toast";

type School = {
  id: string; name: string; shortName: string | null; motto: string | null;
  phone: string | null; email: string | null; address: string | null;
  district: string | null; region: string | null;
  primaryColor: string | null; accentColor: string | null;
};

const EMPTY_FORM = {
  name: "", shortName: "", motto: "", phone: "", email: "", address: "",
  district: "", region: "", primaryColor: "#047857", accentColor: "#d97706",
};

type PurchaseConfig = { price: number; priceBasic: number; priceShs: number; currency: string; paystackEnabled: boolean; testMode: boolean; developerName?: string | null; developerPhone?: string | null };

type SchoolTier = "basic" | "shs";
type PurchaseResult = { reference: string; status: string; checkoutUrl?: string; message?: string };

function tierAmount(cfg: PurchaseConfig, t: SchoolTier): number {
  return t === "shs" ? cfg.priceShs : cfg.priceBasic;
}

export default function SchoolsPage() {
  const toast = useToast();
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [importVisible, setImportVisible] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importCsv, setImportCsv] = useState("");
  const [importResult, setImportResult] = useState<{ created: string[]; requiresPurchase: string[]; duplicates: string[]; invalid: string[]; freeSchoolLimit: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [freeSchoolLimit, setFreeSchoolLimit] = useState(DEFAULT_FREE_SCHOOL_LIMIT);
  const [activeId, setActiveId] = useState("main");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<School | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // payment popup state
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentDone, setPaymentDone] = useState<PurchaseResult | null>(null);
  const [method, setMethod] = useState<"PAYSTACK" | "MOMO">("PAYSTACK");
  const [tier, setTier] = useState<SchoolTier>("basic");
  const [deliveryEmail, setDeliveryEmail] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [config, setConfig] = useState<PurchaseConfig | null>(null);
  const [batch, setBatch] = useState<{ name: string; slug: string }[] | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<{ schools: School[]; activeSchoolId: string; freeSchoolLimit?: number }>("/api/schools");
      setSchools(data.schools);
      setActiveId(data.activeSchoolId);
      if (typeof data.freeSchoolLimit === "number") setFreeSchoolLimit(data.freeSchoolLimit);
    } catch (e) {
      toast.toast({ title: "Failed to load", description: (e as Error).message, variant: "error" });
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  // Prefill the receipt contact from the signed-in account.
  useEffect(() => {
    api<{ email: string }>("/api/auth/me").then((me) => {
      if (me?.email && !deliveryEmail) setDeliveryEmail(me.email);
    }).catch(() => { /* optional */ });
  }, [deliveryEmail]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const freeLeft = Math.max(0, freeSchoolLimit - schools.length);
  const needsPurchase = schools.length >= freeSchoolLimit;
  const unitPrice = config ? tierAmount(config, tier) : 0;

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModal(true);
  }

  function openEdit(s: School) {
    setEditing(s);
    setForm({
      name: s.name, shortName: s.shortName ?? "", motto: s.motto ?? "",
      phone: s.phone ?? "", email: s.email ?? "", address: s.address ?? "",
      district: s.district ?? "", region: s.region ?? "",
      primaryColor: s.primaryColor ?? "#047857", accentColor: s.accentColor ?? "#d97706",
    });
    setModal(true);
  }

  /** Edits are free (the school was already paid for); NEW schools must be
   *  purchased first — the payment popup appears right here. */
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      setSaving(true);
      try {
        const payload = { ...form, shortName: form.shortName || null, motto: form.motto || null, phone: form.phone || null, email: form.email || null, address: form.address || null, district: form.district || null, region: form.region || null };
        await api(`/api/schools/${editing.id}`, { method: "PUT", body: JSON.stringify(payload) });
        toast.toast({ title: "School updated", variant: "success" });
        setModal(false);
        load();
      } catch (err) {
        toast.toast({ title: "Save failed", description: (err as Error).message, variant: "error" });
      } finally {
        setSaving(false);
      }
      return;
    }
    // NEW school → the first 3 are included (created right away); the 4th and
    // beyond must be purchased — the payment popup appears here.
    if (!needsPurchase) {
      setSaving(true);
      try {
        const payload = { ...form, shortName: form.shortName || null, motto: form.motto || null, phone: form.phone || null, email: form.email || null, address: form.address || null, district: form.district || null, region: form.region || null };
        await api("/api/schools", { method: "POST", body: JSON.stringify(payload) });
        toast.toast({ title: "School created", description: `${form.name || "The new school"} is ready — switch to it anytime.` , variant: "success" });
        setModal(false);
        load();
      } catch (err) {
        toast.toast({ title: "Create failed", description: (err as Error).message, variant: "error" });
      } finally {
        setSaving(false);
      }
      return;
    }
    setModal(false);
    setPaymentError(null);
    setPaymentDone(null);
    setPaying(false);
    setBatch(null);
    setTier("basic");
    try {
      const cfg = await api<PurchaseConfig>("/api/schools/purchase");
      setConfig(cfg);
    } catch {
      setConfig(null);
    }
    setPaymentVisible(true);
  }

  /** Pay for several “requires purchase” schools in ONE checkout. */
  async function startBatchPay(names: string[]) {
    setImportVisible(false);
    setPaymentError(null);
    setPaymentDone(null);
    setPaying(false);
    setBatch(names.map((n) => ({ name: n, slug: n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24) })));
    setTier("basic");
    try {
      const cfg = await api<PurchaseConfig>("/api/schools/purchase");
      setConfig(cfg);
    } catch {
      setConfig(null);
    }
    setPaymentVisible(true);
  }

  const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

  function pollStatus(reference: string) {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const data = await api<{ status: string }>(`/api/payments/status?reference=${encodeURIComponent(reference)}`);
        if (data.status === "SUCCESS") {
          stopPolling();
          setPaying(false);
          toast.toast(
            batch && batch.length > 1
              ? { title: `${batch.length} schools purchased & created`, description: "They're all ready — switch to any of them anytime.", variant: "success" }
              : { title: "School purchased & created", description: "The new school is ready — switch to it anytime.", variant: "success" }
          );
          setPaymentVisible(false);
          setPaymentDone(null);
          setConfig(null);
          setBatch(null);
          load();
        } else if (data.status === "FAILED" || data.status === "EXPIRED") {
          stopPolling();
          setPaying(false);
          setPaymentError("Payment did not complete. You can try again — no school has been created.");
        }
      } catch {
        /* keep polling — the gateway may still be confirming */
      }
    }, 4000);
  }

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setPaymentError(null);
    setPaying(true);
    try {
      const body = batch
        ? { schools: batch.map((b) => ({ name: b.name })), tier, method, deliveryEmail, deliveryPhone }
        : { ...form, tier, method, deliveryEmail, deliveryPhone };
      const res = await api<PurchaseResult>("/api/schools/purchase", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setPaymentDone(res);
      if (res.checkoutUrl) window.open(res.checkoutUrl, "_blank", "noopener,noreferrer");
      pollStatus(res.reference);
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "Something went wrong — please try again.");
      setPaying(false);
    }
  }

  async function runImport(e: React.FormEvent) {
    e.preventDefault();
    if (!importCsv.trim()) { setImportError("Paste your CSV or choose a file first."); return; }
    setImportBusy(true);
    setImportError(null);
    try {
      const isXlsx = importCsv.startsWith("XLSX:");
      const res = await api<{ created: string[]; requiresPurchase: string[]; duplicates: string[]; invalid: string[]; freeSchoolLimit: number }>("/api/schools/import", {
        method: "POST",
        body: JSON.stringify(isXlsx ? { xlsxBase64: importCsv.slice(5) } : { csv: importCsv }),
      });
      setImportResult(res);
      if (res.created.length) {
        toast.toast({ title: "Schools imported", description: `${res.created.length} created — ${res.requiresPurchase.length} need purchase.`, variant: "success" });
        load();
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImportBusy(false);
    }
  }

  async function activate(s: School) {
    if (!confirm(`Switch the whole site (name, colours, content) to “${s.name}”?`)) return;
    try {
      await api("/api/schools", { method: "PUT", body: JSON.stringify({ activeSchoolId: s.id }) });
      toast.toast({ title: "Active school switched", description: s.name, variant: "success" });
      load();
    } catch (e) {
      toast.toast({ title: "Switch failed", description: (e as Error).message, variant: "error" });
    }
  }

  async function remove(s: School) {
    if (!confirm(`Delete school “${s.name}”? Its content is removed too.`)) return;
    try {
      await api(`/api/schools/${s.id}`, { method: "DELETE" });
      toast.toast({ title: "School deleted", variant: "success" });
      load();
    } catch (e) {
      toast.toast({ title: "Delete failed", description: (e as Error).message, variant: "error" });
    }
  }

  return (
    <div>
      <PageHeader
        title="Schools"
        subtitle="Manage multiple school profiles — the active school themes the whole site"
        action={
          <div className="flex items-center gap-3">
            {freeLeft > 0 && (
              <Badge tone="green">{freeLeft} of {freeSchoolLimit} free schools left</Badge>
            )}
            <Button variant="outline" onClick={() => {
              setImportVisible(true); setImportCsv(""); setImportResult(null); setImportError(null);
              api<PurchaseConfig>("/api/schools/purchase").then(setConfig).catch(() => {});
            }}>
              <FileUp className="h-4 w-4" /> Import CSV / Excel
            </Button>
            <Button onClick={openCreate}><Plus className="h-4 w-4" /> New School</Button>
          </div>
        }
      />

      {schools.length === 0 ? <EmptyState title="No schools yet" action={<Button onClick={openCreate}>Create one</Button>} /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {schools.map((s) => {
            const active = s.id === activeId;
            return (
              <div key={s.id} className={cn("card relative overflow-hidden p-5 transition", active && "ring-2 ring-primary")}>
                {active && (
                  <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-bold text-white">
                    <Star className="h-3 w-3 fill-white" /> ACTIVE
                  </span>
                )}
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-sm" style={{ backgroundColor: s.primaryColor ?? "#047857" }}>
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-800">{s.name}</p>
                    <p className="truncate text-xs text-slate-400">{s.shortName || s.id} · {s.region || "—"}</p>
                  </div>
                </div>
                {s.motto && <p className="mb-2 text-sm italic text-slate-500">“{s.motto}”</p>}
                <p className="text-xs text-slate-400">{s.address || "No address"}{s.district ? ` · ${s.district}` : ""}</p>
                <div className="mt-4 flex gap-2">
                  {!active && (
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => activate(s)}>
                      <CheckCircle2 className="h-4 w-4" /> Set active
                    </Button>
                  )}
                  <button onClick={() => openEdit(s)} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" title="Edit"><Pencil className="h-4 w-4" /></button>
                  {s.id !== "main" && (
                    <button onClick={() => remove(s)} className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" title="Delete"><Trash2 className="h-4 w-4" /></button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card mt-6 p-5 text-sm text-slate-500">
        <p className="mb-1 font-semibold text-slate-700">How multi-school works</p>
        <p>Each school profile has its own name, motto, colours, contact details and website content (news, events, announcements, gallery). The <b>active</b> school is what the public website and portals display. Switch anytime — no code changes needed.</p>
        <p className="mt-2">Your <b>first {freeSchoolLimit} schools are included</b> in your purchase. Every school beyond that ({freeSchoolLimit + 1}th, {freeSchoolLimit + 2}th, …) is <b>purchased separately</b> — the payment popup appears when you click <i>New School</i>, and the new profile is created only after the payment settles. {freeLeft > 0 ? `You still have ${freeLeft} free ${freeLeft === 1 ? "slot" : "slots"} left.` : "You've used all your free slots — new schools are now paid."}</p>
        <div className="mt-3 flex items-center gap-2">
          <Badge tone="blue">main</Badge>
          <span className="text-xs">The built-in profile — cannot be deleted.</span>
        </div>
      </div>

      {/* ── School details form (edit = free, create = opens the payment popup) ── */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Edit School" : "New School"} wide>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <Field label="School name *"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Kumasi International School" /></Field>
          <Field label="Short name"><Input value={form.shortName} onChange={(e) => setForm({ ...form, shortName: e.target.value })} placeholder="KIS" /></Field>
          <div className="sm:col-span-2"><Field label="Motto"><Input value={form.motto} onChange={(e) => setForm({ ...form, motto: e.target.value })} placeholder="Knowledge • Integrity • Excellence" /></Field></div>
          <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Address"><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <Field label="Region"><Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder="Ashanti Region, Ghana" /></Field>
          <Field label="District"><Input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Primary colour"><Input type="color" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} /></Field>
            <Field label="Accent colour"><Input type="color" value={form.accentColor} onChange={(e) => setForm({ ...form, accentColor: e.target.value })} /></Field>
          </div>
          {!editing && (
            needsPurchase ? (
              <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800 sm:col-span-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                You've used your {freeSchoolLimit} included schools. This one is purchased separately — after you save these details, a secure payment popup opens. The school is created the instant payment settles.
              </p>
            ) : (
              <p className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-800 sm:col-span-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                This school is included in your purchase ({freeLeft} of {freeSchoolLimit} free {freeLeft === 1 ? "slot" : "slots"} left) — it is created right away, no payment needed.
              </p>
            )
          )}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editing ? "Save Changes" : needsPurchase ? "Continue to payment" : "Create school"}</Button>
          </div>
        </form>
      </Modal>

      {/* ── Bulk import — create many schools from CSV (free slots first) ── */}
      <Modal open={importVisible} onClose={() => setImportVisible(false)} title="Import schools from CSV" wide>
        <form onSubmit={runImport} className="space-y-4">
          <p className="text-sm leading-relaxed text-slate-500">
            Download the template, fill one row per school, then paste the contents here or upload the file
            (<b>CSV or Excel .xlsx</b>).
            Schools are created using your free slots first ({freeLeft} of {freeSchoolLimit} left); any school beyond that is
            <b> not created</b> — it is reported for purchase instead.
          </p>
          <div className="flex flex-wrap gap-2">
            <a href="/api/schools/import" className="btn-outline btn-sm"><Download className="h-4 w-4" /> Download template (CSV)</a>
            <label className="btn-outline btn-sm cursor-pointer">
              <FileUp className="h-4 w-4" /> Choose file…
              <input
                type="file"
                accept=".csv,text/csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const isXlsx = /\.xlsx?$/i.test(f.name);
                  const reader = new FileReader();
                  reader.onload = () => {
                    if (isXlsx && reader.result instanceof ArrayBuffer) {
                      // base64-encode the Excel file for the server-side parser
                      const bytes = new Uint8Array(reader.result);
                      let bin = "";
                      for (const b of bytes) bin += String.fromCharCode(b);
                      setImportCsv("XLSX:" + btoa(bin));
                    } else {
                      setImportCsv(String(reader.result ?? ""));
                    }
                    setImportError(null);
                  };
                  reader.onerror = () => setImportError("Could not read the file.");
                  if (isXlsx) reader.readAsArrayBuffer(f); else reader.readAsText(f);
                }}
              />
            </label>
          </div>
          <textarea
            value={importCsv}
            onChange={(e) => setImportCsv(e.target.value)}
            rows={7}
            placeholder={'name,shortName,motto,phone,email,address,district,region\nKumasi International School,KIS,…,+233 32 200 0000,…,Adum,Ashanti,Ashanti'}
            className="w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs text-slate-700 focus:border-primary focus:outline-none"
          />
          {importError && (
            <p className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[13px] text-rose-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {importError}
            </p>
          )}
          {importResult && (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <p className="flex items-center gap-2 font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> {importResult.created.length} created</p>
              {importResult.created.length > 0 && <p className="pl-6 text-xs text-slate-500">{importResult.created.join(", ")}</p>}
              {importResult.requiresPurchase.length > 0 && (
                <p className="flex items-center gap-2 font-bold text-amber-700"><CreditCard className="h-4 w-4" /> {importResult.requiresPurchase.length} need purchase (beyond the {importResult.freeSchoolLimit} free slots)</p>
              )}
              {importResult.requiresPurchase.length > 0 && <p className="pl-6 text-xs text-slate-500">{importResult.requiresPurchase.join(", ")}</p>}
              {importResult.requiresPurchase.length > 0 && (
                <Button
                  type="button"
                  className="mt-1"
                  onClick={() => startBatchPay(importResult.requiresPurchase)}
                >
                  <CreditCard className="h-4 w-4" />
                  Pay for all {importResult.requiresPurchase.length} in one checkout{config ? ` (${config.currency === "GHS" ? "GH₵" : config.currency + " "}${(unitPrice * importResult.requiresPurchase.length).toLocaleString()})` : ""}
                </Button>
              )}
              {importResult.duplicates.length > 0 && <p className="flex items-center gap-2 font-bold text-slate-600"><XCircle className="h-4 w-4" /> {importResult.duplicates.length} skipped (already exist)</p>}
              {importResult.invalid.length > 0 && <p className="flex items-center gap-2 font-bold text-slate-600"><XCircle className="h-4 w-4" /> {importResult.invalid.length} skipped (missing name)</p>}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setImportVisible(false)}>Close</Button>
            <Button type="submit" loading={importBusy}><FileUp className="h-4 w-4" /> Import schools</Button>
          </div>
        </form>
      </Modal>

      {/* ── Payment popup — buy the additional school license ── */}
      <Modal open={paymentVisible} onClose={() => { if (!paying) { stopPolling(); setPaymentVisible(false); setPaymentDone(null); setPaymentError(null); } }} title="Purchase this school" wide>
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-slate-800">
                {batch ? `${batch.length} schools` : form.name || "New School"}
              </p>
              {batch ? (
                <p className="truncate text-xs text-slate-500">{batch.map((b) => b.name).join(", ")}</p>
              ) : (
                <p className="text-xs text-slate-500">Additional school license · one-time · everything included</p>
              )}
            </div>
            <p className="text-lg font-extrabold text-ink">
              {config ? `${config.currency === "GHS" ? "GH₵" : config.currency + " "}${unitPrice.toLocaleString()}` : "…"}
            </p>
          </div>

          {paymentDone ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-emerald-800">
                <CheckCircle2 className="h-4 w-4" /> Payment started
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-emerald-900">{paymentDone.message}</p>
              <p className="mt-2 text-xs font-semibold text-emerald-700">Reference: {paymentDone.reference}</p>
              {paymentDone.checkoutUrl && (
                <a href={paymentDone.checkoutUrl} target="_blank" rel="noopener noreferrer" className="btn-primary mt-4 w-full">
                  <CreditCard className="h-4 w-4" /> Continue to secure checkout
                </a>
              )}
              <p className="mt-3 flex items-center gap-2 text-xs text-emerald-700">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Waiting for payment to confirm — {batch ? `the ${batch.length} schools` : `“${form.name || "the new school"}”`} {batch && batch.length > 1 ? "are" : "is"} created automatically the moment it settles.
              </p>
            </div>
          ) : (
            <form onSubmit={pay} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">School type</label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTier("basic")}
                    className={cn("rounded-xl border px-3 py-2 text-left transition", tier === "basic" ? "border-primary bg-primary-soft" : "border-slate-200 bg-white hover:border-slate-300")}
                  >
                    <p className="text-sm font-bold text-slate-800">Basic school</p>
                    <p className="text-[11px] text-slate-500">Crèche · KG · Primary · JHS</p>
                    <p className={`mt-0.5 text-sm font-extrabold ${tier === "basic" ? "text-primary" : "text-slate-700"}`}>{config ? `${config.currency === "GHS" ? "GH₵" : config.currency + " "}${tierAmount(config, "basic").toLocaleString()}` : "…"}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTier("shs")}
                    className={cn("rounded-xl border px-3 py-2 text-left transition", tier === "shs" ? "border-primary bg-primary-soft" : "border-slate-200 bg-white hover:border-slate-300")}
                  >
                    <p className="text-sm font-bold text-slate-800">Basic + SHS</p>
                    <p className="text-[11px] text-slate-500">…and Senior High School</p>
                    <p className={`mt-0.5 text-sm font-extrabold ${tier === "shs" ? "text-primary" : "text-slate-700"}`}>{config ? `${config.currency === "GHS" ? "GH₵" : config.currency + " "}${tierAmount(config, "shs").toLocaleString()}` : "…"}</p>
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Pay with</label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMethod("PAYSTACK")}
                    className={cn("flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition", method === "PAYSTACK" ? "border-primary bg-primary-soft text-primary" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300")}
                  >
                    <CreditCard className="h-4 w-4" /> Card / MoMo
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod("MOMO")}
                    className={cn("flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition", method === "MOMO" ? "border-primary bg-primary-soft text-primary" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300")}
                  >
                    <Smartphone className="h-4 w-4" /> Direct MoMo
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Receipt email">
                  <Input type="email" value={deliveryEmail} onChange={(e) => setDeliveryEmail(e.target.value)} placeholder="office@school.edu.gh" />
                </Field>
                <Field label="Receipt phone (WhatsApp / SMS)">
                  <Input value={deliveryPhone} onChange={(e) => setDeliveryPhone(e.target.value)} placeholder="0244 000 000" />
                </Field>
              </div>

              {paymentError && (
                <p className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[13px] text-rose-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {paymentError}
                </p>
              )}

              <button type="submit" disabled={paying} className="btn-accent w-full disabled:cursor-not-allowed disabled:opacity-60">
                {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {paying ? "Starting secure payment…" : `Pay ${config ? `${config.currency === "GHS" ? "GH₵" : config.currency + " "}${unitPrice.toLocaleString()}` : ""} to add this school`}
              </button>
              <p className="text-center text-[11px] leading-relaxed text-slate-400">
                Secure payment via Paystack or Mobile Money. The new school profile is created on your system the instant the payment settles — nothing is created before you pay.
              </p>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
}

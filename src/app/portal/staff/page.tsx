"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarClock, Camera, Check, IdCard, Info, KeyRound, Save, UserRound } from "lucide-react";
import { api } from "@/lib/client";
import { fmtDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

type StaffMe = {
  id: string;
  staffId: string;
  fullName: string;
  designation: string | null;
  department: string | null;
  phone: string | null;
  email: string | null;
  photo: string | null;
};

type Leave = {
  id: string;
  type: string;
  from: string;
  to: string;
  days: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote: string | null;
  decidedAt: string | null;
  decidedBy: { fullName: string } | null;
};

const MAX_PHOTO = 4 * 1024 * 1024;

const TYPE_LABEL: Record<string, string> = {
  ANNUAL: "Annual leave", SICK: "Sick leave", MATERNITY: "Maternity", PATERNITY: "Paternity",
  STUDY: "Study leave", UNPAID: "Unpaid leave", OTHER: "Other",
};

export default function StaffPortalPage() {
  const toast = useToast();
  const [tab, setTab] = useState<"profile" | "leave">("profile");
  const [me, setMe] = useState<StaffMe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // leave state
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [leaveForm, setLeaveForm] = useState({ type: "ANNUAL", from: "", to: "", reason: "" });
  const [leaveBusy, setLeaveBusy] = useState(false);

  useEffect(() => {
    api<StaffMe>("/api/staff/me").then((d) => {
      setMe(d);
      setPhone(d.phone ?? "");
      setEmail(d.email ?? "");
      setPhoto(d.photo ?? null);
    }).catch((e) => setError(e.message));
  }, []);

  const loadLeaves = useCallback(async () => {
    try {
      setLeaves(await api<Leave[]>("/api/leaves"));
    } catch (e) {
      toast.toast({ title: "Could not load your leave", description: (e as Error).message, variant: "error" });
    }
  }, [toast]);

  useEffect(() => {
    if (tab === "leave") loadLeaves();
  }, [tab, loadLeaves]);

  const pickPhoto = useCallback((file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
      setError("Please choose a PNG, JPG or WebP image.");
      return;
    }
    if (file.size > MAX_PHOTO) {
      setError("Photo is too large — keep it under 4MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result));
    reader.readAsDataURL(file);
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    setError(null);
    try {
      await api<StaffMe>("/api/staff/me", { method: "PATCH", body: JSON.stringify({ phone, email, photo }) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const requestLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeaveBusy(true);
    try {
      await api("/api/leaves", { method: "POST", body: JSON.stringify(leaveForm) });
      toast.toast({ title: "Leave requested", description: "HR has been notified — you'll see the decision here.", variant: "success" });
      setLeaveForm({ type: "ANNUAL", from: "", to: "", reason: "" });
      loadLeaves();
    } catch (err) {
      toast.toast({ title: "Request failed", description: (err as Error).message, variant: "error" });
    } finally {
      setLeaveBusy(false);
    }
  };

  if (error && !me) return <p className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700">{error}</p>;
  if (!me) return <div className="card p-8"><div className="skeleton h-4 w-full" /></div>;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Staff Portal</h1>
          <p className="mt-0.5 text-sm text-slate-500">Your profile, photo and leave requests.</p>
        </div>
        <Badge tone="green"><UserRound className="h-3 w-3" /> Staff Portal</Badge>
      </div>

      <div className="mb-5 flex gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
        {([["profile", "My Profile"], ["leave", "My Leave"]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === key ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50"}`}
          >
            {key === "leave" && <CalendarClock className="h-4 w-4" />}
            {label}
          </button>
        ))}
      </div>

      {tab === "profile" ? (
        <>
          {error && <p className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}
          {saved && (
            <p className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              <Check className="h-4 w-4" /> Profile saved — your photo and details are live on the website now.
            </p>
          )}

          <form onSubmit={save} className="card p-6 sm:p-8">
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
              <div className="shrink-0 text-center">
                <div className="relative mx-auto h-32 w-32 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo} alt={me.fullName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-300">
                      <UserRound className="h-12 w-12" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-slate-900/70 py-1.5 text-[11px] font-semibold text-white backdrop-blur transition hover:bg-slate-900/85"
                  >
                    <Camera className="h-3.5 w-3.5" /> Change
                  </button>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => pickPhoto(e.target.files?.[0])}
                />
                <p className="mt-2 text-[11px] text-slate-400">Shown on the school's staff directory</p>
              </div>

              <div className="min-w-0 flex-1 space-y-1.5">
                <h2 className="text-xl font-bold text-ink">{me.fullName}</h2>
                <p className="flex items-center gap-1.5 text-sm text-slate-500">
                  <IdCard className="h-4 w-4 text-primary" /> {me.staffId}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {me.designation && <Badge tone="blue">{me.designation}</Badge>}
                  {me.department && <Badge tone="slate">{me.department}</Badge>}
                </div>
              </div>
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="p-phone">Phone</label>
                <input id="p-phone" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+233 …" />
              </div>
              <div>
                <label className="label" htmlFor="p-email">Email</label>
                <input id="p-email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edu.gh" />
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <Button type="submit" loading={busy}><Save className="h-4 w-4" /> {busy ? "Saving…" : "Save Profile"}</Button>
            </div>
          </form>

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200/70 bg-amber-50/70 p-5">
            <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-sm text-slate-600">
              <p className="font-semibold text-slate-800">Your portal login</p>
              <p className="mt-1">
                Username: <span className="rounded bg-white px-1.5 py-0.5 font-mono text-xs font-bold text-slate-800 ring-1 ring-amber-200">{me.staffId}</span>
                {" "}· Password: the one your administrator assigned (by default your Staff ID).
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                <Info className="h-3.5 w-3.5" /> Ask the administrator to reset it if you ever forget it. Sign in at the Staff ID tab on the login page.
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <form onSubmit={requestLeave} className="card p-6">
            <h2 className="mb-1 text-lg font-bold text-ink">Request Leave</h2>
            <p className="mb-5 text-sm text-slate-500">Submit a request — HR will approve or reject it here.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Leave type *">
                <Select value={leaveForm.type} onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}>
                  <option value="ANNUAL">Annual leave</option>
                  <option value="SICK">Sick leave</option>
                  <option value="MATERNITY">Maternity</option>
                  <option value="PATERNITY">Paternity</option>
                  <option value="STUDY">Study leave</option>
                  <option value="UNPAID">Unpaid leave</option>
                  <option value="OTHER">Other</option>
                </Select>
              </Field>
              <div />
              <Field label="From *"><Input required type="date" value={leaveForm.from} onChange={(e) => setLeaveForm({ ...leaveForm, from: e.target.value })} /></Field>
              <Field label="To *"><Input required type="date" value={leaveForm.to} onChange={(e) => setLeaveForm({ ...leaveForm, to: e.target.value })} /></Field>
            </div>
            <div className="mt-4">
              <Field label="Reason *"><Textarea required rows={3} value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} placeholder="Why is this leave needed?" /></Field>
            </div>
            <div className="mt-4 flex justify-end">
              <Button type="submit" loading={leaveBusy}><CalendarClock className="h-4 w-4" /> Submit Request</Button>
            </div>
          </form>

          <div className="card p-6">
            <h2 className="mb-4 text-lg font-bold text-ink">My Leave History</h2>
            {leaves.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
                No leave requests yet.
              </p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr><th>Type</th><th>Period</th><th>Days</th><th>Reason</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {leaves.map((l) => (
                      <tr key={l.id}>
                        <td className="font-medium text-slate-800">{TYPE_LABEL[l.type] ?? l.type}</td>
                        <td className="text-xs">{fmtDate(l.from)} → {fmtDate(l.to)}</td>
                        <td className="font-semibold">{l.days}</td>
                        <td className="max-w-[200px]">
                          <p className="truncate text-xs text-slate-500" title={l.reason}>{l.reason}</p>
                          {l.adminNote && <p className="text-[11px] italic text-slate-400">Note: {l.adminNote}</p>}
                        </td>
                        <td>
                          {l.status === "PENDING" ? <Badge tone="amber">Pending</Badge>
                            : l.status === "APPROVED" ? <Badge tone="green">Approved</Badge>
                            : <Badge tone="red">Rejected</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

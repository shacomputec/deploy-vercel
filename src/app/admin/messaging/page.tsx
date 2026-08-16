"use client";

import { useCallback, useEffect, useState } from "react";
import { History, Mail, MessageSquareText, Phone, Send, Users, BadgeCheck } from "lucide-react";
import { api } from "@/lib/client";
import { fmtDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader } from "@/components/admin/page-header";
import { useToast } from "@/components/ui/toast";

type Meta = { classes: { id: string; name: string }[] };
type Channel = "SMS" | "EMAIL" | "WHATSAPP";
type LogRow = { id: string; audience: string; classId: string | null; recipientCount: number; message: string; provider: string | null; createdAt: string };

const CHANNELS: { key: Channel; label: string; icon: typeof Phone }[] = [
  { key: "SMS", label: "Text (SMS)", icon: Phone },
  { key: "EMAIL", label: "Email", icon: Mail },
  { key: "WHATSAPP", label: "WhatsApp", icon: MessageSquareText },
];

const AUDIENCES = [
  { value: "ALL_STUDENTS", label: "All students" },
  { value: "PARENTS", label: "All parents" },
  { value: "CLASS", label: "Students in a class" },
  { value: "STAFF", label: "Staff & teachers" },
  { value: "LIST", label: "Others (specific contacts)" },
];

export default function MessagingPage() {
  const toast = useToast();
  const [meta, setMeta] = useState<Meta>({ classes: [] });
  const [audience, setAudience] = useState("ALL_STUDENTS");
  const [classId, setClassId] = useState("");
  const [contacts, setContacts] = useState("");
  const [message, setMessage] = useState("");
  const [channels, setChannels] = useState<Channel[]>(["SMS"]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: Record<Channel, number>; total: number; failed: number } | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);

  useEffect(() => { api<Meta>("/api/meta").then(setMeta).catch(() => {}); }, []);

  const loadLogs = useCallback(async () => {
    try {
      setLogs(await api<LogRow[]>("/api/messaging"));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  function toggleChannel(c: Channel) {
    setChannels((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  const parsedContacts = contacts.split(/[,\n]/).map((c) => c.trim()).filter(Boolean);
  const phones = parsedContacts.filter((c) => /^(\+233|0)\d{9}$/.test(c.replace(/[\s-]/g, "")));
  const emails = parsedContacts.filter((c) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c));

  async function send() {
    if (!message.trim() || !channels.length) return;
    setSending(true);
    setResult(null);
    try {
      const data = await api<{ sent: Record<Channel, number>; total: number; failed: number }>("/api/messaging", {
        method: "POST",
        body: JSON.stringify({
          audience,
          classId: audience === "CLASS" ? classId : undefined,
          phones: audience === "LIST" ? phones : undefined,
          emails: audience === "LIST" ? emails : undefined,
          message,
          channels,
        }),
      });
      setResult(data);
      const sentTotal = Object.values(data.sent).reduce((a, b) => a + b, 0);
      toast.toast({ title: "Messages sent", description: `${sentTotal} delivered across ${channels.join(" + ")}`, variant: "success" });
      setMessage("");
      loadLogs();
    } catch (e) {
      toast.toast({ title: "Send failed", description: (e as Error).message, variant: "error" });
    } finally {
      setSending(false);
    }
  }

  const countLabel =
    audience === "ALL_STUDENTS" ? "all active students" :
    audience === "PARENTS" ? "all parents" :
    audience === "CLASS" ? "students in the selected class" :
    audience === "STAFF" ? "all active staff & teachers" : "the contacts below";

  return (
    <div>
      <PageHeader
        title="Messaging Center"
        subtitle="Broadcast to students, parents, staff or others — over SMS, email and WhatsApp at once, with full delivery history."
        action={<Button variant="outline" onClick={loadLogs}><History className="h-4 w-4" /> Refresh history</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="card space-y-4 p-6 lg:col-span-3">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-ink"><MessageSquareText className="h-5 w-5 text-primary" /> Compose broadcast</h3>

          <Field label="Audience *">
            <Select value={audience} onChange={(e) => setAudience(e.target.value)}>
              {AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </Select>
          </Field>

          {audience === "CLASS" && (
            <Field label="Class *">
              <Select required value={classId} onChange={(e) => setClassId(e.target.value)}>
                <option value="">Select…</option>
                {meta.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
          )}

          {audience === "LIST" && (
            <Field label="Contacts *" hint="Phone numbers and/or email addresses — comma or newline separated. Ghana numbers: 0244… or +23324…">
              <Textarea rows={3} value={contacts} onChange={(e) => setContacts(e.target.value)} placeholder={"0244000000\nparent@example.com"} />
              {parsedContacts.length > 0 && (
                <p className="mt-1.5 text-xs text-slate-400">Detected: <strong>{phones.length}</strong> phone(s) · <strong>{emails.length}</strong> email(s)</p>
              )}
            </Field>
          )}

          <Field label="Channels *" hint="Pick one or more delivery channels">
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map((c) => {
                const active = channels.includes(c.key);
                const Icon = c.icon;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => toggleChannel(c.key)}
                    className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-all ${active ? "border-primary bg-primary-soft text-primary shadow-sm" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"}`}
                  >
                    <Icon className="h-4 w-4" /> {c.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Message *" hint={`${message.length}/480 characters`}>
            <Textarea rows={5} maxLength={480} required value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Dear Parent, the school reopens on Monday 6:30am. — Management" />
          </Field>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-xs text-slate-400"><Users className="h-4 w-4" /> Will be sent to {countLabel}</p>
            <Button onClick={send} loading={sending} disabled={!message.trim() || !channels.length}>
              <Send className="h-4 w-4" /> Send via {channels.join(" + ") || "—"}
            </Button>
          </div>

          {result && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                <span className="flex items-center gap-1.5 font-bold"><BadgeCheck className="h-4 w-4" /> {Object.values(result.sent).reduce((a, b) => a + b, 0)} delivered</span>
                {Object.entries(result.sent).map(([ch, n]) => (
                  <span key={ch} className="text-xs font-semibold uppercase tracking-wide">{ch}: {n}</span>
                ))}
                {result.failed > 0 && <span className="text-xs font-semibold text-rose-600">failed: {result.failed}</span>}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500"><History className="h-4 w-4" /> History</h3>
          {logs.length === 0 ? <EmptyState title="No messages sent yet" hint="Your broadcast history will appear here." /> : (
            <div className="space-y-3">
              {logs.map((l) => (
                <div key={l.id} className="card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone="blue">{l.audience.replace(/_/g, " ")}</Badge>
                    <span className="text-xs text-slate-400">{fmtDateTime(l.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{l.message}</p>
                  <p className="mt-2 text-xs text-slate-400">{l.recipientCount} recipients · via {l.provider ?? "console"}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

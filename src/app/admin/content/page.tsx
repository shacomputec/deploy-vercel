"use client";

import { useCallback, useEffect, useState } from "react";
import { Globe, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/client";
import { fmtDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/admin/page-header";
import { useToast } from "@/components/ui/toast";

type News = { id: string; title: string; published: boolean; publishedAt: string | null; excerpt: string | null };
type Event = { id: string; title: string; location: string | null; startDate: string; published: boolean };
type Announcement = { id: string; title: string; body: string | null; priority: string; published: boolean };
type GalleryImage = { id: string; title: string | null; url: string; caption: string | null };

export default function ContentPage() {
  const toast = useToast();
  const [tab, setTab] = useState<"news" | "events" | "announcements" | "gallery">("news");
  const [news, setNews] = useState<News[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [modal, setModal] = useState<null | { kind: "news" | "events" | "announcements" | "gallery"; editing?: unknown }>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [n, e, a, g] = await Promise.all([
        api<News[]>("/api/content/news"),
        api<Event[]>("/api/content/events"),
        api<Announcement[]>("/api/content/announcements"),
        api<GalleryImage[]>("/api/content/gallery"),
      ]);
      setNews(n); setEvents(e); setAnnouncements(a); setGallery(g);
    } catch (err) {
      toast.toast({ title: "Failed to load content", description: (err as Error).message, variant: "error" });
    }
  }, [toast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal?.kind === "news") {
        await api("/api/content/news", { method: "POST", body: JSON.stringify({ title: form.title, excerpt: form.excerpt, body: form.body, author: form.author, coverImage: form.coverImage, published: true }) });
      } else if (modal?.kind === "events") {
        await api("/api/content/events", { method: "POST", body: JSON.stringify({ title: form.title, description: form.description, location: form.location, startDate: form.startDate, published: true }) });
      } else if (modal?.kind === "announcements") {
        await api("/api/content/announcements", { method: "POST", body: JSON.stringify({ title: form.title, body: form.body, priority: form.priority, published: true }) });
      } else if (modal?.kind === "gallery") {
        await api("/api/content/gallery", { method: "POST", body: JSON.stringify({ title: form.title, url: form.url, caption: form.caption }) });
      }
      toast.toast({ title: "Published to website", variant: "success" });
      setModal(null); setForm({}); loadAll();
    } catch (err) {
      toast.toast({ title: "Save failed", description: (err as Error).message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function remove(kind: string, id: string) {
    if (!confirm("Delete this item?")) return;
    try {
      if (kind === "announcement") {
        await api("/api/content/announcements", { method: "DELETE", body: JSON.stringify({ id }) });
      } else if (kind === "gallery") {
        await api("/api/content/gallery", { method: "DELETE", body: JSON.stringify({ id }) });
      } else if (kind === "news") {
        await api(`/api/content/news/${id}`, { method: "DELETE" });
      } else {
        await api(`/api/content/events/${id}`, { method: "DELETE" });
      }
      loadAll();
    } catch (err) {
      toast.toast({ title: "Delete failed", description: (err as Error).message, variant: "error" });
    }
  }

  const tabs = [
    ["news", "News"], ["events", "Events"], ["announcements", "Announcements"], ["gallery", "Gallery"],
  ] as const;

  return (
    <div>
      <PageHeader
        title="Website Content"
        subtitle="Everything here is immediately live on the public website"
        action={<Button onClick={() => { setForm({}); setModal({ kind: tab }); }}><Plus className="h-4 w-4" /> Add {tab}</Button>}
      />

      <div className="mb-5 flex flex-wrap gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
        {tabs.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === key ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50"}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {tab === "news" && news.map((n) => (
          <div key={n.id} className="card flex items-start justify-between gap-3 p-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {n.published ? <Badge tone="green">Live</Badge> : <Badge tone="slate">Draft</Badge>}
                <span className="text-xs text-slate-400">{fmtDate(n.publishedAt)}</span>
              </div>
              <h3 className="mt-2 truncate font-semibold text-slate-800">{n.title}</h3>
              {n.excerpt && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{n.excerpt}</p>}
            </div>
            <button onClick={() => remove("news", n.id)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        {tab === "events" && events.map((ev) => (
          <div key={ev.id} className="card flex items-start justify-between gap-3 p-5">
            <div>
              <div className="flex items-center gap-2">
                {ev.published ? <Badge tone="green">Live</Badge> : <Badge tone="slate">Draft</Badge>}
                <span className="text-xs text-slate-400">{fmtDate(ev.startDate)}</span>
              </div>
              <h3 className="mt-2 font-semibold text-slate-800">{ev.title}</h3>
              {ev.location && <p className="mt-1 text-sm text-slate-400">{ev.location}</p>}
            </div>
            <button onClick={() => remove("event", ev.id)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        {tab === "announcements" && announcements.map((a) => (
          <div key={a.id} className="card flex items-start justify-between gap-3 p-5">
            <div>
              <div className="flex items-center gap-2">
                <Badge tone={a.priority === "HIGH" ? "red" : "amber"}>{a.priority}</Badge>
                {a.published ? <Badge tone="green">Live</Badge> : <Badge tone="slate">Hidden</Badge>}
              </div>
              <h3 className="mt-2 font-semibold text-slate-800">{a.title}</h3>
              {a.body && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{a.body}</p>}
            </div>
            <button onClick={() => remove("announcement", a.id)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        {tab === "gallery" && gallery.map((g) => (
          <div key={g.id} className="card flex items-center gap-4 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={g.url} alt="" className="h-20 w-28 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-semibold text-slate-800">{g.title ?? "Untitled"}</h3>
              {g.caption && <p className="truncate text-sm text-slate-400">{g.caption}</p>}
            </div>
            <button onClick={() => remove("gallery", g.id)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={`Add ${modal?.kind ?? ""}`} wide>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
      {modal?.kind === "news" && (
        <>
          <Field label="Title *" className="sm:col-span-2"><Input required value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
              <Field label="Excerpt" className="sm:col-span-2"><Textarea rows={2} value={form.excerpt ?? ""} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} /></Field>
              <Field label="Body" className="sm:col-span-2"><Textarea rows={4} value={form.body ?? ""} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field>
              <Field label="Author"><Input value={form.author ?? ""} onChange={(e) => setForm({ ...form, author: e.target.value })} /></Field>
              <Field label="Cover image URL"><Input value={form.coverImage ?? ""} onChange={(e) => setForm({ ...form, coverImage: e.target.value })} /></Field>
            </>
          )}
          {modal?.kind === "events" && (
            <>
              <Field label="Title *" className="sm:col-span-2"><Input required value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
              <Field label="Start date *"><Input required type="datetime-local" value={form.startDate ?? ""} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
              <Field label="Location"><Input value={form.location ?? ""} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
              <Field label="Description" className="sm:col-span-2"><Textarea rows={3} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            </>
          )}
          {modal?.kind === "announcements" && (
            <>
              <Field label="Title *" className="sm:col-span-2"><Input required value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
              <Field label="Body" className="sm:col-span-2"><Textarea rows={3} value={form.body ?? ""} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field>
              <Field label="Priority">
                <select className="select" value={form.priority ?? "NORMAL"} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  <option value="NORMAL">Normal</option><option value="HIGH">High</option>
                </select>
              </Field>
            </>
          )}
          {modal?.kind === "gallery" && (
            <>
              <Field label="Image URL *" className="sm:col-span-2"><Input required value={form.url ?? ""} onChange={(e) => setForm({ ...form, url: e.target.value })} /></Field>
              <Field label="Title"><Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
              <Field label="Caption"><Input value={form.caption ?? ""} onChange={(e) => setForm({ ...form, caption: e.target.value })} /></Field>
            </>
          )}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
            <Button type="submit" loading={saving}><Globe className="h-4 w-4" /> Publish</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

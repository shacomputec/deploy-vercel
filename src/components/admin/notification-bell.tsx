"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, BellRing, CheckCheck, Inbox } from "lucide-react";
import { api } from "@/lib/client";
import { fmtDateTime } from "@/lib/utils";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "alert";
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

const TONES: Record<string, string> = {
  info: "bg-sky-50 text-sky-600",
  success: "bg-emerald-50 text-emerald-600",
  warning: "bg-amber-50 text-amber-600",
  alert: "bg-rose-50 text-rose-600",
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const load = () => {
    api<{ items: NotificationItem[]; unread: number }>("/api/notifications")
      .then((d) => {
        setItems(d.items);
        setUnread(d.unread);
      })
      .catch(() => {});
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => {
      clearInterval(t);
      document.removeEventListener("mousedown", onDoc);
    };
  }, []);

  const markAll = async () => {
    await api("/api/notifications/read", { method: "POST", body: "{}" }).catch(() => {});
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        aria-label={unread ? `${unread} unread notifications` : "Notifications"}
        title="Notifications"
      >
        {unread > 0 ? <BellRing className="h-5 w-5 text-primary" /> : <Bell className="h-5 w-5" />}
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lift sm:w-96">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-bold text-slate-900">Notifications</p>
            {unread > 0 && (
              <button onClick={markAll} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <Inbox className="h-8 w-8 text-slate-300" />
                <p className="text-sm font-medium text-slate-500">You're all caught up</p>
                <p className="text-xs text-slate-400">Admission applications, payments and system alerts appear here.</p>
              </div>
            ) : (
              items.map((n) => {
                const inner = (
                  <>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TONES[n.type] ?? TONES.info}`}>
                      <Bell className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold text-slate-800">{n.title}</span>
                        {!n.readAt && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">{n.message}</span>
                      <span className="mt-0.5 block text-[10px] text-slate-400">{fmtDateTime(n.createdAt)}</span>
                    </span>
                  </>
                );
                const cls = `flex items-start gap-3 px-4 py-3 transition ${n.readAt ? "bg-white" : "bg-primary-soft/30"} hover:bg-slate-50`;
                return n.link ? (
                  <Link key={n.id} href={n.link} onClick={() => setOpen(false)} className={cls}>
                    {inner}
                  </Link>
                ) : (
                  <div key={n.id} className={cls}>
                    {inner}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

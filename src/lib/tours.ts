"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Shared "seen once" state for first-run tours.
 *
 * The dismissed flag lives in two places:
 *   1. The User record (via /api/portal/tours) — so a tour dismissed on the
 *      desktop does not reappear on the phone or another browser.
 *   2. localStorage — instant, and it still works fully offline / when the
 *      server flag is unreachable.
 *
 * Returns [shouldShow, markSeen] — call markSeen() when the user skips or
 * closes the tour, or markSeen("completed") when they walk through to the end
 * (so the dashboard analytics can tell finished tours from skipped ones).
 */
export function useTourSeen(key: string) {
  const [serverSeen, setServerSeen] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/portal/tours", { method: "GET" });
        const json = await res.json();
        if (!cancelled && json?.ok) {
          if (Array.isArray(json.data?.tours)) setServerSeen(json.data.tours.includes(key));
          if (typeof json.data?.enabled === "boolean") setEnabled(json.data.enabled);
        }
      } catch {
        /* offline — fall back to localStorage only */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  const localSeen = (() => {
    try {
      return localStorage.getItem(key) === "1";
    } catch {
      return false;
    }
  })();

  const markSeen = useCallback((status?: "completed") => {
    try {
      localStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
    fetch("/api/portal/tours", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, status: status ?? "dismissed" }),
    }).catch(() => {});
  }, [key]);

  const shouldShow = loaded && enabled && !serverSeen && !localSeen;

  return { shouldShow, markSeen };
}

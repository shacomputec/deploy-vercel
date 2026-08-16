"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    // Never register the service worker in development: Next's dev chunks are
    // NOT content-hashed, so a cache-first SW serves a stale JS bundle that
    // hydrates against fresh server HTML — producing "Text content does not
    // match server-rendered HTML" errors. Production builds use hashed assets,
    // so the offline PWA cache is safe there.
    // Also self-heal any SW that was registered in dev before this fix: unregister
    // it and drop its caches so stale bundles stop being served.
    if (process.env.NODE_ENV === "development") {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((r) => r.unregister().catch(() => {}));
        });
        if (window.caches) {
          caches.keys().then((keys) => keys.forEach((k) => caches.delete(k).catch(() => {})));
        }
      }
      return;
    }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("[pwa] service worker registration failed", err);
      });
    }
  }, []);
  return null;
}

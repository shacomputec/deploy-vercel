"use client";

import { useEffect, useRef, useState } from "react";
import { Printer, X } from "lucide-react";

/**
 * Renders a slim no-print toolbar and auto-opens the browser print dialog a
 * moment after mount (so webfonts/layout settle). Used by the dedicated A4
 * print pages for report cards, admission applications and ID cards.
 * Pass `pdfHref` to also offer a one-click real PDF download.
 */
export function AutoPrint({ title, pdfHref, pdfLabel }: { title?: string; pdfHref?: string; pdfLabel?: string }) {
  const [printed, setPrinted] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const t = setTimeout(() => {
      window.print();
      setPrinted(true);
    }, 450);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="no-print fixed inset-x-0 top-0 z-50 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 py-2.5 shadow-sm backdrop-blur">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Printer className="h-4 w-4 text-emerald-600" />
        {title ?? "Print preview"} — A4 · front only
      </div>
      <div className="flex items-center gap-2">
        {pdfHref && (
          <a
            href={pdfHref}
            className="rounded-lg border border-emerald-600 bg-white px-4 py-1.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50"
          >
            ⬇ {pdfLabel ?? "Download PDF"}
          </a>
        )}
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
        >
          {printed ? "Print again" : "Print / Save PDF"}
        </button>
        <button
          onClick={() => window.close()}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          title="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

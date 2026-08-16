"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Globe, Languages } from "lucide-react";
import { LANGUAGES } from "@/lib/i18n/languages";
import { useLanguage } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

/**
 * Language picker — the user chooses the Ghanaian language they read best.
 * English is the default. `variant="pills"` renders an inline chip list
 * (login screen); the default is a compact dropdown.
 */
export function LanguageSwitcher({
  variant = "dropdown",
  className,
}: {
  variant?: "dropdown" | "pills";
  className?: string;
}) {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  if (variant === "pills") {
    return (
      <div className={cn("flex flex-wrap items-center gap-1.5", className)} role="group" aria-label="Choose language">
        <Languages className="h-4 w-4 text-slate-400" />
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            onClick={() => setLang(l.code)}
            title={`${l.name} · ${l.native}`}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-bold transition",
              lang === l.code
                ? "border-primary/50 bg-primary-soft text-primary shadow-sm"
                : "border-slate-200 bg-white text-slate-500 hover:border-primary/40 hover:text-primary",
            )}
          >
            {l.flag} {l.native}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/90 px-2.5 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-primary/40 hover:text-primary"
        aria-label="Choose language"
        title="Language / Ɛkasa / Gbe / Harshe"
      >
        <Globe className="h-3.5 w-3.5 text-primary" />
        <span>{current.flag}</span>
        <span className="hidden sm:inline">{current.native}</span>
        <Check className={cn("h-3 w-3 transition", open ? "rotate-180" : "rotate-0")} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-lift">
          <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Read in your language
          </p>
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLang(l.code);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-primary-soft",
                lang === l.code ? "font-bold text-primary" : "text-slate-600",
              )}
            >
              <span>{l.flag}</span>
              <span className="flex-1">
                {l.native}
                <span className="ml-1.5 text-[11px] font-normal text-slate-400">{l.name}</span>
              </span>
              {lang === l.code && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

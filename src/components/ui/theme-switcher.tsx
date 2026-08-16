"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Droplets, Moon, Palette, Sparkles, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export type UiTheme = "light" | "dark" | "gold" | "ocean" | "royal";

const THEMES: { id: UiTheme; label: string; desc: string; icon: typeof Sun; swatch: string }[] = [
  { id: "light", label: "Light", desc: "Crisp & clean", icon: Sun, swatch: "#059669" },
  { id: "dark", label: "Dark", desc: "Easy on the eyes", icon: Moon, swatch: "#10b981" },
  { id: "gold", label: "Gold", desc: "Premium & warm", icon: Sparkles, swatch: "#ca8a04" },
  { id: "ocean", label: "Ocean", desc: "Fresh & blue", icon: Droplets, swatch: "#2563eb" },
  { id: "royal", label: "Royal", desc: "Violet & bold", icon: Palette, swatch: "#7c3aed" },
];

const KEY = "ui-theme";

/** Map anything stored by an older build to the current theme set. */
function normalize(t: string | null): UiTheme {
  if (t === "dark" || t === "gold" || t === "ocean" || t === "royal") return t;
  // forest was the old original look — fold it into Light.
  return "light";
}

/** Apply the saved theme to <html> — used by the switcher and the inline early script. */
export function applyUiTheme(theme: UiTheme | null) {
  const el = document.documentElement;
  const t = normalize(theme);
  if (t === "light") el.removeAttribute("data-ui-theme");
  else el.setAttribute("data-ui-theme", t);
}

function readSaved(): UiTheme {
  try {
    return normalize(localStorage.getItem(KEY));
  } catch {
    return "light";
  }
}

/** Small popover switcher — Light / Dark / Gold looks the user flips between instantly. */
export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<UiTheme>("light");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = readSaved();
    setTheme(saved);
    applyUiTheme(saved);
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0]!;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-primary/40 hover:text-primary"
        aria-label="Switch UI theme"
        title={`Theme: ${current.label}`}
      >
        <current.icon className="h-3.5 w-3.5 text-primary" />
        {!compact && <span className="hidden sm:inline">{current.label}</span>}
        <span className="h-2.5 w-2.5 rounded-full ring-2 ring-white" style={{ background: current.swatch }} />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lift">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTheme(t.id);
                applyUiTheme(t.id);
                try {
                  localStorage.setItem(KEY, t.id);
                } catch {}
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-slate-50",
                theme === t.id ? "bg-primary/5" : ""
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg",
                  t.id === "dark" ? "bg-slate-950 text-slate-200" :
                  t.id === "gold" ? "bg-amber-100 text-amber-700" :
                  t.id === "ocean" ? "bg-blue-100 text-blue-700" :
                  t.id === "royal" ? "bg-violet-100 text-violet-700" :
                  "bg-emerald-50 text-emerald-700"
                )}
              >
                <t.icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className={cn("block text-[13px] font-semibold", theme === t.id ? "text-primary" : "text-slate-800")}>{t.label}</span>
                <span className="block text-[11px] text-slate-400">{t.desc}</span>
              </span>
              {theme === t.id && <Check className="ml-auto h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_LANGUAGE, isLanguageCode, LANGUAGES, type LanguageCode } from "@/lib/i18n/languages";
import { DICTS, type UiKey } from "@/lib/i18n/translations";

const STORAGE_KEY = "ui-lang";
const COOKIE = "lang";

/** Resolve a string for a language, walking the fallback chain to English. */
export function resolveTranslation(lang: LanguageCode, key: UiKey): string {
  let current: LanguageCode | undefined = lang;
  while (current) {
    const found = DICTS[current]?.[key];
    if (found) return found;
    const meta = LANGUAGES.find((l) => l.code === current);
    current = meta?.fallback;
  }
  return DICTS.en?.[key] ?? key;
}

type LanguageContextValue = {
  lang: LanguageCode;
  setLang: (code: LanguageCode) => void;
  t: (key: UiKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LanguageCode>(DEFAULT_LANGUAGE);

  useEffect(() => {
    let initial: LanguageCode = DEFAULT_LANGUAGE;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && isLanguageCode(stored)) initial = stored;
      else {
        const fromCookie = document.cookie
          .split(";")
          .map((c) => c.trim())
          .find((c) => c.startsWith(`${COOKIE}=`))
          ?.split("=")[1];
        if (fromCookie && isLanguageCode(fromCookie)) initial = fromCookie;
      }
    } catch {
      /* storage unavailable — stay with the default */
    }
    setLangState(initial);
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      setLang: (code) => {
        setLangState(code);
        try {
          localStorage.setItem(STORAGE_KEY, code);
          document.cookie = `${COOKIE}=${code};path=/;max-age=31536000;SameSite=Lax`;
        } catch {
          /* ignore */
        }
      },
      t: (key) => resolveTranslation(lang, key),
    }),
    [lang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside <LanguageProvider>");
  return ctx;
}

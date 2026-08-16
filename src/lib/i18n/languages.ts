/**
 * Ghanaian language support — the user picks the language they read and
 * understand best; English remains the default.
 *
 * Each language has a `fallback` — keys missing from its dictionary fall back
 * to that language's set first, then to English. Related dialects (Fante,
 * Dagaare, Nzema) reuse the closest major dictionary so nothing is ever left
 * blank.
 */
export type LanguageCode =
  | "en"
  | "tw" // Asante Twi
  | "fat" // Fante
  | "ee" // Ewe
  | "ga" // Ga
  | "dag" // Dagbani
  | "ha" // Hausa
  | "dga" // Dagaare
  | "nz"; // Nzema

export type Language = {
  code: LanguageCode;
  /** English name of the language. */
  name: string;
  /** The language's own name (shown in the picker). */
  native: string;
  /** Emoji flag / marker used in the picker. */
  flag: string;
  /** Dictionary to fall back to before English (for related dialects). */
  fallback?: LanguageCode;
};

export const LANGUAGES: Language[] = [
  { code: "en", name: "English", native: "English", flag: "🇬🇧" },
  { code: "tw", name: "Asante Twi", native: "Twi (Asante)", flag: "🇬🇭" },
  { code: "fat", name: "Fante", native: "Fante", flag: "🇬🇭", fallback: "tw" },
  { code: "ee", name: "Ewe", native: "Eʋegbe", flag: "🇬🇭" },
  { code: "ga", name: "Ga", native: "Ga", flag: "🇬🇭" },
  { code: "dag", name: "Dagbani", native: "Dagbanli", flag: "🇬🇭" },
  { code: "ha", name: "Hausa", native: "Hausa", flag: "🇬🇭" },
  { code: "dga", name: "Dagaare", native: "Dagaare", flag: "🇬🇭", fallback: "dag" },
  { code: "nz", name: "Nzema", native: "Nzema", flag: "🇬🇭", fallback: "tw" },
];

export const DEFAULT_LANGUAGE: LanguageCode = "en";

export function isLanguageCode(value: string | null | undefined): value is LanguageCode {
  return !!value && LANGUAGES.some((l) => l.code === value);
}

export function getLanguage(code: string | null | undefined): Language {
  const lang = LANGUAGES.find((l) => l.code === code);
  return lang ?? LANGUAGES[0];
}

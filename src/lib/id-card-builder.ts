import { getSettingJSON } from "@/lib/settings";

/**
 * ID Card Builder — the school's saved card design, shared by the builder
 * screen (Admin → ID Cards → Design) and the student/staff print pages.
 * Stored as JSON in the Setting row keyed `idCardBuilder`.
 */

export type IdCardTemplate = "classic" | "emerald" | "royal" | "sunset" | "minimal";

export type IdCardDesign = {
  template: IdCardTemplate;
  headerText: string; // card header title (defaults to the school name)
  subtitleText: string; // small line under the header (defaults to the class/level)
  headerBg: string;
  headerTextColor: string;
  accent: string; // used for the bottom strip and accents
  showLogo: boolean;
  front: {
    photo: boolean;
    name: boolean;
    classLine: boolean;
    admissionNo: boolean;
    year: boolean;
    gender: boolean;
  };
  back: {
    idNo: boolean;
    dob: boolean;
    hometown: boolean;
    region: boolean;
    phone: boolean;
    nationality: boolean;
    qr: boolean;
    devFooter: boolean;
  };
  footerText: string; // bottom strip text on the back
};

export const TEMPLATES: { key: IdCardTemplate; label: string; headerBg: string; headerTextColor: string; accent: string }[] = [
  { key: "classic", label: "Classic", headerBg: "#0f172a", headerTextColor: "#ffffff", accent: "#0f172a" },
  { key: "emerald", label: "Emerald", headerBg: "#047857", headerTextColor: "#ffffff", accent: "#047857" },
  { key: "royal", label: "Royal", headerBg: "#1e3a8a", headerTextColor: "#ffffff", accent: "#1e3a8a" },
  { key: "sunset", label: "Sunset", headerBg: "#c2410c", headerTextColor: "#ffffff", accent: "#c2410c" },
  { key: "minimal", label: "Minimal", headerBg: "#f1f5f9", headerTextColor: "#0f172a", accent: "#475569" },
];

export const DEFAULT_DESIGN: IdCardDesign = {
  template: "classic",
  headerText: "", // empty → print routes substitute the school name
  subtitleText: "", // empty → print routes substitute the class / level
  headerBg: "#0f172a",
  headerTextColor: "#ffffff",
  accent: "#0f172a",
  showLogo: true,
  front: { photo: true, name: true, classLine: true, admissionNo: true, year: true, gender: true },
  back: { idNo: true, dob: true, hometown: true, region: true, phone: true, nationality: true, qr: true, devFooter: true },
  footerText: "",
};

/** Load the saved design (or the default), merging partial saved JSON safely. */
export async function getIdCardDesign(): Promise<IdCardDesign> {
  const saved = await getSettingJSON<Partial<IdCardDesign>>("idCardBuilder", {});
  const base = { ...DEFAULT_DESIGN };
  const merged: IdCardDesign = {
    ...base,
    ...saved,
    front: { ...base.front, ...(saved.front ?? {}) },
    back: { ...base.back, ...(saved.back ?? {}) },
  };
  // Keep colours in sync with a template unless the user overrode them after picking.
  return merged;
}

/** Colour-safe helper: ensure a hex colour starts with # and is 6 digits (or fallback). */
export function safeHex(v: string | undefined, fallback: string): string {
  if (!v) return fallback;
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback;
}

import { prisma } from "@/lib/prisma";

let cache: { map: Map<string, string>; expiresAt: number } | null = null;
const TTL = 30_000;

export async function getSettings(): Promise<Map<string, string>> {
  if (cache && cache.expiresAt > Date.now()) return cache.map;
  const rows = await prisma.setting.findMany();
  const map = new Map(rows.map((r) => [r.key, r.value ?? ""]));
  cache = { map, expiresAt: Date.now() + TTL };
  return map;
}

export function clearSettingsCache() {
  cache = null;
}

export async function getSettingJSON<T>(key: string, fallback: T): Promise<T> {
  const settings = await getSettings();
  const raw = settings.get(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function getSetting(key: string): Promise<string | undefined> {
  const settings = await getSettings();
  return settings.get(key);
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
  clearSettingsCache();
}

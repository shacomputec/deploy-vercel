export class ClientError extends Error {
  status: number;
  issues?: string[];
  constructor(message: string, status = 400, issues?: string[]) {
    super(message);
    this.status = status;
    this.issues = issues;
  }
}

export async function api<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  let json: { ok: boolean; data?: T; error?: string; issues?: string[] } | null = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON response */
  }
  if (!res.ok || !json?.ok) {
    throw new ClientError(json?.error ?? `Request failed (${res.status})`, res.status, json?.issues);
  }
  return json.data as T;
}

export function toFormData(obj: Record<string, unknown>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null) fd.append(k, String(v));
  }
  return fd;
}

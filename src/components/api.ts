export type ApiResult = { ok: boolean; status: number; error?: string; reason?: string; fields?: string[]; next?: string };

/** POST JSON to our own API. Never throws: network problems come back as { ok:false, status:0 }. */
export async function postJson(url: string, body: unknown): Promise<ApiResult> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = (await res.json().catch(() => ({}))) as Partial<ApiResult>;
    return { ok: res.ok && j.ok !== false, status: res.status, error: j.error, reason: j.reason, fields: j.fields, next: j.next };
  } catch {
    return { ok: false, status: 0, error: "network" };
  }
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

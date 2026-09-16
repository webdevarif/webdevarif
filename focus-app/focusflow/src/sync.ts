// FocusFlow → dashboard sync.
// The desktop app is the source of truth; it POSTs logged sessions to the
// dashboard's `/api/focus/sessions` (idempotent per clientId). Config lives in
// localStorage so it survives restarts and needs no Rust round-trip.

export type SyncConfig = { baseUrl: string; apiKey: string };

const URL_KEY = "focusflow.dashboardUrl";
const KEY_KEY = "focusflow.apiKey";

export function getSyncConfig(): SyncConfig | null {
  const baseUrl = localStorage.getItem(URL_KEY)?.trim();
  const apiKey = localStorage.getItem(KEY_KEY)?.trim();
  if (!baseUrl || !apiKey) return null;
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

export function saveSyncConfig(baseUrl: string, apiKey: string) {
  localStorage.setItem(URL_KEY, baseUrl.trim().replace(/\/+$/, ""));
  localStorage.setItem(KEY_KEY, apiKey.trim());
}

export function clearSyncConfig() {
  localStorage.removeItem(URL_KEY);
  localStorage.removeItem(KEY_KEY);
}

// The shape `/api/focus/sessions` validates (see the dashboard route's zod).
export type SyncSession = {
  clientId: string;
  task: string;
  kind: "focus" | "break";
  plannedMin: number;
  actualSec: number;
  status: "completed" | "extended" | "abandoned";
  startedAt: string; // ISO
  endedAt: string; // ISO
};

export type PushResult =
  | { ok: true; acknowledged: string[] }
  | { ok: false; error: string };

/** POST a batch. On success returns the clientIds the server durably stored. */
export async function pushSessions(
  cfg: SyncConfig,
  sessions: SyncSession[],
): Promise<PushResult> {
  try {
    const res = await fetch(`${cfg.baseUrl}/api/focus/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({ sessions }),
    });
    const json = (await res.json().catch(() => null)) as {
      ok?: boolean;
      data?: { acknowledged?: string[] };
      error?: { message?: string };
    } | null;
    if (!res.ok || !json?.ok) {
      return { ok: false, error: json?.error?.message ?? `HTTP ${res.status}` };
    }
    return { ok: true, acknowledged: json.data?.acknowledged ?? [] };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

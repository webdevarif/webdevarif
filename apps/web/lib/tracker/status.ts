/**
 * Connection-status badge logic — shared by the Sites Home card and
 * the /api/track/status endpoint that powers the Verify poller.
 *
 *   - "awaiting"  : no event has ever arrived (last_event_at IS NULL)
 *   - "connected" : last event within the last 24h
 *   - "inactive"  : last event > 7 days ago
 *   - "idle"      : last event between 24h and 7d ago (still warm-ish)
 */
export type ConnectionStatus =
  | "awaiting"
  | "connected"
  | "idle"
  | "inactive";

const HOUR = 60 * 60 * 1000;
const CONNECTED_WINDOW_MS = 24 * HOUR;
const INACTIVE_THRESHOLD_MS = 7 * 24 * HOUR;

export function statusFromLastEventAt(
  lastEventAt: Date | null | undefined,
): ConnectionStatus {
  if (!lastEventAt) return "awaiting";
  const ageMs = Date.now() - new Date(lastEventAt).getTime();
  if (ageMs <= CONNECTED_WINDOW_MS) return "connected";
  if (ageMs > INACTIVE_THRESHOLD_MS) return "inactive";
  return "idle";
}

export function trackerScriptSnippet(
  baseUrl: string,
  publicKey: string,
): string {
  const clean = baseUrl.replace(/\/$/, "");
  return `<script async src="${clean}/t/${publicKey}.js"></script>`;
}

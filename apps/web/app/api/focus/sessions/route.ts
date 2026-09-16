import { z } from "zod";

import {
  insertFocusSession,
  listFocusSessionsSince,
} from "@kit/database";

import { authenticateApiKey, readJsonBody } from "@/lib/api/auth";
import { jsonError, jsonOk, preflight } from "@/lib/api/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/focus/sessions — sync target for the FocusFlow desktop app.
 *
 *   POST  (scope focus:write)  ingest a batch of logged sessions (idempotent
 *                              per clientId — safe to re-send an offline queue)
 *   GET   (scope focus:read)   recent sessions + a daily focus summary
 *
 * Auth is the standard Bearer api-key flow; all rows are scoped to the key's
 * user. The desktop client is browser-based (Tauri webview) so a custom
 * Authorization header triggers a CORS preflight — hence OPTIONS.
 */

const sessionSchema = z.object({
  // App-local id → dedupe key. Keeps re-syncs from duplicating rows.
  clientId: z.string().trim().min(1).max(80),
  task: z.string().trim().max(200).default("Untitled"),
  kind: z.enum(["focus", "break"]),
  plannedMin: z.coerce.number().int().min(1).max(600),
  actualSec: z.coerce.number().int().min(0).max(86_400),
  status: z.enum(["completed", "extended", "abandoned"]),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),
});

const bodySchema = z.object({
  sessions: z.array(sessionSchema).min(1).max(100),
});

export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateApiKey(req, "focus:write");
  if (!auth.ok) return auth.response;

  const body = await readJsonBody(req);
  if (!body.ok) return body.response;

  const parsed = bodySchema.safeParse(body.value);
  if (!parsed.success) {
    return jsonError(
      "VALIDATION_FAILED",
      parsed.error.issues[0]?.message ?? "Invalid request body.",
      400,
    );
  }

  try {
    let inserted = 0;
    for (const s of parsed.data.sessions) {
      const row = await insertFocusSession({
        userId: auth.key.userId,
        clientId: s.clientId,
        task: s.task || "Untitled",
        kind: s.kind,
        plannedMin: s.plannedMin,
        actualSec: s.actualSec,
        status: s.status,
        startedAt: new Date(s.startedAt),
        endedAt: new Date(s.endedAt),
      });
      if (row) inserted += 1;
    }
    // Every validated clientId is now durably stored (freshly inserted or
    // already present) — the client can mark them all synced.
    const acknowledged = parsed.data.sessions.map((s) => s.clientId);
    return jsonOk({
      received: parsed.data.sessions.length,
      inserted,
      deduped: parsed.data.sessions.length - inserted,
      acknowledged,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed.";
    return jsonError("SYNC_FAILED", message, 502);
  }
}

export async function GET(req: Request): Promise<Response> {
  const auth = await authenticateApiKey(req, "focus:read");
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const days = Math.min(
    90,
    Math.max(1, Number(url.searchParams.get("days") ?? "7") || 7),
  );
  const since = new Date(Date.now() - days * 86_400_000);

  try {
    const sessions = await listFocusSessionsSince(auth.key.userId, since);
    const focus = sessions.filter((s) => s.kind === "focus");
    const summary = {
      focusSec: focus.reduce((a, s) => a + s.actualSec, 0),
      focusSessions: focus.length,
      breakSec: sessions
        .filter((s) => s.kind === "break")
        .reduce((a, s) => a + s.actualSec, 0),
    };
    return jsonOk({ range: { days }, summary, sessions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Read failed.";
    return jsonError("READ_FAILED", message, 502);
  }
}

export function OPTIONS(): Response {
  return preflight();
}

import "server-only";

import { and, desc, eq, gte } from "drizzle-orm";

import { db } from "../client";
import {
  focusSessions,
  type FocusSessionRow,
  type NewFocusSessionRow,
} from "../schema/focus-sessions";

/**
 * Insert one synced session. Idempotent on (userId, clientId): a re-sync of a
 * session the app already pushed is a no-op. Returns the new row when it was
 * actually inserted, or null when it already existed (deduped).
 */
export async function insertFocusSession(
  input: NewFocusSessionRow,
): Promise<FocusSessionRow | null> {
  const [row] = await db
    .insert(focusSessions)
    .values(input)
    .onConflictDoNothing({
      target: [focusSessions.userId, focusSessions.clientId],
    })
    .returning();
  return row ?? null;
}

/**
 * A user's sessions started on/after `since`, newest first. Used by the
 * `/api/focus/sessions` GET (desktop verification + the future dashboard page).
 */
export async function listFocusSessionsSince(
  userId: string,
  since: Date,
  limit = 500,
): Promise<FocusSessionRow[]> {
  return db
    .select()
    .from(focusSessions)
    .where(
      and(eq(focusSessions.userId, userId), gte(focusSessions.startedAt, since)),
    )
    .orderBy(desc(focusSessions.startedAt))
    .limit(limit);
}

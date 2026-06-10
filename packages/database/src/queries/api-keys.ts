import "server-only";

import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "../client";
import {
  apiKeys,
  type ApiKeyRow,
  type NewApiKeyRow,
} from "../schema/api-keys";

/**
 * Persisted summary of an API key, safe to return to the dashboard.
 * We deliberately omit the hash (it's a one-way digest anyway, but
 * defensive) — the only thing the UI ever sees post-creation is the
 * 8-char prefix + the row id.
 */
export type ApiKeyPublic = Omit<ApiKeyRow, "keyHash">;

export async function createApiKey(input: NewApiKeyRow): Promise<ApiKeyRow> {
  const [row] = await db.insert(apiKeys).values(input).returning();
  if (!row) throw new Error("api key insert returned no row");
  return row;
}

export async function listApiKeys(userId: string): Promise<ApiKeyPublic[]> {
  const rows = await db
    .select({
      id: apiKeys.id,
      userId: apiKeys.userId,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      scopes: apiKeys.scopes,
      lastUsedAt: apiKeys.lastUsedAt,
      revokedAt: apiKeys.revokedAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId))
    .orderBy(desc(apiKeys.createdAt));
  return rows;
}

/**
 * Auth-time lookup. Returns the row only when active (not revoked).
 * The caller is expected to additionally check the row's scopes
 * against the endpoint's required scope.
 */
export async function findActiveApiKeyByHash(
  keyHash: string,
): Promise<ApiKeyRow | null> {
  const rows = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Best-effort lastUsedAt bump. Not throttled — auth endpoints are
 * called by a single agent on a slow cadence, so write rate is low.
 */
export async function touchApiKeyLastUsed(id: string): Promise<void> {
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, id));
}

export async function revokeApiKey(
  id: string,
  userId: string,
): Promise<boolean> {
  const res = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(apiKeys.id, id),
        eq(apiKeys.userId, userId),
        isNull(apiKeys.revokedAt),
      ),
    )
    .returning({ id: apiKeys.id });
  return res.length > 0;
}

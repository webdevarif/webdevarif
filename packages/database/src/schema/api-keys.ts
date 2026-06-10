import { sql } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { users } from "./users";

/**
 * User-managed API keys for programmatic access to Tracker Machine
 * endpoints. The plaintext key is shown exactly ONCE — at creation —
 * and only the `sha256(plaintext)` hex digest is persisted. Auth at the
 * endpoint hashes the inbound bearer and looks it up here.
 *
 *   - `keyPrefix` is the first 8 chars of the plaintext (after the
 *     `tm_` brand prefix). Stored so the dashboard can show "tm_abc12345…"
 *     in the listing UI without holding the full key.
 *   - `scopes` is a Postgres text[] of permission strings. Initial set
 *     used by Tracker Machine: ["summary:read"]. The auth helper
 *     intersects requested-scope vs row-scopes; missing scope → 403.
 *   - `revokedAt`: NULL = active. Soft-delete so rotated keys can still
 *     be audited; the cron retention pass can prune ancient revoked rows
 *     later if you want.
 */
export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 80 }).notNull(),
    /** sha256 hex digest of the plaintext key. Indexed for auth lookups. */
    keyHash: varchar("key_hash", { length: 64 }).notNull(),
    /** First 8 chars of the plaintext (post-prefix) — display-only. */
    keyPrefix: varchar("key_prefix", { length: 12 }).notNull(),
    /** Permission strings, e.g. ["summary:read"]. */
    scopes: text("scopes").array().notNull().default(sql`'{}'::text[]`),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("api_keys_key_hash_idx").on(table.keyHash),
    index("api_keys_user_id_idx").on(table.userId),
  ],
);

export type ApiKeyRow = typeof apiKeys.$inferSelect;
export type NewApiKeyRow = typeof apiKeys.$inferInsert;

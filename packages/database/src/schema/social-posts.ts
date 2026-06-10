import { sql } from "drizzle-orm";
import {
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./users";

/** Postgres `bytea` mapped to Node Buffer for image bytes storage. */
const bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return "bytea";
  },
});

/**
 * A "session" — one creative brief (topic + tone + image style) that
 * spawned one or more posts. Variants of an individual post live in
 * social_posts as separate rows, so the user can keep iterating without
 * losing the prior version.
 */
export const socialSessions = pgTable(
  "social_sessions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    topic: text("topic").notNull(),
    /** e.g. "professional" | "casual" | "hype" | "educational" | "storytelling" */
    tone: text("tone").notNull(),
    /** e.g. "realistic" | "cinematic dark" | "minimal" | "3d render" | "tech illustration" | "bold typography" */
    imageStyle: text("image_style").notNull(),
    /** subset of ["instagram","linkedin","facebook"] selected for this session */
    platforms: jsonb("platforms").notNull().$type<string[]>(),
    modelUsed: text("model_used"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("social_sessions_user_id_idx").on(table.userId)],
);

export const socialPosts = pgTable(
  "social_posts",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => socialSessions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** "instagram" | "linkedin" | "facebook" */
    platform: text("platform").notNull(),
    caption: text("caption").notNull(),
    hashtags: jsonb("hashtags").notNull().$type<string[]>(),
    imagePrompt: text("image_prompt").notNull(),
    imageSeed: integer("image_seed").notNull(),
    imageWidth: integer("image_width").notNull().default(1024),
    imageHeight: integer("image_height").notNull().default(1024),
    /** Optional label so variants can be sorted/named ("Original", "v2", "punchier", …). */
    variantLabel: text("variant_label").notNull().default("Original"),
    /** Image generation provider — "cloudflare" | "openrouter" | null when not yet generated. */
    imageProvider: text("image_provider"),
    /** "pending" | "ready" | "failed" — the UI uses this for loading / retry states. */
    imageStatus: text("image_status").notNull().default("pending"),
    /** Last failure reason for `imageStatus = "failed"`. */
    imageError: text("image_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("social_posts_session_id_idx").on(table.sessionId),
    index("social_posts_user_id_idx").on(table.userId),
  ],
);

/**
 * Image bytes for each social post — kept in its own table so listings
 * of post metadata stay light. ~200-500KB per PNG.
 */
export const socialPostImages = pgTable(
  "social_post_images",
  {
    postId: uuid("post_id")
      .primaryKey()
      .references(() => socialPosts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bytes: bytea("bytes").notNull(),
    contentType: text("content_type").notNull().default("image/png"),
    /** "cloudflare" | "openrouter" — provider that produced these bytes. */
    provider: text("provider").notNull(),
    /** Original model id (e.g. "@cf/black-forest-labs/flux-1-schnell"). */
    model: text("model"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("social_post_images_user_id_idx").on(table.userId)],
);

export type SocialSessionRow = typeof socialSessions.$inferSelect;
export type NewSocialSessionRow = typeof socialSessions.$inferInsert;
export type SocialPostRow = typeof socialPosts.$inferSelect;
export type NewSocialPostRow = typeof socialPosts.$inferInsert;
export type SocialPostImageRow = typeof socialPostImages.$inferSelect;
export type NewSocialPostImageRow = typeof socialPostImages.$inferInsert;

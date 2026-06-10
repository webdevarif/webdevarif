import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "../client";
import {
  socialPostImages,
  socialPosts,
  socialSessions,
  type NewSocialPostImageRow,
  type NewSocialPostRow,
  type NewSocialSessionRow,
  type SocialPostImageRow,
  type SocialPostRow,
  type SocialSessionRow,
} from "../schema/social-posts";

// ─── Sessions ───────────────────────────────────────────────────────

export async function insertSocialSession(
  input: NewSocialSessionRow,
): Promise<SocialSessionRow> {
  const [row] = await db.insert(socialSessions).values(input).returning();
  if (!row) throw new Error("insert returned no row");
  return row;
}

export async function listSocialSessions(
  userId: string,
  limit = 100,
): Promise<SocialSessionRow[]> {
  return db
    .select()
    .from(socialSessions)
    .where(eq(socialSessions.userId, userId))
    .orderBy(desc(socialSessions.createdAt))
    .limit(limit);
}

export async function findSocialSession(
  userId: string,
  sessionId: string,
): Promise<SocialSessionRow | null> {
  const rows = await db
    .select()
    .from(socialSessions)
    .where(
      and(
        eq(socialSessions.id, sessionId),
        eq(socialSessions.userId, userId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function deleteSocialSession(
  userId: string,
  sessionId: string,
): Promise<boolean> {
  const rows = await db
    .delete(socialSessions)
    .where(
      and(
        eq(socialSessions.id, sessionId),
        eq(socialSessions.userId, userId),
      ),
    )
    .returning({ id: socialSessions.id });
  return rows.length > 0;
}

// ─── Posts ──────────────────────────────────────────────────────────

export async function insertSocialPost(
  input: NewSocialPostRow,
): Promise<SocialPostRow> {
  const [row] = await db.insert(socialPosts).values(input).returning();
  if (!row) throw new Error("insert returned no row");
  return row;
}

export async function listSocialPosts(
  sessionId: string,
): Promise<SocialPostRow[]> {
  return db
    .select()
    .from(socialPosts)
    .where(eq(socialPosts.sessionId, sessionId))
    .orderBy(asc(socialPosts.createdAt));
}

export async function findSocialPost(
  userId: string,
  postId: string,
): Promise<SocialPostRow | null> {
  const rows = await db
    .select()
    .from(socialPosts)
    .where(and(eq(socialPosts.id, postId), eq(socialPosts.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateSocialPostCaption(input: {
  userId: string;
  postId: string;
  caption: string;
  hashtags: string[];
}): Promise<void> {
  await db
    .update(socialPosts)
    .set({ caption: input.caption, hashtags: input.hashtags })
    .where(
      and(
        eq(socialPosts.id, input.postId),
        eq(socialPosts.userId, input.userId),
      ),
    );
}

export async function setSocialPostImageStatus(input: {
  postId: string;
  status: "pending" | "ready" | "failed";
  provider?: string | null;
  error?: string | null;
}): Promise<void> {
  await db
    .update(socialPosts)
    .set({
      imageStatus: input.status,
      imageProvider: input.provider ?? null,
      imageError: input.error ?? null,
    })
    .where(eq(socialPosts.id, input.postId));
}

// ─── Image bytes ────────────────────────────────────────────────────

export async function upsertSocialPostImage(
  input: NewSocialPostImageRow,
): Promise<SocialPostImageRow> {
  const [row] = await db
    .insert(socialPostImages)
    .values(input)
    .onConflictDoUpdate({
      target: socialPostImages.postId,
      set: {
        bytes: input.bytes,
        contentType: input.contentType,
        provider: input.provider,
        model: input.model,
        createdAt: new Date(),
      },
    })
    .returning();
  if (!row) throw new Error("upsertSocialPostImage returned no row");
  return row;
}

export async function findSocialPostImage(
  userId: string,
  postId: string,
): Promise<SocialPostImageRow | null> {
  const rows = await db
    .select()
    .from(socialPostImages)
    .where(
      and(
        eq(socialPostImages.postId, postId),
        eq(socialPostImages.userId, userId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

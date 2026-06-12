import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "../client";
import { linkClicks, type NewLinkClickRow } from "../schema/link-clicks";
import {
  shortLinks,
  type NewShortLinkRow,
  type ShortLinkRow,
} from "../schema/short-links";

// ─── Links ────────────────────────────────────────────────────────────

export async function createShortLink(
  input: NewShortLinkRow,
): Promise<ShortLinkRow> {
  const [row] = await db.insert(shortLinks).values(input).returning();
  if (!row) throw new Error("short link insert returned no row");
  return row;
}

export async function listShortLinks(userId: string): Promise<ShortLinkRow[]> {
  return db
    .select()
    .from(shortLinks)
    .where(eq(shortLinks.userId, userId))
    .orderBy(desc(shortLinks.createdAt));
}

export async function findShortLinkBySlug(
  slug: string,
): Promise<ShortLinkRow | null> {
  const rows = await db
    .select()
    .from(shortLinks)
    .where(eq(shortLinks.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export async function findShortLinkById(
  id: string,
  userId: string,
): Promise<ShortLinkRow | null> {
  const rows = await db
    .select()
    .from(shortLinks)
    .where(and(eq(shortLinks.id, id), eq(shortLinks.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateShortLink(
  id: string,
  userId: string,
  data: Partial<Pick<ShortLinkRow, "slug" | "originalUrl" | "title" | "isActive">>,
): Promise<ShortLinkRow | null> {
  const rows = await db
    .update(shortLinks)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(shortLinks.id, id), eq(shortLinks.userId, userId)))
    .returning();
  return rows[0] ?? null;
}

export async function deleteShortLink(
  id: string,
  userId: string,
): Promise<boolean> {
  const rows = await db
    .delete(shortLinks)
    .where(and(eq(shortLinks.id, id), eq(shortLinks.userId, userId)))
    .returning({ id: shortLinks.id });
  return rows.length > 0;
}

export async function isSlugTaken(slug: string): Promise<boolean> {
  const rows = await db
    .select({ id: shortLinks.id })
    .from(shortLinks)
    .where(eq(shortLinks.slug, slug))
    .limit(1);
  return rows.length > 0;
}

// ─── Clicks ───────────────────────────────────────────────────────────

export async function recordClick(input: NewLinkClickRow): Promise<void> {
  await Promise.all([
    db.insert(linkClicks).values(input),
    db
      .update(shortLinks)
      .set({ clickCount: sql`${shortLinks.clickCount} + 1` })
      .where(eq(shortLinks.id, input.linkId)),
  ]);
}

export async function getClicksForLink(
  linkId: string,
  limit = 100,
  offset = 0,
) {
  return db
    .select()
    .from(linkClicks)
    .where(eq(linkClicks.linkId, linkId))
    .orderBy(desc(linkClicks.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getClickStats(linkId: string) {
  const [byCountry, byBrowser, byDevice, byReferrer, recentClicks] =
    await Promise.all([
      db
        .select({
          country: linkClicks.country,
          count: sql<number>`count(*)`.mapWith(Number),
        })
        .from(linkClicks)
        .where(eq(linkClicks.linkId, linkId))
        .groupBy(linkClicks.country)
        .orderBy(sql`count(*) desc`)
        .limit(20),
      db
        .select({
          browser: linkClicks.browser,
          count: sql<number>`count(*)`.mapWith(Number),
        })
        .from(linkClicks)
        .where(eq(linkClicks.linkId, linkId))
        .groupBy(linkClicks.browser)
        .orderBy(sql`count(*) desc`)
        .limit(10),
      db
        .select({
          device: linkClicks.device,
          count: sql<number>`count(*)`.mapWith(Number),
        })
        .from(linkClicks)
        .where(eq(linkClicks.linkId, linkId))
        .groupBy(linkClicks.device)
        .orderBy(sql`count(*) desc`)
        .limit(5),
      db
        .select({
          referrer: linkClicks.referrer,
          count: sql<number>`count(*)`.mapWith(Number),
        })
        .from(linkClicks)
        .where(eq(linkClicks.linkId, linkId))
        .groupBy(linkClicks.referrer)
        .orderBy(sql`count(*) desc`)
        .limit(20),
      db
        .select()
        .from(linkClicks)
        .where(eq(linkClicks.linkId, linkId))
        .orderBy(desc(linkClicks.createdAt))
        .limit(50),
    ]);

  return { byCountry, byBrowser, byDevice, byReferrer, recentClicks };
}

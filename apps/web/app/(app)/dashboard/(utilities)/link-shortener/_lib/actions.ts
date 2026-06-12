"use server";

import { revalidatePath } from "next/cache";

import {
  createShortLink,
  deleteShortLink,
  isSlugTaken,
  updateShortLink,
} from "@kit/database";

import { requireUser } from "@/lib/auth/session";

function generateSlug(length = 6): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (const b of bytes) result += chars[b % chars.length];
  return result;
}

const SLUG_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
const RESERVED = new Set(["api", "go", "dashboard", "login", "signup", "admin"]);

export async function createLinkAction(formData: FormData) {
  const user = await requireUser();
  const originalUrl = (formData.get("url") as string)?.trim();
  const customSlug = (formData.get("slug") as string)?.trim().toLowerCase();
  const title = (formData.get("title") as string)?.trim() || null;

  if (!originalUrl) return { error: "URL is required" };

  try {
    new URL(originalUrl);
  } catch {
    return { error: "Invalid URL" };
  }

  let slug: string;
  if (customSlug) {
    if (customSlug.length < 2 || customSlug.length > 100) {
      return { error: "Slug must be 2-100 characters" };
    }
    if (!SLUG_RE.test(customSlug)) {
      return { error: "Slug can only contain lowercase letters, numbers, and hyphens" };
    }
    if (RESERVED.has(customSlug)) {
      return { error: "This slug is reserved" };
    }
    if (await isSlugTaken(customSlug)) {
      return { error: "This slug is already taken" };
    }
    slug = customSlug;
  } else {
    slug = generateSlug();
    while (await isSlugTaken(slug)) slug = generateSlug();
  }

  const link = await createShortLink({
    userId: user.id,
    slug,
    originalUrl,
    title,
  });

  revalidatePath("/dashboard/link-shortener");
  return { ok: true, link };
}

export async function updateLinkAction(formData: FormData) {
  const user = await requireUser();
  const id = formData.get("id") as string;
  const originalUrl = (formData.get("url") as string)?.trim();
  const newSlug = (formData.get("slug") as string)?.trim().toLowerCase();
  const title = (formData.get("title") as string)?.trim() || null;
  const isActive = formData.get("isActive") === "true";

  if (!id) return { error: "Link ID is required" };
  if (!originalUrl) return { error: "URL is required" };

  try {
    new URL(originalUrl);
  } catch {
    return { error: "Invalid URL" };
  }

  if (newSlug) {
    if (!SLUG_RE.test(newSlug)) {
      return { error: "Slug can only contain lowercase letters, numbers, and hyphens" };
    }
    if (RESERVED.has(newSlug)) {
      return { error: "This slug is reserved" };
    }
  }

  const result = await updateShortLink(id, user.id, {
    originalUrl,
    ...(newSlug ? { slug: newSlug } : {}),
    title,
    isActive,
  });

  if (!result) return { error: "Link not found" };

  revalidatePath("/dashboard/link-shortener");
  return { ok: true, link: result };
}

export async function deleteLinkAction(id: string) {
  const user = await requireUser();
  const deleted = await deleteShortLink(id, user.id);
  if (!deleted) return { error: "Link not found" };
  revalidatePath("/dashboard/link-shortener");
  return { ok: true };
}

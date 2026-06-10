"use server";

import crypto from "crypto";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

import {
  deleteVideo,
  findVideo,
  findVideoBySlug,
  insertVideo,
  updateVideo,
} from "@kit/database";

import { requireUser } from "@/lib/auth/session";
import { detectVideoSource } from "@/lib/videos/source";

export type CreateVideoState =
  | { ok: true; data: { id: string; slug: string } }
  | { ok: false; error: { message: string } };

export type UpdateVideoState =
  | { ok: true }
  | { ok: false; error: { message: string } };

function generateSlug(): string {
  // 6 random bytes → 8-char URL-safe base64 (no padding).
  return crypto.randomBytes(6).toString("base64url");
}

export async function createVideoAction(input: {
  title: string;
  sourceUrl: string;
  description?: string;
  password?: string;
}): Promise<CreateVideoState> {
  const user = await requireUser();

  const title = input.title.trim();
  const sourceUrl = input.sourceUrl.trim();
  const description = input.description?.trim() || null;
  const password = input.password?.trim() || "";

  if (!title) return { ok: false, error: { message: "Title is required." } };
  if (title.length > 200)
    return { ok: false, error: { message: "Title is too long." } };

  const source = detectVideoSource(sourceUrl);
  if (!source) {
    return {
      ok: false,
      error: {
        message:
          "Couldn't read that URL. Paste a direct video file (mp4/webm) or a YouTube / Vimeo / Loom link.",
      },
    };
  }

  const passwordHash = password ? await bcrypt.hash(password, 10) : null;

  // Generate a unique slug. Collisions are vanishingly rare at 8 chars,
  // but we retry a few times just in case.
  let slug = generateSlug();
  for (let i = 0; i < 4; i++) {
    const existing = await findVideoBySlug(slug);
    if (!existing) break;
    slug = generateSlug();
  }

  const row = await insertVideo({
    userId: user.id,
    slug,
    title,
    description,
    sourceUrl,
    sourceType: source.type,
    embedUrl: source.kind === "embed" ? source.playableUrl : null,
    passwordHash,
    isPublic: true,
  });

  revalidatePath("/dashboard/videos");
  return { ok: true, data: { id: row.id, slug: row.slug } };
}

export async function updateVideoAction(input: {
  id: string;
  title?: string;
  description?: string;
  /** "" means clear password; null/undefined means leave unchanged. */
  password?: string | null;
  isPublic?: boolean;
}): Promise<UpdateVideoState> {
  const user = await requireUser();

  const existing = await findVideo(user.id, input.id);
  if (!existing) return { ok: false, error: { message: "Not found." } };

  let passwordHash: string | null | undefined;
  if (input.password === null || input.password === "") {
    passwordHash = null;
  } else if (typeof input.password === "string") {
    passwordHash = await bcrypt.hash(input.password, 10);
  }

  await updateVideo({
    userId: user.id,
    videoId: input.id,
    title: input.title?.trim(),
    description:
      input.description !== undefined ? input.description.trim() || null : undefined,
    passwordHash,
    isPublic: input.isPublic,
  });

  revalidatePath(`/dashboard/videos/${input.id}`);
  revalidatePath("/dashboard/videos");
  return { ok: true };
}

export async function deleteVideoAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: { message: string } }> {
  const user = await requireUser();
  const removed = await deleteVideo(user.id, id);
  if (!removed) return { ok: false, error: { message: "Not found." } };
  revalidatePath("/dashboard/videos");
  return { ok: true };
}

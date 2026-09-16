import "server-only";

import { randomUUID } from "node:crypto";

import {
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

/**
 * Cloudflare R2 — where task screenshots live.
 *
 * R2 speaks the S3 API, so this is the standard S3 client pointed at the
 * account endpoint. The bucket stays PRIVATE: nothing here ever mints a
 * public URL. Attachments reach the browser through an authenticated proxy
 * route, so a client's before/after screenshots cannot leak by URL guess.
 *
 * Every function tolerates missing configuration and says so, rather than
 * throwing at import time — the rest of the Client Tracker has to keep
 * working on a deployment that has not set R2 up yet.
 */

export const R2_ENV_KEYS = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
] as const;

export function isR2Configured(): boolean {
  return R2_ENV_KEYS.every((k) => Boolean(process.env[k]));
}

/** Names the env vars that are still missing, for a useful error message. */
export function missingR2Keys(): string[] {
  return R2_ENV_KEYS.filter((k) => !process.env[k]);
}

let cached: S3Client | null = null;

function client(): S3Client {
  if (cached) return cached;
  if (!isR2Configured()) {
    throw new Error(
      `R2 is not configured. Set ${missingR2Keys().join(", ")} in apps/web/.env.`,
    );
  }
  cached = new S3Client({
    // R2 has no regions, but the SDK requires one.
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  return cached;
}

function bucket(): string {
  return process.env.R2_BUCKET!;
}

const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "application/pdf": "pdf",
};

export const ALLOWED_ATTACHMENT_TYPES = Object.keys(EXT_BY_TYPE);

/** 10 MB — a generous full-page screenshot, small enough to proxy safely. */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

/**
 * Object key for a task attachment.
 *
 * Prefixed by user then task so the bucket stays browsable and a whole
 * task's files can be listed or removed by prefix. The random segment means
 * two uploads of `screenshot.png` never collide.
 */
export function buildTaskAttachmentKey(
  userId: string,
  taskId: string,
  contentType: string,
): string {
  const ext = EXT_BY_TYPE[contentType] ?? "bin";
  return `tasks/${userId}/${taskId}/${randomUUID()}.${ext}`;
}

export async function putObject(
  key: string,
  body: Uint8Array,
  contentType: string,
): Promise<void> {
  await client().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export type FetchedObject = {
  body: Uint8Array;
  contentType: string;
};

/** Read an object back. Returns null when the key is gone from the bucket. */
export async function getObject(key: string): Promise<FetchedObject | null> {
  try {
    const res = await client().send(
      new GetObjectCommand({ Bucket: bucket(), Key: key }),
    );
    if (!res.Body) return null;
    const bytes = await res.Body.transformToByteArray();
    return {
      body: bytes,
      contentType: res.ContentType ?? "application/octet-stream",
    };
  } catch (err) {
    const name = (err as { name?: string })?.name;
    if (name === "NoSuchKey" || name === "NotFound") return null;
    throw err;
  }
}

/**
 * Remove objects. Best-effort by design: the database row is the record of
 * truth, and a key left behind in the bucket is cheaper than a delete that
 * fails halfway and leaves a row pointing at nothing.
 */
export async function deleteObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  if (!isR2Configured()) return;
  try {
    await client().send(
      new DeleteObjectsCommand({
        Bucket: bucket(),
        Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
      }),
    );
  } catch {
    // Swallowed on purpose — see the note above. The row is already gone.
  }
}

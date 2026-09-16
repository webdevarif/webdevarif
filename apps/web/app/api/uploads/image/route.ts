import { requireUser } from "@/lib/auth/session";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_ATTACHMENT_BYTES,
  buildEditorImageKey,
  getObject,
  isR2Configured,
  missingR2Keys,
  ownsEditorKey,
  putObject,
} from "@/lib/storage/r2";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Images pasted or dropped into a task note.
 *
 * Unlike the before/after screenshots these get no database row. The editor
 * is often open on a task that does not exist yet — you are still typing the
 * title — so there is no task id to hang a row off. Instead the object key
 * carries the owner (`editor/<userId>/<uuid>.png`) and GET below refuses any
 * key that is not under the caller's own prefix. The key *is* the ACL.
 *
 * That also means an image removed from the note leaves its object behind.
 * That is deliberate: undo should still show the picture, and an orphaned
 * object costs a fraction of a cent.
 */

function bad(message: string, status: number): Response {
  return Response.json({ ok: false, error: message }, { status });
}

export async function POST(req: Request): Promise<Response> {
  const user = await requireUser();

  if (!isR2Configured()) {
    return bad(
      `Image storage is not configured. Set ${missingR2Keys().join(", ")} and try again.`,
      503,
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return bad("Expected a multipart form upload.", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) return bad("No image was sent.", 400);
  if (file.size === 0) return bad("That image is empty.", 400);

  if (file.size > MAX_ATTACHMENT_BYTES) {
    return bad(
      `That image is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_ATTACHMENT_BYTES / 1024 / 1024} MB.`,
      413,
    );
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return bad(
      `${file.type || "That file"} is not an image we can embed. Allowed: ${ALLOWED_IMAGE_TYPES.join(", ")}.`,
      415,
    );
  }

  const key = buildEditorImageKey(user.id, file.type);

  try {
    await putObject(key, new Uint8Array(await file.arrayBuffer()), file.type);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed.";
    return bad(`Could not store the image: ${msg}`, 502);
  }

  // The editor writes this straight into the note's `src`, and
  // `safeImageSrc` in lib/rich-text/doc.ts allows exactly this shape.
  return Response.json(
    { ok: true, url: `/api/uploads/image?key=${encodeURIComponent(key)}` },
    { status: 201 },
  );
}

export async function GET(req: Request): Promise<Response> {
  const user = await requireUser();

  const key = new URL(req.url).searchParams.get("key");
  if (!key) return bad("key is required.", 400);

  // Checked against the caller's own id, so the worst a guessed key can do
  // is fetch something you already own.
  if (!ownsEditorKey(user.id, key)) return bad("Not found.", 404);

  let object;
  try {
    object = await getObject(key);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "storage read failed";
    return bad(`Could not read the image: ${msg}`, 502);
  }
  if (!object) return bad("That image is no longer in storage.", 410);

  return new Response(new Uint8Array(object.body), {
    status: 200,
    headers: {
      "Content-Type": object.contentType,
      "Content-Length": String(object.body.length),
      // Keyed by a uuid that is never reused, so it can cache hard — but
      // `private`, so no shared CDN holds a copy of a client's screenshot.
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

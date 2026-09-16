import {
  addTaskAttachment,
  deleteTaskAttachment,
  findTask,
  listTaskAttachments,
} from "@kit/database";

import { requireUser } from "@/lib/auth/session";
import { isAttachmentKind } from "@/lib/clients/money";
import {
  ALLOWED_ATTACHMENT_TYPES,
  MAX_ATTACHMENT_BYTES,
  buildTaskAttachmentKey,
  deleteObjects,
  isR2Configured,
  missingR2Keys,
  putObject,
} from "@/lib/storage/r2";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Upload and remove task attachments — the before/after screenshots.
 *
 * Session auth only. These are internal working files, not something the
 * public API or an MCP agent should be pushing bytes into.
 *
 * The bytes go to R2 first and the row is written second. That order means a
 * failed upload leaves an orphaned object (cheap, invisible) rather than a
 * database row pointing at a key that was never stored (visible, broken).
 */

function bad(message: string, status: number): Response {
  return Response.json({ ok: false, error: message }, { status });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const user = await requireUser();
  const { id: taskId } = await params;

  if (!isR2Configured()) {
    return bad(
      `File storage is not configured. Set ${missingR2Keys().join(", ")} in apps/web/.env, then try again.`,
      503,
    );
  }

  const task = await findTask(user.id, taskId);
  if (!task) return bad("Task not found.", 404);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return bad("Expected a multipart form upload.", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) return bad("No file was sent.", 400);

  if (file.size === 0) return bad("That file is empty.", 400);
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return bad(
      `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_ATTACHMENT_BYTES / 1024 / 1024} MB.`,
      413,
    );
  }
  if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
    return bad(
      `${file.type || "That file type"} is not supported. Allowed: ${ALLOWED_ATTACHMENT_TYPES.join(", ")}.`,
      415,
    );
  }

  const rawKind = String(form.get("kind") ?? "reference");
  const kind = isAttachmentKind(rawKind) ? rawKind : "reference";
  const caption = String(form.get("caption") ?? "").trim() || null;

  const key = buildTaskAttachmentKey(user.id, taskId, file.type);
  const bytes = new Uint8Array(await file.arrayBuffer());

  try {
    await putObject(key, bytes, file.type);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed.";
    return bad(`Could not store the file: ${msg}`, 502);
  }

  // Append to the end of the task's existing attachments.
  const existing = await listTaskAttachments(taskId);

  const row = await addTaskAttachment({
    taskId,
    userId: user.id,
    kind,
    storageKey: key,
    fileName: file.name || null,
    contentType: file.type,
    sizeBytes: file.size,
    caption,
    position: existing.length,
  });

  return Response.json({ ok: true, attachment: row }, { status: 201 });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const user = await requireUser();
  const { id: taskId } = await params;

  const attachmentId = new URL(req.url).searchParams.get("attachmentId");
  if (!attachmentId) return bad("attachmentId is required.", 400);

  // Scoped to the user, so this can only ever remove your own file.
  const row = await deleteTaskAttachment(user.id, attachmentId);
  if (!row) return bad("Attachment not found.", 404);
  if (row.taskId !== taskId) return bad("Attachment is not on that task.", 400);

  await deleteObjects([row.storageKey]);
  return Response.json({ ok: true });
}

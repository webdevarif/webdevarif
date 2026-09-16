"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import type { TaskAttachmentRow } from "@kit/database";

import { ATTACHMENT_KINDS, type AttachmentKind } from "@/lib/clients/money";

/**
 * Screenshots on a task — the before/after proof.
 *
 * Images are rendered through `/api/attachments/<id>`, an authenticated
 * proxy, so the R2 bucket stays private and these never become public URLs.
 *
 * Before and after are shown as a pair when either exists, because that is
 * the comparison you actually want to look at; anything else falls into a
 * plain reference strip underneath.
 */

const KIND_LABEL: Record<AttachmentKind, string> = {
  before: "Before",
  after: "After",
  reference: "Reference",
};

export function TaskAttachments({
  taskId,
  attachments,
  storageReady,
}: {
  taskId: string;
  attachments: TaskAttachmentRow[];
  storageReady: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<AttachmentKind>("before");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const before = attachments.filter((a) => a.kind === "before");
  const after = attachments.filter((a) => a.kind === "after");
  const refs = attachments.filter((a) => a.kind === "reference");

  async function upload(file: File) {
    setError(null);
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("kind", kind);

      const res = await fetch(`/api/tasks/${taskId}/attachments`, {
        method: "POST",
        body,
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? `Upload failed (${res.status}).`);
        return;
      }
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(attachmentId: string) {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(
        `/api/tasks/${taskId}/attachments?attachmentId=${attachmentId}`,
        { method: "DELETE" },
      );
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? `Could not remove it (${res.status}).`);
        return;
      }
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-border bg-background/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-label">Screenshots</span>

        {storageReady ? (
          <div className="flex items-center gap-2">
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as AttachmentKind)}
              disabled={busy}
              className="h-7 rounded-md border border-border bg-background px-2 text-xs"
              aria-label="Attachment type"
            >
              {ATTACHMENT_KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/avif,application/pdf"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
              }}
              className="max-w-52 text-xs file:mr-2 file:rounded-md file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs"
            />
          </div>
        ) : (
          <span className="text-comment text-xs">
            {`// set R2_* in .env to enable uploads`}
          </span>
        )}
      </div>

      {error ? (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {before.length > 0 || after.length > 0 ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <ShotColumn
            label="Before"
            shots={before}
            onRemove={remove}
            busy={busy}
          />
          <ShotColumn
            label="After"
            shots={after}
            onRemove={remove}
            busy={busy}
          />
        </div>
      ) : null}

      {refs.length > 0 ? (
        <div className="mt-3">
          <div className="text-label mb-1.5">Reference</div>
          <div className="flex flex-wrap gap-2">
            {refs.map((a) => (
              <Shot key={a.id} shot={a} onRemove={remove} busy={busy} small />
            ))}
          </div>
        </div>
      ) : null}

      {attachments.length === 0 ? (
        <p className="text-comment mt-2 text-xs">{`// no screenshots yet`}</p>
      ) : null}
    </div>
  );
}

function ShotColumn({
  label,
  shots,
  onRemove,
  busy,
}: {
  label: string;
  shots: TaskAttachmentRow[];
  onRemove: (id: string) => void;
  busy: boolean;
}) {
  return (
    <div>
      <div className="text-label mb-1.5">{label}</div>
      {shots.length === 0 ? (
        <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-border">
          <span className="text-comment text-xs">{`// none`}</span>
        </div>
      ) : (
        <div className="space-y-2">
          {shots.map((a) => (
            <Shot key={a.id} shot={a} onRemove={onRemove} busy={busy} />
          ))}
        </div>
      )}
    </div>
  );
}

function Shot({
  shot,
  onRemove,
  busy,
  small,
}: {
  shot: TaskAttachmentRow;
  onRemove: (id: string) => void;
  busy: boolean;
  small?: boolean;
}) {
  const src = `/api/attachments/${shot.id}`;
  const isPdf = shot.contentType === "application/pdf";

  return (
    <figure className="group relative overflow-hidden rounded-md border border-border">
      <a href={src} target="_blank" rel="noopener noreferrer">
        {isPdf ? (
          <div
            className={`flex items-center justify-center bg-muted ${small ? "size-20" : "h-28"}`}
          >
            <span className="text-xs font-medium">PDF</span>
          </div>
        ) : (
          // Plain <img>: these are private, proxied, arbitrary-sized uploads,
          // so next/image optimisation buys nothing here.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={shot.caption ?? shot.fileName ?? "screenshot"}
            className={
              small
                ? "size-20 object-cover"
                : "h-28 w-full bg-muted object-cover"
            }
            loading="lazy"
          />
        )}
      </a>

      <button
        type="button"
        disabled={busy}
        onClick={() => onRemove(shot.id)}
        className="absolute top-1 right-1 rounded bg-background/90 px-1.5 py-0.5 text-[0.65rem] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
        aria-label="Remove attachment"
      >
        remove
      </button>

      {shot.caption ? (
        <figcaption className="truncate px-2 py-1 text-[0.65rem] text-muted-foreground">
          {shot.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

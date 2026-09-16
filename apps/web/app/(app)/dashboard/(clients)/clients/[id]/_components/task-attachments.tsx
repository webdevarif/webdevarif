"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import type { TaskAttachmentRow } from "@kit/database";
import { PaperclipIcon, TrashIcon, UploadIcon } from "@kit/ui/icons";

import { ATTACHMENT_KINDS, type AttachmentKind } from "@/lib/clients/money";

/**
 * Screenshots on a task — the before/after proof.
 *
 * Images are rendered through `/api/attachments/<id>`, an authenticated
 * proxy, so the R2 bucket stays private and these never become public URLs.
 *
 * Before and after are shown as a pair whenever either exists, because that
 * comparison is the whole point; anything else falls into a reference strip
 * underneath.
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
  const [dragging, setDragging] = useState(false);
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
    <div
      onDragOver={(e) => {
        if (!storageReady) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        if (!storageReady) return;
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) void upload(file);
      }}
      className={`rounded-xl border bg-[var(--card-muted)]/60 p-3.5 transition-colors ${
        dragging ? "border-primary bg-primary/5" : "border-border"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-label flex items-center gap-1.5">
          <PaperclipIcon className="size-3.5" />
          Screenshots
        </span>

        {storageReady ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
              {ATTACHMENT_KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  aria-pressed={kind === k}
                  className={`rounded-md px-2 py-1 font-mono text-2xs tracking-wide transition-colors ${
                    kind === k
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {KIND_LABEL[k]}
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
            >
              <UploadIcon className="size-3.5" />
              {busy ? "Uploading…" : "Upload"}
            </button>

            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/avif,application/pdf"
              hidden
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
              }}
            />
          </div>
        ) : (
          <span className="text-comment">{`// set R2_* in .env to enable uploads`}</span>
        )}
      </div>

      {error ? (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {before.length > 0 || after.length > 0 ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <ShotColumn label="Before" shots={before} onRemove={remove} busy={busy} />
          <ShotColumn label="After" shots={after} onRemove={remove} busy={busy} />
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
        <p className="text-comment mt-2">
          {storageReady
            ? `// nothing yet — pick a slot, then upload or drop a file here`
            : `// nothing yet`}
        </p>
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
        <div className="grid h-28 place-items-center rounded-lg border border-dashed border-border">
          <span className="text-comment">{`// none`}</span>
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
    <figure className="group relative overflow-hidden rounded-lg border border-border bg-background">
      <a href={src} target="_blank" rel="noopener noreferrer">
        {isPdf ? (
          <div
            className={`grid place-items-center bg-muted ${small ? "size-20" : "h-32"}`}
          >
            <span className="font-mono text-xs font-medium">PDF</span>
          </div>
        ) : (
          // Plain <img>: these are private, proxied, arbitrary-sized uploads,
          // so next/image optimisation buys nothing here.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={shot.caption ?? shot.fileName ?? "screenshot"}
            className={
              small ? "size-20 object-cover" : "h-32 w-full bg-muted object-cover"
            }
            loading="lazy"
          />
        )}
      </a>

      <button
        type="button"
        disabled={busy}
        onClick={() => onRemove(shot.id)}
        className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-md bg-background/90 text-muted-foreground opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100"
        aria-label="Remove attachment"
      >
        <TrashIcon className="size-3.5" />
      </button>

      {shot.caption ? (
        <figcaption className="text-meta truncate px-2 py-1">
          {shot.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

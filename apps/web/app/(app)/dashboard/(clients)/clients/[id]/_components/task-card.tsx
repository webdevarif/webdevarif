"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { ClientRow, TaskAttachmentRow, TaskRow } from "@kit/database";
import { Button } from "@kit/ui/button";
import {
  CancelIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  EditIcon,
  ExternalLinkIcon,
  ImageIcon,
  PlayGlyphIcon,
  TrashIcon,
} from "@kit/ui/icons";

import { RichEditor } from "@/components/rich-text/rich-editor";
import { RichText } from "@/components/rich-text/rich-text";
import {
  WORK_CATEGORIES,
  centsToInput,
  formatMoney,
} from "@/lib/clients/money";
import { countImages, parseDoc } from "@/lib/rich-text/doc";

import {
  deleteTaskAction,
  setTaskStatusAction,
  updateTaskAction,
} from "../../_lib/actions";
import {
  Chip,
  Field,
  StatusPill,
  TaskMeta,
  fieldClass,
  selectClass,
  toneFor,
} from "./shared";
import { TaskAttachments } from "./task-attachments";

export type TaskWithFiles = TaskRow & { attachments: TaskAttachmentRow[] };

/**
 * One task.
 *
 * Collapsed it is a single scannable line — what, how much, where it is.
 * Everything else sits behind the chevron, because a client with forty tasks
 * should still fit on a screen.
 *
 * A task already on an invoice is frozen: the server refuses edits and
 * status changes, so this hides those controls rather than offering an
 * action that can only fail.
 */

export function TaskCard({
  client,
  task,
  storageReady,
  defaultOpen = false,
  leading,
}: {
  client: ClientRow;
  task: TaskWithFiles;
  storageReady: boolean;
  defaultOpen?: boolean;
  /** Slot for the billing checkbox, so selection lives with the list. */
  leading?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [editing, setEditing] = useState(false);
  const tone = toneFor(task.status);

  const locked = task.billingStatus !== "unbilled";
  const noteImages =
    countImages(parseDoc(task.description)) + countImages(parseDoc(task.report));
  const fileCount = task.attachments.length + noteImages;
  const hasBody = Boolean(
    task.description || task.report || task.attachments.length,
  );

  return (
    <article className="relative overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-border/80">
      {/* Status rail — colour before words, readable at a glance. */}
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-0.5 ${tone.rail}`}
      />

      <div className="flex items-start gap-3 py-3.5 pr-4 pl-5">
        {leading ? <div className="pt-0.5">{leading}</div> : null}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{task.title}</span>
            <StatusPill status={task.status} />
            <Chip>{task.category}</Chip>
            {task.source === "mcp" ? (
              <Chip tone="primary">via claude</Chip>
            ) : null}
            {locked ? <Chip tone="muted">{task.billingStatus}</Chip> : null}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <TaskMeta task={task} />
            {fileCount > 0 ? (
              <span className="text-meta inline-flex items-center gap-1">
                <ImageIcon className="size-3" />
                {fileCount}
              </span>
            ) : null}
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-3">
          <div className="num-display text-right text-sm font-semibold">
            {formatMoney(task.amountCents, task.currency)}
          </div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Collapse" : "Expand"}
            className="grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronDownIcon
              className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-border/70 px-5 py-4">
          {editing ? (
            <EditTaskForm
              client={client}
              task={task}
              storageReady={storageReady}
              onDone={() => setEditing(false)}
            />
          ) : (
            <>
              {hasBody ? (
                <div className="space-y-4">
                  <NoteBlock
                    label="What the client asked for"
                    value={task.description}
                  />
                  <NoteBlock label="What I did" value={task.report} />
                  <TaskAttachments
                    taskId={task.id}
                    attachments={task.attachments}
                    storageReady={storageReady}
                  />
                </div>
              ) : (
                <p className="text-comment">
                  {`// nothing written down yet — Edit to add the details`}
                </p>
              )}

              {task.externalRef ? (
                <ReferenceLink value={task.externalRef} />
              ) : null}

              <TaskActions
                client={client}
                task={task}
                locked={locked}
                onEdit={() => setEditing(true)}
              />
            </>
          )}
        </div>
      ) : null}
    </article>
  );
}

function NoteBlock({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-label mb-1.5">{label}</div>
      <RichText value={value} />
    </div>
  );
}

/** The reference is free text — only linkify it when it is really a URL. */
function ReferenceLink({ value }: { value: string }) {
  const href = /^https?:\/\//i.test(value.trim()) ? value.trim() : null;
  if (!href) {
    return <p className="text-meta mt-3">ref: {value}</p>;
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-meta mt-3 inline-flex items-center gap-1 hover:text-foreground"
    >
      <ExternalLinkIcon className="size-3" />
      {value}
    </a>
  );
}

// ─── Actions ──────────────────────────────────────────────────────────

function TaskActions({
  client,
  task,
  locked,
  onEdit,
}: {
  client: ClientRow;
  task: TaskRow;
  locked: boolean;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const move = (status: string) => {
    setError(null);
    startTransition(async () => {
      const result = await setTaskStatusAction(client.id, task.id, status);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const remove = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteTaskAction(client.id, task.id);
      if ("error" in result && result.error) {
        setError(result.error);
        setConfirming(false);
        return;
      }
      router.refresh();
    });
  };

  if (locked) {
    return (
      <p className="text-comment mt-4 border-t border-border/70 pt-3">
        {`// on an invoice — void it to edit or re-bill this task`}
      </p>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
      {task.status === "requested" ? (
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => move("in_progress")}
        >
          <PlayGlyphIcon className="size-3.5" />
          Start
        </Button>
      ) : null}

      {task.status === "done" ? (
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => move("in_progress")}
        >
          Re-open
        </Button>
      ) : (
        <Button size="sm" disabled={isPending} onClick={() => move("done")}>
          <CheckCircleIcon className="size-3.5" />
          {isPending ? "Saving…" : "Mark done"}
        </Button>
      )}

      <Button size="sm" variant="ghost" disabled={isPending} onClick={onEdit}>
        <EditIcon className="size-3.5" />
        Edit
      </Button>

      {task.status !== "cancelled" ? (
        <Button
          size="sm"
          variant="ghost"
          className="text-muted-foreground"
          disabled={isPending}
          onClick={() => move("cancelled")}
        >
          <CancelIcon className="size-3.5" />
          Cancel
        </Button>
      ) : null}

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {error ? (
          <span className="text-xs text-destructive" role="alert">
            {error}
          </span>
        ) : null}

        {confirming ? (
          <>
            <span className="text-comment">{`// delete for good?`}</span>
            <Button
              size="sm"
              variant="destructive"
              disabled={isPending}
              onClick={remove}
            >
              {isPending ? "Removing…" : "Yes, remove"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={isPending}
              onClick={() => setConfirming(false)}
            >
              Keep
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-destructive"
            disabled={isPending}
            onClick={() => setConfirming(true)}
          >
            <TrashIcon className="size-3.5" />
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Edit ─────────────────────────────────────────────────────────────

function EditTaskForm({
  client,
  task,
  storageReady,
  onDone,
}: {
  client: ClientRow;
  task: TaskRow;
  storageReady: boolean;
  onDone: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await updateTaskAction(client.id, task.id, formData);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      onDone();
      router.refresh();
    });
  };

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field
          label="Task"
          htmlFor={`title-${task.id}`}
          className="sm:col-span-2"
        >
          <input
            id={`title-${task.id}`}
            name="title"
            defaultValue={task.title}
            required
            disabled={isPending}
            className={fieldClass}
          />
        </Field>

        <Field label={`Price · ${task.currency}`} htmlFor={`amount-${task.id}`}>
          <input
            id={`amount-${task.id}`}
            name="amount"
            inputMode="decimal"
            defaultValue={centsToInput(task.amountCents)}
            disabled={isPending}
            className={`${fieldClass} num-display`}
          />
        </Field>

        <Field label="Client asked on" htmlFor={`requestedAt-${task.id}`}>
          <input
            id={`requestedAt-${task.id}`}
            name="requestedAt"
            type="date"
            defaultValue={dateInput(task.requestedAt)}
            disabled={isPending}
            className={fieldClass}
          />
        </Field>

        <Field label="Category" htmlFor={`category-${task.id}`}>
          <select
            id={`category-${task.id}`}
            name="category"
            defaultValue={task.category}
            disabled={isPending}
            className={selectClass}
          >
            {WORK_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Tags" htmlFor={`tags-${task.id}`}>
          <input
            id={`tags-${task.id}`}
            name="tags"
            defaultValue={task.tags.join(", ")}
            placeholder="shopify, liquid"
            disabled={isPending}
            className={fieldClass}
          />
        </Field>

        <Field
          label="Reference"
          htmlFor={`externalRef-${task.id}`}
          className="sm:col-span-2"
        >
          <input
            id={`externalRef-${task.id}`}
            name="externalRef"
            defaultValue={task.externalRef ?? ""}
            placeholder="PR link or commit"
            disabled={isPending}
            className={fieldClass}
          />
        </Field>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RichEditor
          name="description"
          label="What the client asked for"
          hint="their words"
          defaultValue={task.description}
          placeholder="Paste what they sent."
          disabled={isPending}
          storageReady={storageReady}
          minHeight="min-h-36"
        />
        <RichEditor
          name="report"
          label="What I did"
          hint="images, links, code"
          defaultValue={task.report}
          placeholder="Approach, files touched, before/after shots."
          disabled={isPending}
          storageReady={storageReady}
          minHeight="min-h-36"
        />
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Saving…" : "Save changes"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={isPending}
          onClick={onDone}
        >
          Cancel
        </Button>
        <span className="text-comment ml-auto">{client.currency}</span>
      </div>
    </form>
  );
}

/** `<input type="date">` wants exactly `YYYY-MM-DD`. */
function dateInput(value: Date | string | null): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

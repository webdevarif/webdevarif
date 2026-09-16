"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";

import type { ClientRow, TaskAttachmentRow, TaskRow } from "@kit/database";
import { Badge } from "@kit/ui/badge";
import { Button } from "@kit/ui/button";
import { Input } from "@kit/ui/input";
import { Label } from "@kit/ui/label";

import {
  TASK_STATUS_LABEL,
  WORK_CATEGORIES,
  centsToInput,
  formatDocDate,
  formatMoney,
} from "@/lib/clients/money";

import {
  createInvoiceAction,
  createTaskAction,
  deleteTaskAction,
  setTaskStatusAction,
} from "../../_lib/actions";
import { TaskAttachments } from "./task-attachments";

/**
 * The client workspace: add a task, move it through its lifecycle, attach
 * before/after screenshots, then bill the finished ones.
 *
 * Tasks are grouped by what you would do with them next, not by raw status:
 * what is still open, what is finished and waiting to be billed, and what is
 * already settled. Only the middle group can go on an invoice.
 */

export type TaskWithFiles = TaskRow & { attachments: TaskAttachmentRow[] };

type Props = {
  client: ClientRow;
  tasks: TaskWithFiles[];
  billableCents: number;
  storageReady: boolean;
};

export function ClientWorkspace({
  client,
  tasks,
  billableCents,
  storageReady,
}: Props) {
  const open = tasks.filter(
    (t) => t.status === "requested" || t.status === "in_progress",
  );
  const billable = tasks.filter(
    (t) => t.status === "done" && t.billingStatus === "unbilled",
  );
  const settled = tasks.filter(
    (t) =>
      t.status === "cancelled" ||
      (t.status === "done" && t.billingStatus !== "unbilled"),
  );

  return (
    <>
      <CreateTaskForm client={client} />
      <OpenTasks client={client} tasks={open} storageReady={storageReady} />
      <BillablePanel
        client={client}
        tasks={billable}
        billableCents={billableCents}
        storageReady={storageReady}
      />
      <SettledTasks client={client} tasks={settled} />
    </>
  );
}

function StatusBadge({ task }: { task: TaskRow }) {
  const variant =
    task.status === "done"
      ? "success"
      : task.status === "in_progress"
        ? "info"
        : task.status === "cancelled"
          ? "error"
          : "warning";
  return (
    <Badge variant={variant}>
      {TASK_STATUS_LABEL[task.status as keyof typeof TASK_STATUS_LABEL] ??
        task.status}
    </Badge>
  );
}

/** "asked 12 Sep · done 16 Sep" — whichever dates exist. */
function TaskDates({ task }: { task: TaskRow }) {
  const bits = [
    task.requestedAt ? `asked ${formatDocDate(task.requestedAt)}` : null,
    task.completedAt ? `done ${formatDocDate(task.completedAt)}` : null,
  ].filter(Boolean);
  return (
    <p className="text-comment mt-1 text-xs">
      {bits.join(" · ") || formatDocDate(task.createdAt)}
      {task.tags.length ? ` · ${task.tags.join(", ")}` : ""}
    </p>
  );
}

// ─── Add a task ───────────────────────────────────────────────────────

function CreateTaskForm({ client }: { client: ClientRow }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    setSaved(null);
    startTransition(async () => {
      const result = await createTaskAction(client.id, formData);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      if ("task" in result && result.task) {
        setSaved(result.task.title);
        formRef.current?.reset();
        setShowDetail(false);
        setAlreadyDone(false);
      }
    });
  };

  return (
    <section className="mt-10 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Add a task</h2>
          <p className="text-comment mt-0.5 text-sm">
            {`// what the client asked for, and what it costs`}
          </p>
        </div>
        <span className="text-comment text-xs">
          {`// Claude can do this over MCP with create_task`}
        </span>
      </div>

      <form ref={formRef} action={handleSubmit} className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_140px_150px]">
          <div className="space-y-2">
            <Label htmlFor="title">Task *</Label>
            <Input
              id="title"
              name="title"
              placeholder="Fix variant swatch bug on PDP"
              required
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Price ({client.currency}) *</Label>
            <Input
              id="amount"
              name="amount"
              placeholder="50"
              inputMode="decimal"
              defaultValue={centsToInput(client.defaultAmountCents)}
              required
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="requestedAt">Client asked on</Label>
            <Input
              id="requestedAt"
              name="requestedAt"
              type="date"
              defaultValue={today}
              disabled={isPending}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={alreadyDone}
            onChange={(e) => setAlreadyDone(e.target.checked)}
            disabled={isPending}
            className="size-4 accent-primary"
          />
          Already finished — mark it done so it can be billed
        </label>
        {alreadyDone ? <input type="hidden" name="status" value="done" /> : null}
        {alreadyDone ? (
          <div className="max-w-52 space-y-2">
            <Label htmlFor="completedAt">Completed on</Label>
            <Input
              id="completedAt"
              name="completedAt"
              type="date"
              defaultValue={today}
              disabled={isPending}
            />
          </div>
        ) : null}

        {showDetail ? (
          <div className="space-y-4 border-t border-border pt-4">
            <div className="space-y-2">
              <Label htmlFor="description">What the client asked for</Label>
              <textarea
                id="description"
                name="description"
                rows={3}
                placeholder="Their words, pasted from wherever they sent it."
                disabled={isPending}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="report">What you did</Label>
              <textarea
                id="report"
                name="report"
                rows={4}
                placeholder="Approach, files touched, anything worth showing the client later. Markdown is fine."
                disabled={isPending}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  name="category"
                  defaultValue="development"
                  disabled={isPending}
                  className="h-8 w-full rounded-md border border-border bg-background px-2.5 text-sm"
                >
                  {WORK_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  name="tags"
                  placeholder="shopify, liquid"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="externalRef">Reference</Label>
                <Input
                  id="externalRef"
                  name="externalRef"
                  placeholder="PR link or commit"
                  disabled={isPending}
                />
              </div>
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p className="text-sm text-success" role="status">
            Added “{saved}”.
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" size="lg" disabled={isPending}>
            {isPending ? "Saving…" : "Add task"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => setShowDetail((v) => !v)}
            disabled={isPending}
          >
            {showDetail ? "Hide details" : "Add details & report"}
          </Button>
        </div>
      </form>
    </section>
  );
}

// ─── Open tasks ───────────────────────────────────────────────────────

function OpenTasks({
  client,
  tasks,
  storageReady,
}: {
  client: ClientRow;
  tasks: TaskWithFiles[];
  storageReady: boolean;
}) {
  if (tasks.length === 0) return null;
  const total = tasks.reduce((sum, t) => sum + t.amountCents, 0);

  return (
    <section className="mt-8">
      <div className="mb-3">
        <h2 className="text-xl font-semibold">Open</h2>
        <p className="text-comment mt-1">
          {`// ${tasks.length} task${tasks.length === 1 ? "" : "s"} in flight · ${formatMoney(total, client.currency)} when finished`}
        </p>
      </div>

      <div className="space-y-2">
        {tasks.map((task) => (
          <article
            key={task.id}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{task.title}</span>
                  <StatusBadge task={task} />
                  <Badge variant="neutral">{task.category}</Badge>
                  {task.source === "mcp" ? (
                    <Badge variant="primary">via claude</Badge>
                  ) : null}
                </div>
                {task.description ? (
                  <p className="text-comment mt-1 whitespace-pre-wrap text-sm">
                    {task.description}
                  </p>
                ) : null}
                <TaskDates task={task} />
              </div>
              <div className="shrink-0 text-right">
                <div className="num-display font-semibold">
                  {formatMoney(task.amountCents, task.currency)}
                </div>
              </div>
            </div>

            <StatusControls client={client} task={task} />
            <TaskAttachments
              taskId={task.id}
              attachments={task.attachments}
              storageReady={storageReady}
            />
          </article>
        ))}
      </div>
    </section>
  );
}

function StatusControls({
  client,
  task,
}: {
  client: ClientRow;
  task: TaskRow;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {task.status === "requested" ? (
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => move("in_progress")}
        >
          Start
        </Button>
      ) : null}
      {task.status !== "done" ? (
        <Button size="sm" disabled={isPending} onClick={() => move("done")}>
          {isPending ? "Saving…" : "Mark done"}
        </Button>
      ) : null}
      {task.status !== "cancelled" ? (
        <Button
          size="sm"
          variant="ghost"
          className="text-muted-foreground"
          disabled={isPending}
          onClick={() => move("cancelled")}
        >
          Cancel
        </Button>
      ) : null}
      <DeleteTaskButton clientId={client.id} taskId={task.id} />
      {error ? (
        <span className="text-xs text-destructive" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

function DeleteTaskButton({
  clientId,
  taskId,
}: {
  clientId: string;
  taskId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await deleteTaskAction(clientId, taskId);
            if ("error" in result && result.error) {
              setError(result.error);
              return;
            }
            router.refresh();
          });
        }}
        className="text-xs text-muted-foreground hover:text-destructive"
      >
        {isPending ? "removing…" : "remove"}
      </button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </>
  );
}

// ─── Ready to bill ────────────────────────────────────────────────────

function BillablePanel({
  client,
  tasks,
  billableCents,
  storageReady,
}: {
  client: ClientRow;
  tasks: TaskWithFiles[];
  billableCents: number;
  storageReady: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(tasks.map((t) => t.id)),
  );
  const [showOptions, setShowOptions] = useState(false);
  const [mode, setMode] = useState<"charge" | "discount">("charge");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const selectedCents = useMemo(
    () =>
      tasks
        .filter((t) => selected.has(t.id))
        .reduce((sum, t) => sum + t.amountCents, 0),
    [tasks, selected],
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = (formData: FormData) => {
    setError(null);
    // Only the checked rows are billed. Sending them explicitly is what makes
    // partial billing possible.
    for (const id of selected) formData.append("taskIds", id);
    // Whichever discount box is hidden must not be submitted, or it would
    // silently win over the one you actually typed in.
    formData.delete(mode === "charge" ? "discount" : "chargeAmount");

    startTransition(async () => {
      const result = await createInvoiceAction(client.id, formData);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      if ("invoice" in result && result.invoice) {
        router.push(`/dashboard/clients/invoices/${result.invoice.id}`);
      }
    });
  };

  if (tasks.length === 0) {
    return (
      <section className="mt-8 rounded-xl border border-dashed border-border p-8 text-center">
        <p className="font-medium">Nothing ready to bill</p>
        <p className="text-comment mt-1">
          {`// mark a task done and it shows up here`}
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Ready to bill</h2>
          <p className="text-comment mt-0.5 text-sm">
            {`// ${tasks.length} finished task${tasks.length === 1 ? "" : "s"} · ${formatMoney(billableCents, client.currency)} total`}
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setSelected(new Set(tasks.map((t) => t.id)))}
          >
            Select all
          </button>
          <span className="text-border">|</span>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </button>
        </div>
      </div>

      <ul className="mt-4 divide-y divide-border border-y border-border">
        {tasks.map((task) => (
          <li key={task.id} className="flex items-start gap-3 py-3">
            <input
              type="checkbox"
              checked={selected.has(task.id)}
              onChange={() => toggle(task.id)}
              className="mt-1 size-4 shrink-0 accent-primary"
              aria-label={`Include ${task.title}`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{task.title}</span>
                <Badge variant="neutral">{task.category}</Badge>
                {task.source === "mcp" ? (
                  <Badge variant="primary">via claude</Badge>
                ) : null}
              </div>
              {task.report ? (
                <p className="text-comment mt-1 line-clamp-2 whitespace-pre-wrap text-sm">
                  {task.report}
                </p>
              ) : null}
              <TaskDates task={task} />
              <TaskAttachments
                taskId={task.id}
                attachments={task.attachments}
                storageReady={storageReady}
              />
            </div>
            <div className="shrink-0 text-right">
              <div className="num-display font-semibold">
                {formatMoney(task.amountCents, task.currency)}
              </div>
              <DeleteTaskButton clientId={client.id} taskId={task.id} />
            </div>
          </li>
        ))}
      </ul>

      <form action={handleSubmit} className="mt-4 space-y-4">
        {showOptions ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Adjust by:</span>
              <Button
                type="button"
                size="sm"
                variant={mode === "charge" ? "secondary" : "ghost"}
                onClick={() => setMode("charge")}
              >
                Charge this amount
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "discount" ? "secondary" : "ghost"}
                onClick={() => setMode("discount")}
              >
                Discount
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {mode === "charge" ? (
                <div className="space-y-2">
                  <Label htmlFor="chargeAmount">
                    Charge ({client.currency})
                  </Label>
                  <Input
                    id="chargeAmount"
                    name="chargeAmount"
                    placeholder={centsToInput(selectedCents)}
                    inputMode="decimal"
                    disabled={isPending}
                  />
                  <p className="text-comment text-xs">
                    {`// discount is worked out for you`}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="discount">Discount ({client.currency})</Label>
                  <Input
                    id="discount"
                    name="discount"
                    placeholder="0"
                    inputMode="decimal"
                    disabled={isPending}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="tax">Tax ({client.currency})</Label>
                <Input
                  id="tax"
                  name="tax"
                  placeholder="0"
                  inputMode="decimal"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDays">Due in (days)</Label>
                <Input
                  id="dueDays"
                  name="dueDays"
                  type="number"
                  min={0}
                  placeholder="7"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2 sm:col-span-3">
                <Label htmlFor="invoiceNotes">Note on the invoice</Label>
                <Input
                  id="invoiceNotes"
                  name="notes"
                  placeholder="Thanks for the work this month."
                  disabled={isPending}
                />
              </div>
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            size="lg"
            disabled={isPending || selected.size === 0}
          >
            {isPending
              ? "Generating…"
              : `Generate invoice · ${formatMoney(selectedCents, client.currency)}`}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => setShowOptions((v) => !v)}
            disabled={isPending}
          >
            {showOptions ? "Hide options" : "Discount, tax & terms"}
          </Button>
          <span className="text-comment text-xs">
            {selected.size} of {tasks.length} selected
          </span>
        </div>
      </form>
    </section>
  );
}

// ─── Settled ──────────────────────────────────────────────────────────

function SettledTasks({
  client,
  tasks,
}: {
  client: ClientRow;
  tasks: TaskWithFiles[];
}) {
  const [expanded, setExpanded] = useState(false);
  if (tasks.length === 0) return null;

  const shown = expanded ? tasks : tasks.slice(0, 8);
  const total = tasks.reduce((sum, t) => sum + t.amountCents, 0);

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Settled</h2>
          <p className="text-comment mt-1">
            {`// ${tasks.length} task${tasks.length === 1 ? "" : "s"} · ${formatMoney(total, client.currency)} lifetime`}
          </p>
        </div>
        {tasks.length > 8 ? (
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Show less" : `Show all ${tasks.length}`}
          </button>
        ) : null}
      </div>

      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {shown.map((task) => (
          <li
            key={task.id}
            className="flex items-center justify-between gap-4 px-4 py-3"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate font-medium">{task.title}</span>
                <Badge
                  variant={
                    task.billingStatus === "paid"
                      ? "success"
                      : task.status === "cancelled"
                        ? "error"
                        : "info"
                  }
                >
                  {task.status === "cancelled"
                    ? "cancelled"
                    : task.billingStatus}
                </Badge>
                {task.attachments.length ? (
                  <Badge variant="neutral">
                    {task.attachments.length} file
                    {task.attachments.length === 1 ? "" : "s"}
                  </Badge>
                ) : null}
              </div>
              <TaskDates task={task} />
            </div>
            <div className="num-display shrink-0 text-sm font-medium">
              {formatMoney(task.amountCents, task.currency)}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

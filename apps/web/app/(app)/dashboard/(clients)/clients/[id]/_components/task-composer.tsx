"use client";

import { useRef, useState, useTransition } from "react";

import type { ClientRow } from "@kit/database";
import { Button } from "@kit/ui/button";
import { CheckCircleIcon, PlusIcon, SparklesIcon } from "@kit/ui/icons";

import { RichEditor } from "@/components/rich-text/rich-editor";
import { WORK_CATEGORIES, centsToInput } from "@/lib/clients/money";

import { createTaskAction } from "../../_lib/actions";
import { Field, Toggle, fieldClass, selectClass } from "./shared";

/**
 * Add a task.
 *
 * Capture is deliberately one line — title, price, Add — because most tasks
 * arrive mid-conversation, and anything longer means they get written down
 * somewhere else instead. Everything richer is one click away.
 */

export function TaskComposer({
  client,
  storageReady,
}: {
  client: ClientRow;
  storageReady: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);
  // Remounts the form after a save so the editors clear too — `form.reset()`
  // cannot reach into ProseMirror's own state.
  const [formKey, setFormKey] = useState(0);

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
        setAlreadyDone(false);
        setFormKey((k) => k + 1);
      }
    });
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-[var(--card-elevated)] to-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-primary/15 text-primary">
            <PlusIcon className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Add a task</h2>
            <p className="text-comment mt-0.5">
              {`// what they asked for, and what it costs`}
            </p>
          </div>
        </div>
        <span className="text-comment hidden items-center gap-1.5 sm:inline-flex">
          <SparklesIcon className="size-3.5" />
          {`create_task over MCP does this too`}
        </span>
      </header>

      <form
        key={formKey}
        ref={formRef}
        action={handleSubmit}
        className="px-5 py-4"
      >
        {/* Capture row — the only part you have to fill in. */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Task" htmlFor="title" className="min-w-0 flex-1">
            <input
              id="title"
              name="title"
              required
              disabled={isPending}
              placeholder="Fix variant swatch bug on PDP"
              className={`${fieldClass} h-11 text-base`}
            />
          </Field>

          <Field label={`Price · ${client.currency}`} htmlFor="amount">
            <div className="relative">
              <span className="text-meta pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">
                {currencySign(client.currency)}
              </span>
              <input
                id="amount"
                name="amount"
                required
                inputMode="decimal"
                disabled={isPending}
                defaultValue={centsToInput(client.defaultAmountCents)}
                placeholder="50"
                className={`${fieldClass} num-display h-11 w-full pl-7 text-base sm:w-36`}
              />
            </div>
          </Field>

          <Button type="submit" size="lg" className="h-11" disabled={isPending}>
            {isPending ? "Saving…" : "Add task"}
          </Button>
        </div>

        {/* Sits between capture and detail so the row above stays clean but
            the state is never hidden. */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Toggle
            checked={alreadyDone}
            onChange={setAlreadyDone}
            disabled={isPending}
            label="Already finished"
            note="marks it done so it can be billed straight away"
          />
          <button
            type="button"
            onClick={() => setShowDetail((v) => !v)}
            disabled={isPending}
            className="ml-auto inline-flex h-7 items-center rounded-lg border border-border bg-[var(--card-muted)] px-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
          >
            {showDetail ? "Hide details" : "Details, notes & report"}
          </button>
        </div>

        {alreadyDone ? <input type="hidden" name="status" value="done" /> : null}

        {showDetail || alreadyDone ? (
          <div className="mt-4 space-y-4 border-t border-border/70 pt-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Client asked on" htmlFor="requestedAt">
                <input
                  id="requestedAt"
                  name="requestedAt"
                  type="date"
                  defaultValue={today}
                  disabled={isPending}
                  className={fieldClass}
                />
              </Field>

              {alreadyDone ? (
                <Field label="Completed on" htmlFor="completedAt">
                  <input
                    id="completedAt"
                    name="completedAt"
                    type="date"
                    defaultValue={today}
                    disabled={isPending}
                    className={fieldClass}
                  />
                </Field>
              ) : null}

              {showDetail ? (
                <>
                  <Field label="Category" htmlFor="category">
                    <select
                      id="category"
                      name="category"
                      defaultValue="development"
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

                  <Field label="Tags" htmlFor="tags">
                    <input
                      id="tags"
                      name="tags"
                      placeholder="shopify, liquid"
                      disabled={isPending}
                      className={fieldClass}
                    />
                  </Field>

                  <Field label="Reference" htmlFor="externalRef">
                    <input
                      id="externalRef"
                      name="externalRef"
                      placeholder="PR link or commit"
                      disabled={isPending}
                      className={fieldClass}
                    />
                  </Field>
                </>
              ) : null}
            </div>

            {showDetail ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <RichEditor
                  name="description"
                  label="What the client asked for"
                  hint="their words"
                  placeholder="Paste what they sent — a message, a bug report, a screenshot."
                  disabled={isPending}
                  storageReady={storageReady}
                  minHeight="min-h-32"
                />
                <RichEditor
                  name="report"
                  label="What you did"
                  hint="images, links, code"
                  placeholder="Approach, files touched, anything worth showing them later."
                  disabled={isPending}
                  storageReady={storageReady}
                  minHeight="min-h-32"
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p
            className="mt-3 flex items-center gap-1.5 text-sm text-success"
            role="status"
          >
            <CheckCircleIcon className="size-4" />
            Added “{saved}”.
          </p>
        ) : null}
      </form>
    </section>
  );
}

/** Just the glyph — `formatMoney` still owns anything a client reads. */
function currencySign(currency: string): string {
  const signs: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    BDT: "৳",
    INR: "₹",
    AUD: "$",
    CAD: "$",
  };
  return signs[currency] ?? "";
}

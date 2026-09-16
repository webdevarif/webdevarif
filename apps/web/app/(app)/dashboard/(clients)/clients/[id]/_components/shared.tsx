import type { ReactNode } from "react";

import type { TaskRow } from "@kit/database";
import type { IconComponent } from "@kit/ui/icons";

import { TASK_STATUS_LABEL, formatDocDate } from "@/lib/clients/money";

/**
 * The small pieces the client workspace is built from.
 *
 * Status colour lives here and nowhere else: a task's state is read from a
 * card, a list row and a summary tile, and those three drifting apart is
 * what makes a dashboard feel sloppy.
 */

type StatusTone = {
  /** Text colour for the dot's label. */
  text: string;
  /** Background for the dot itself. */
  dot: string;
  /** Left rail on a card. */
  rail: string;
};

export const STATUS_TONE: Record<string, StatusTone> = {
  requested: {
    text: "text-warning",
    dot: "bg-warning",
    rail: "bg-warning/60",
  },
  in_progress: {
    text: "text-info",
    dot: "bg-info",
    rail: "bg-info/60",
  },
  done: {
    text: "text-success",
    dot: "bg-success",
    rail: "bg-success/60",
  },
  cancelled: {
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
    rail: "bg-border",
  },
};

export function toneFor(status: string): StatusTone {
  return STATUS_TONE[status] ?? STATUS_TONE.requested!;
}

/** Status as a dot plus a word — quieter than a filled badge on a dense list. */
export function StatusPill({ status }: { status: string }) {
  const tone = toneFor(status);
  const label =
    TASK_STATUS_LABEL[status as keyof typeof TASK_STATUS_LABEL] ?? status;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-[var(--card-elevated)] px-2 py-0.5 font-mono text-2xs tracking-wide ${tone.text}`}
    >
      <span className={`size-1.5 rounded-full ${tone.dot}`} aria-hidden />
      {label}
    </span>
  );
}

/** A neutral chip for category, tags and counts. */
export function Chip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "primary" | "muted";
}) {
  const styles =
    tone === "primary"
      ? "border-primary/30 bg-primary/10 text-primary"
      : tone === "muted"
        ? "border-transparent bg-muted text-muted-foreground"
        : "border-border bg-[var(--card-elevated)] text-muted-foreground";

  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-2xs tracking-wide ${styles}`}
    >
      {children}
    </span>
  );
}

/** "asked 12 Sep · done 16 Sep · shopify, liquid" — whichever parts exist. */
export function TaskMeta({ task }: { task: TaskRow }) {
  const bits = [
    task.requestedAt ? `asked ${formatDocDate(task.requestedAt)}` : null,
    task.startedAt && !task.completedAt
      ? `started ${formatDocDate(task.startedAt)}`
      : null,
    task.completedAt ? `done ${formatDocDate(task.completedAt)}` : null,
  ].filter(Boolean);

  return (
    <span className="text-meta">
      {bits.join(" · ") || formatDocDate(task.createdAt)}
      {task.tags.length ? ` · ${task.tags.join(", ")}` : ""}
    </span>
  );
}

/** Section title with the running commentary the rest of the app uses. */
export function SectionHeading({
  title,
  note,
  icon: Icon,
  action,
}: {
  title: string;
  note?: string;
  icon?: IconComponent;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-center gap-2.5">
        {Icon ? (
          <span className="grid size-8 place-items-center rounded-lg border border-border bg-[var(--card-elevated)] text-muted-foreground">
            <Icon className="size-4" />
          </span>
        ) : null}
        <div>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {note ? <p className="text-comment mt-0.5">{`// ${note}`}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

/**
 * Empty state as a single quiet row.
 *
 * A client with nothing yet shows three of these at once, so they are sized
 * to be skipped rather than to fill the screen — the composer above is what
 * should draw the eye.
 */
export function EmptyState({
  icon: Icon,
  title,
  note,
  action,
}: {
  icon: IconComponent;
  title: string;
  note: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-border bg-[var(--card-muted)]/40 px-4 py-4">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-card text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-comment mt-0.5">{`// ${note}`}</p>
      </div>
      {action ? <div className="ml-auto">{action}</div> : null}
    </div>
  );
}

/** One figure in the summary rail. */
export function StatTile({
  label,
  value,
  note,
  tone = "default",
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "default" | "accent" | "success";
}) {
  const valueClass =
    tone === "accent"
      ? "text-primary"
      : tone === "success"
        ? "text-success"
        : "text-foreground";

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4">
      {/* A hairline of colour along the top — enough to rank the tiles
          without four filled panels competing for attention. */}
      {tone !== "default" ? (
        <span
          aria-hidden
          className={`absolute inset-x-0 top-0 h-px ${
            tone === "accent" ? "bg-primary/60" : "bg-success/60"
          }`}
        />
      ) : null}
      <div className="text-label">{label}</div>
      <div className={`num-display mt-1.5 text-xl font-semibold ${valueClass}`}>
        {value}
      </div>
      {note ? <div className="text-meta mt-0.5">{note}</div> : null}
    </div>
  );
}

/** Label + field, so every input in the workspace lines up the same way. */
export function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={["space-y-1.5", className].filter(Boolean).join(" ")}>
      <label className="text-label block" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint ? <p className="text-comment text-2xs">{hint}</p> : null}
    </div>
  );
}

/**
 * Shared input styling.
 *
 * `@kit/ui`'s Input is a touch short for a composer this size, and the
 * workspace also needs selects, date fields and money fields to match it
 * exactly, so the class list lives here once.
 */
export const fieldClass =
  "h-9 w-full rounded-lg border border-border bg-[var(--card-muted)] px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/50 disabled:opacity-50";

export const selectClass = `${fieldClass} cursor-pointer pr-8`;

/**
 * Checkbox that reads as a control rather than a raw browser tick.
 *
 * The tick is targeted with `[&>svg]` because `peer-checked:` compiles to a
 * sibling combinator — it cannot reach a descendant on its own.
 */
export function Toggle({
  checked,
  onChange,
  disabled,
  label,
  note,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
  note?: string;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="peer sr-only"
      />
      <span className="grid size-4 shrink-0 place-items-center rounded border border-border bg-[var(--card-muted)] transition-colors peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40 peer-checked:[&>svg]:opacity-100">
        <svg viewBox="0 0 12 12" className="size-2.5 opacity-0" aria-hidden>
          <path
            d="M2 6.2 4.6 8.8 10 3.4"
            fill="none"
            stroke="var(--primary-foreground)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="font-medium">{label}</span>
      {note ? <span className="text-comment">{`// ${note}`}</span> : null}
    </label>
  );
}

/** The same control, sized for a selection list. */
export function SelectBox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    // A <label>, not a <span>: the real checkbox is visually hidden, so the
    // label is the only thing that forwards a click to it.
    <label className="inline-flex cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={label}
        className="peer sr-only"
      />
      <span className="grid size-[18px] shrink-0 cursor-pointer place-items-center rounded-md border border-border bg-[var(--card-muted)] transition-colors peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40 peer-checked:[&>svg]:opacity-100">
        <svg viewBox="0 0 12 12" className="size-3 opacity-0" aria-hidden>
          <path
            d="M2 6.2 4.6 8.8 10 3.4"
            fill="none"
            stroke="var(--primary-foreground)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </label>
  );
}

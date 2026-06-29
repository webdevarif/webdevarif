import * as React from "react"

import { cn } from "../lib/utils"

// Canonical stat tile. Replaces ~9 divergent local StatCard/Stat defs.
// `num-display` (tabular-nums + ss01/cv11) is applied to every value so digits
// don't jitter on re-render. `tone` points at the semantic tokens.
//   size sm → dense grids (4-up metric rows)   lg → home/overview headline tiles
const TONE = {
  ok: "text-success",
  neutral: "text-foreground",
  warn: "text-warning",
  fail: "text-destructive",
} as const

const SIZE = {
  sm: { card: "px-4 py-3", value: "text-base", valueMt: "mt-1.5", hintMt: "mt-1" },
  lg: { card: "p-6", value: "text-4xl", valueMt: "mt-4", hintMt: "mt-3" },
} as const

function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  size = "sm",
  index,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "title" | "color"> & {
  label: React.ReactNode
  value: React.ReactNode
  hint?: React.ReactNode
  tone?: keyof typeof TONE
  size?: keyof typeof SIZE
  /** Optional NN counter badge, top-right (e.g. the home overview tiles). */
  index?: number
}) {
  const s = SIZE[size]
  return (
    <div
      data-slot="stat-card"
      className={cn(
        "relative rounded-lg border border-border bg-card",
        s.card,
        className,
      )}
      {...props}
    >
      {typeof index === "number" ? (
        <span className="stat-badge absolute right-4 top-4">
          {String(index).padStart(2, "0")}
        </span>
      ) : null}
      <p className="text-label">{label}</p>
      <p
        className={cn(
          "num-display font-semibold tracking-tight",
          s.value,
          s.valueMt,
          TONE[tone],
        )}
      >
        {value}
      </p>
      {hint ? <p className={cn("text-comment", s.hintMt)}>{hint}</p> : null}
    </div>
  )
}

export { StatCard }

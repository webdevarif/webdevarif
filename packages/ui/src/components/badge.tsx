import * as React from "react"

import { cn } from "../lib/utils"

// The mono-uppercase pill is core brand identity — yet it occurs ~109× across
// 40 files with drifting radius / padding / bg-opacity. One definition here;
// colored variants use the semantic tokens (text-/bg-/border-success|warning|…).
// Tracking matches `.text-label` (0.18em).
const VARIANTS = {
  neutral: "border-transparent bg-muted/50 text-muted-foreground",
  primary: "border-primary/20 bg-primary/15 text-primary",
  success: "border-success/30 bg-success/15 text-success",
  warning: "border-warning/30 bg-warning/15 text-warning",
  error: "border-destructive/30 bg-destructive/15 text-destructive",
  info: "border-info/30 bg-info/15 text-info",
} as const

function Badge({
  variant = "neutral",
  className,
  ...props
}: React.ComponentProps<"span"> & { variant?: keyof typeof VARIANTS }) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[0.625rem] uppercase tracking-[0.18em]",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  )
}

export { Badge }

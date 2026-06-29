import * as React from "react"

import { cn } from "../lib/utils"

// Canonical page header: `.text-label` eyebrow + Syne h1 + `// ...` description,
// with an optional right-aligned action slot. Locks the H1 scale that ~38 pages
// already use, so peer pages stop rendering titles at 30/36/48/60px at random.
//   default → every standard feature page (text-3xl/sm:4xl)
//   hero    → the /dashboard landing only (text-4xl/sm:5xl)
//   detail  → dense detail/sub pages (text-2xl/sm:3xl)
const TITLE_SIZE = {
  default: "text-3xl font-semibold tracking-tight sm:text-4xl",
  hero: "text-4xl font-semibold tracking-tight sm:text-5xl",
  detail: "text-2xl font-semibold tracking-tight sm:text-3xl",
} as const

function PageHeader({
  eyebrow,
  title,
  description,
  action,
  size = "default",
  className,
  ...props
}: Omit<React.ComponentProps<"header">, "title"> & {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  /** Brand `// ...` voice — styled with `.text-comment`. */
  description?: React.ReactNode
  action?: React.ReactNode
  size?: keyof typeof TITLE_SIZE
}) {
  return (
    <header
      data-slot="page-header"
      className={cn("flex flex-wrap items-start justify-between gap-4", className)}
      {...props}
    >
      <div className="min-w-0">
        {eyebrow ? <p className="text-label">{eyebrow}</p> : null}
        <h1 className={cn("mt-3", TITLE_SIZE[size])}>{title}</h1>
        {description ? <p className="text-comment mt-2">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  )
}

export { PageHeader }

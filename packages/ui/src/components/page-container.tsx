import * as React from "react"

import { cn } from "../lib/utils"

// Canonical page wrapper. The (app) layout's <main> applies no width/padding,
// so every page used to re-declare `mx-auto max-w-Nxl px-N py-10` and they
// drifted (5 distinct widths, px-8 vs px-6/sm:px-8). One source of truth here;
// pick the measure with a prop.
//   default → data/standard pages   wide → wide tables/dashboards
//   narrow  → reading-width          form → single-form / settings
const WIDTHS = {
  default: "max-w-6xl",
  wide: "max-w-7xl",
  narrow: "max-w-5xl",
  form: "max-w-3xl",
} as const

function PageContainer({
  width = "default",
  className,
  ...props
}: React.ComponentProps<"div"> & { width?: keyof typeof WIDTHS }) {
  return (
    <div
      data-slot="page-container"
      className={cn(
        "mx-auto w-full px-6 py-10 sm:px-8",
        WIDTHS[width],
        className,
      )}
      {...props}
    />
  )
}

export { PageContainer }

/**
 * Pure clamp() math — no React, no DOM. Safe on server or client.
 *
 * The CSS `clamp(min, preferred, max)` formula for fluid typography is a
 * linear interpolation between two viewport widths. Given a font size at
 * viewport A and a font size at viewport B, the "preferred" value is the
 * line that connects them — expressed in CSS as `Xrem + Yvw`.
 *
 * `remBase` is the px value of 1rem. Standard browsers use 16. Shopify
 * Horizon themes set `html { font-size: 62.5% }` which makes 1rem = 10px
 * — pass remBase=10 in that mode so the generated rem values match what
 * the theme expects (e.g. 16px → 1.6rem instead of 1rem).
 */

export type ClampInputs = {
  /** Smallest viewport (px). e.g. 375 */
  minViewport: number;
  /** Largest viewport (px). e.g. 1440 */
  maxViewport: number;
  /** Desired font size at minViewport (px). e.g. 16 */
  minSize: number;
  /** Desired font size at maxViewport (px). e.g. 24 */
  maxSize: number;
  /** px-per-rem. 16 = browser default, 10 = Shopify Horizon (62.5% root). */
  remBase: number;
  /** Output unit for the bounds + intercept. */
  unit: "rem" | "px";
  /** Decimal places. Default 3. */
  precision?: number;
};

export type ClampOutput = {
  /** Single CSS value, e.g. `clamp(1rem, 0.273rem + 3.636vw, 3rem)`. */
  value: string;
  /** The min bound in the chosen unit (no unit suffix). */
  min: number;
  /** The max bound in the chosen unit (no unit suffix). */
  max: number;
  /** The intercept in the chosen unit. */
  intercept: number;
  /** Slope in vw (multiplied by 100 from the px/px slope). */
  slopeVw: number;
};

/**
 * Compute a clamp() formula for one font-size pair. Pure math, no clamps,
 * no rounding for caller — they round when they format.
 */
export function buildClamp(inputs: ClampInputs): ClampOutput {
  const { minViewport, maxViewport, minSize, maxSize, remBase, unit } = inputs;
  const precision = inputs.precision ?? 3;

  // px-per-px slope between the two points
  const slopePx = (maxSize - minSize) / (maxViewport - minViewport);
  // 1vw = viewport/100, so the slope expressed in vw is slopePx * 100
  const slopeVw = slopePx * 100;
  // Y-intercept in px (the "Xpx + Yvw" intercept)
  const interceptPx = minSize - slopePx * minViewport;

  // Convert to the requested output unit
  const toUnit = (px: number) => (unit === "rem" ? px / remBase : px);
  const min = round(toUnit(minSize), precision);
  const max = round(toUnit(maxSize), precision);
  const intercept = round(toUnit(interceptPx), precision);
  const slope = round(slopeVw, precision);

  const value = `clamp(${min}${unit}, ${intercept}${unit} + ${slope}vw, ${max}${unit})`;
  return { value, min, max, intercept, slopeVw: slope };
}

/**
 * For 3-point input — verify the tablet target falls on the line drawn by
 * mobile→desktop. Returns the actual interpolated px the clamp would
 * yield at the tablet viewport, plus the delta from the user's target.
 */
export function projectAtViewport(
  inputs: Pick<ClampInputs, "minViewport" | "maxViewport" | "minSize" | "maxSize">,
  viewport: number,
): number {
  const { minViewport, maxViewport, minSize, maxSize } = inputs;
  if (viewport <= minViewport) return minSize;
  if (viewport >= maxViewport) return maxSize;
  const t = (viewport - minViewport) / (maxViewport - minViewport);
  return minSize + t * (maxSize - minSize);
}

// ─── Type scale ─────────────────────────────────────────────────────

export const SCALE_RATIOS = [
  { value: 1.067, label: "1.067 · Minor Second" },
  { value: 1.125, label: "1.125 · Major Second" },
  { value: 1.2, label: "1.2 · Minor Third" },
  { value: 1.25, label: "1.25 · Major Third" },
  { value: 1.333, label: "1.333 · Perfect Fourth" },
  { value: 1.414, label: "1.414 · Augmented Fourth" },
  { value: 1.5, label: "1.5 · Perfect Fifth" },
  { value: 1.618, label: "1.618 · Golden Ratio" },
] as const;

export type TypeScaleStep = {
  /** CSS variable name, e.g. "fs-h1". */
  varName: string;
  /** Friendly label, e.g. "H1". */
  label: string;
  /** Selector for direct-rule output, e.g. "h1". */
  selector: string;
  /** Power of the ratio applied to the base. body = 0, h1 = +5, small = -1. */
  step: number;
};

/** Default steps. Adjustable later if needed. */
export const SCALE_STEPS: readonly TypeScaleStep[] = [
  { varName: "fs-h1", label: "H1", selector: "h1", step: 5 },
  { varName: "fs-h2", label: "H2", selector: "h2", step: 4 },
  { varName: "fs-h3", label: "H3", selector: "h3", step: 3 },
  { varName: "fs-h4", label: "H4", selector: "h4", step: 2 },
  { varName: "fs-h5", label: "H5", selector: "h5", step: 1 },
  { varName: "fs-h6", label: "H6", selector: "h6", step: 0 },
  { varName: "fs-body", label: "Body", selector: "body, p", step: 0 },
  { varName: "fs-small", label: "Small", selector: "small", step: -1 },
];

export type ScaleInputs = {
  /** Body base at smallest viewport (px). */
  mobileBase: number;
  /** Body base at largest viewport (px). */
  desktopBase: number;
  minViewport: number;
  maxViewport: number;
  ratio: number;
  remBase: number;
  unit: "rem" | "px";
};

export type ScaleRow = TypeScaleStep & {
  minSize: number;
  maxSize: number;
  clamp: string;
};

export function buildTypeScale(inputs: ScaleInputs): ScaleRow[] {
  const { mobileBase, desktopBase, ratio, minViewport, maxViewport, remBase, unit } = inputs;
  return SCALE_STEPS.map((step) => {
    const factor = Math.pow(ratio, step.step);
    const minSize = round(mobileBase * factor, 2);
    const maxSize = round(desktopBase * factor, 2);
    const { value } = buildClamp({
      minViewport,
      maxViewport,
      minSize,
      maxSize,
      remBase,
      unit,
    });
    return { ...step, minSize, maxSize, clamp: value };
  });
}

/** Emit the CSS variables block for paste into `:root`. */
export function formatScaleAsVariables(rows: ScaleRow[]): string {
  const lines = rows.map((r) => `  --${r.varName}: ${r.clamp};`);
  return `:root {\n${lines.join("\n")}\n}`;
}

/** Emit direct rules — `h1 { font-size: clamp(...); }`. */
export function formatScaleAsRules(rows: ScaleRow[]): string {
  return rows
    .map((r) => `${r.selector} {\n  font-size: ${r.clamp};\n}`)
    .join("\n\n");
}

// ─── Utils ──────────────────────────────────────────────────────────

function round(n: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}

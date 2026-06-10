"use client";

import { useMemo, useState } from "react";

import {
  buildClamp,
  buildTypeScale,
  formatScaleAsRules,
  formatScaleAsVariables,
  projectAtViewport,
  SCALE_RATIOS,
  type ScaleRow,
} from "../_lib/clamp-math";

type Tab = "single" | "scale";

const REM_BASE_HORIZON = 10;
const REM_BASE_STANDARD = 16;

export function ClampTool() {
  const [tab, setTab] = useState<Tab>("single");
  const [horizon, setHorizon] = useState(false);
  const [unit, setUnit] = useState<"rem" | "px">("rem");

  const remBase = horizon ? REM_BASE_HORIZON : REM_BASE_STANDARD;

  return (
    <div className="space-y-6">
      <ToolBar
        tab={tab}
        setTab={setTab}
        horizon={horizon}
        setHorizon={setHorizon}
        unit={unit}
        setUnit={setUnit}
        remBase={remBase}
      />

      {tab === "single" ? (
        <SinglePanel remBase={remBase} unit={unit} />
      ) : (
        <ScalePanel remBase={remBase} unit={unit} />
      )}
    </div>
  );
}

// ─── Top tool bar ──────────────────────────────────────────────────

function ToolBar({
  tab,
  setTab,
  horizon,
  setHorizon,
  unit,
  setUnit,
  remBase,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  horizon: boolean;
  setHorizon: (b: boolean) => void;
  unit: "rem" | "px";
  setUnit: (u: "rem" | "px") => void;
  remBase: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card/40 p-3">
      <div className="inline-flex rounded-md border border-border bg-background p-1">
        <TabButton active={tab === "single"} onClick={() => setTab("single")}>
          Single value
        </TabButton>
        <TabButton active={tab === "scale"} onClick={() => setTab("scale")}>
          Type scale
        </TabButton>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <UnitToggle unit={unit} onChange={setUnit} />
        <HorizonToggle on={horizon} onChange={setHorizon} remBase={remBase} />
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-sm px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function UnitToggle({
  unit,
  onChange,
}: {
  unit: "rem" | "px";
  onChange: (u: "rem" | "px") => void;
}) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
        Output
      </span>
      <div className="inline-flex rounded-md border border-border bg-background p-1">
        {(["rem", "px"] as const).map((u) => (
          <button
            key={u}
            type="button"
            onClick={() => onChange(u)}
            className={`rounded-sm px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wider transition-colors ${
              unit === u
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {u}
          </button>
        ))}
      </div>
    </div>
  );
}

function HorizonToggle({
  on,
  onChange,
  remBase,
}: {
  on: boolean;
  onChange: (b: boolean) => void;
  remBase: number;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`group inline-flex items-center gap-2.5 rounded-md border px-3 py-1.5 transition-colors ${
        on
          ? "border-primary/50 bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground hover:text-foreground"
      }`}
      title="Shopify Horizon themes set html { font-size: 62.5% } so 1rem = 10px. Toggle this when generating clamp() for a Horizon-based theme."
    >
      <span
        className={`relative inline-flex h-4 w-7 shrink-0 rounded-full transition-colors ${
          on ? "bg-primary" : "bg-border"
        }`}
      >
        <span
          className={`absolute top-0.5 size-3 rounded-full bg-background transition-transform ${
            on ? "translate-x-3.5" : "translate-x-0.5"
          }`}
        />
      </span>
      <span className="font-mono text-[0.65rem] uppercase tracking-wider">
        Shopify Horizon
      </span>
      <span className="font-mono text-[0.6rem] uppercase tracking-wider opacity-60">
        1rem = {remBase}px
      </span>
    </button>
  );
}

// ─── Single value panel ───────────────────────────────────────────

const TABLET_TOLERANCE_PX = 0.5;

function SinglePanel({
  remBase,
  unit,
}: {
  remBase: number;
  unit: "rem" | "px";
}) {
  const [minVP, setMinVP] = useState("375");
  const [maxVP, setMaxVP] = useState("1440");
  const [minSize, setMinSize] = useState("16");
  const [maxSize, setMaxSize] = useState("24");
  const [tabletVP, setTabletVP] = useState("768");
  const [tabletSize, setTabletSize] = useState("");

  const parsed = useMemo(() => {
    const mv = Number(minVP);
    const xv = Number(maxVP);
    const ms = Number(minSize);
    const xs = Number(maxSize);
    const valid =
      Number.isFinite(mv) &&
      Number.isFinite(xv) &&
      Number.isFinite(ms) &&
      Number.isFinite(xs) &&
      xv > mv &&
      mv > 0;
    return { mv, xv, ms, xs, valid };
  }, [minVP, maxVP, minSize, maxSize]);

  const output = useMemo(() => {
    if (!parsed.valid) return null;
    return buildClamp({
      minViewport: parsed.mv,
      maxViewport: parsed.xv,
      minSize: parsed.ms,
      maxSize: parsed.xs,
      remBase,
      unit,
    });
  }, [parsed, remBase, unit]);

  const tabletCheck = useMemo(() => {
    if (!parsed.valid) return null;
    const tvp = Number(tabletVP);
    const tgt = Number(tabletSize);
    if (!Number.isFinite(tvp) || !Number.isFinite(tgt) || tgt <= 0) return null;
    if (tvp <= parsed.mv || tvp >= parsed.xv) {
      return {
        actual: tgt,
        delta: 0,
        ok: true,
        outOfRange: true as const,
      };
    }
    const actual = projectAtViewport(
      {
        minViewport: parsed.mv,
        maxViewport: parsed.xv,
        minSize: parsed.ms,
        maxSize: parsed.xs,
      },
      tvp,
    );
    const delta = actual - tgt;
    return {
      actual,
      delta,
      ok: Math.abs(delta) <= TABLET_TOLERANCE_PX,
      outOfRange: false as const,
    };
  }, [parsed, tabletVP, tabletSize]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <Card>
        <SectionLabel>— inputs</SectionLabel>

        <Row3
          label="Mobile"
          vpId="min-vp"
          vp={minVP}
          setVP={setMinVP}
          sizeId="min-size"
          size={minSize}
          setSize={setMinSize}
        />
        <Row3
          label="Tablet"
          vpId="tablet-vp"
          vp={tabletVP}
          setVP={setTabletVP}
          sizeId="tablet-size"
          size={tabletSize}
          setSize={setTabletSize}
          optional
        />
        <Row3
          label="Desktop"
          vpId="max-vp"
          vp={maxVP}
          setVP={setMaxVP}
          sizeId="max-size"
          size={maxSize}
          setSize={setMaxSize}
        />

        {tabletCheck ? (
          <TabletNote check={tabletCheck} target={Number(tabletSize)} />
        ) : (
          <p className="mt-4 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground/70">
            {`// tablet size is optional — fill it to verify the curve matches your target`}
          </p>
        )}
      </Card>

      <div className="space-y-6">
        <OutputCard output={output} unit={unit} />
        {output && parsed.valid ? (
          <PreviewCard
            minVP={parsed.mv}
            maxVP={parsed.xv}
            minSize={parsed.ms}
            maxSize={parsed.xs}
            clamp={output.value}
          />
        ) : null}
      </div>
    </div>
  );
}

function Row3({
  label,
  vpId,
  vp,
  setVP,
  sizeId,
  size,
  setSize,
  optional = false,
}: {
  label: string;
  vpId: string;
  vp: string;
  setVP: (v: string) => void;
  sizeId: string;
  size: string;
  setSize: (v: string) => void;
  optional?: boolean;
}) {
  return (
    <div className="mt-4 grid grid-cols-[6rem_1fr_1fr] items-end gap-3">
      <span className="font-mono text-[0.7rem] uppercase tracking-wider text-muted-foreground">
        {label}
        {optional ? (
          <span className="ml-1 text-[0.6rem] normal-case opacity-60">
            (opt)
          </span>
        ) : null}
      </span>
      <NumField
        id={vpId}
        label="viewport"
        suffix="px"
        value={vp}
        onChange={setVP}
      />
      <NumField
        id={sizeId}
        label="font size"
        suffix="px"
        value={size}
        onChange={setSize}
        placeholder={optional ? "—" : undefined}
      />
    </div>
  );
}

function NumField({
  id,
  label,
  suffix,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  suffix: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1">
      <span className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground/60">
        {label}
      </span>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 pr-9 text-sm font-medium tabular-nums outline-none transition-colors focus:border-primary/40"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground/60">
          {suffix}
        </span>
      </div>
    </label>
  );
}

type TabletCheck = {
  actual: number;
  delta: number;
  ok: boolean;
  outOfRange: boolean;
};

function TabletNote({
  check,
  target,
}: {
  check: TabletCheck;
  target: number;
}) {
  if (check.outOfRange) {
    return (
      <p className="text-comment mt-4">
        {`// tablet viewport is outside the mobile→desktop range, clamp() will lock to a bound there`}
      </p>
    );
  }
  if (check.ok) {
    return (
      <p className="mt-4 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-500">
        ✓ on target — at tablet your formula yields ~{check.actual.toFixed(1)}px
      </p>
    );
  }
  return (
    <p className="mt-4 rounded-md border border-orange-500/30 bg-orange-500/5 px-3 py-2 text-xs text-orange-500">
      ⚠ at tablet your formula yields ~{check.actual.toFixed(1)}px (you wanted {target}px,
      Δ {check.delta > 0 ? "+" : ""}
      {check.delta.toFixed(1)}px). Adjust mobile or desktop to bend the line.
    </p>
  );
}

// ─── Output card (shared between modes-ish) ───────────────────────

function OutputCard({
  output,
  unit,
}: {
  output: ReturnType<typeof buildClamp> | null;
  unit: "rem" | "px";
}) {
  if (!output) {
    return (
      <Card>
        <SectionLabel>— output</SectionLabel>
        <p className="mt-4 text-sm text-muted-foreground">
          Fill in mobile + desktop to see the clamp().
        </p>
      </Card>
    );
  }

  const css = `font-size: ${output.value};`;
  const variable = `--fs-fluid: ${output.value};`;
  const tailwind = `text-[${output.value.replace(/\s+/g, "")}]`;

  return (
    <Card>
      <SectionLabel>— output</SectionLabel>

      <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-4">
        <p className="break-all font-mono text-sm leading-relaxed text-primary sm:text-base">
          {output.value}
        </p>
        <CopyButton text={output.value} className="mt-3" />
      </div>

      <div className="mt-4 space-y-3">
        <OutputBlock label="CSS" code={css} />
        <OutputBlock label="CSS variable" code={variable} />
        <OutputBlock label="Tailwind" code={tailwind} />
      </div>

      <p className="text-comment mt-3">
        {`// intercept ${output.intercept}${unit} · slope ${output.slopeVw}vw`}
      </p>
    </Card>
  );
}

function OutputBlock({ label, code }: { label: string; code: string }) {
  return (
    <div className="rounded-md border border-border bg-background/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <CopyButton text={code} />
      </div>
      <pre className="mt-2 overflow-x-auto font-mono text-xs leading-relaxed text-foreground">
        {code}
      </pre>
    </div>
  );
}

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* ignore */
        }
      }}
      className={`rounded-sm border border-border bg-background px-2 py-1 font-mono text-[0.65rem] uppercase tracking-wider transition-colors hover:border-primary/40 hover:text-primary ${
        className ?? ""
      }`}
    >
      {copied ? "copied!" : "copy"}
    </button>
  );
}

// ─── Live preview ─────────────────────────────────────────────────

function PreviewCard({
  minVP,
  maxVP,
  minSize,
  maxSize,
  clamp,
}: {
  minVP: number;
  maxVP: number;
  minSize: number;
  maxSize: number;
  clamp: string;
}) {
  const span = Math.max(maxVP - minVP, 1);
  const [rawViewport, setRawViewport] = useState(() =>
    Math.round(minVP + span * 0.5),
  );
  // Derive the in-range viewport from props on every render — no effect needed.
  // If the user shrinks min/max bounds, the stored raw value just gets clamped
  // for display until they drag the slider again.
  const viewport = Math.min(Math.max(rawViewport, minVP), maxVP);

  const livePx = projectAtViewport(
    { minViewport: minVP, maxViewport: maxVP, minSize, maxSize },
    viewport,
  );

  return (
    <Card>
      <SectionLabel>— live preview</SectionLabel>

      <div className="mt-4">
        <input
          type="range"
          min={minVP}
          max={maxVP}
          step={1}
          value={viewport}
          onChange={(e) => setRawViewport(Number(e.target.value))}
          className="w-full accent-primary"
          aria-label="Viewport simulator"
        />
        <div className="mt-2 flex items-center justify-between font-mono text-[0.7rem] tabular-nums text-muted-foreground">
          <span>{minVP}px</span>
          <span className="text-foreground">{viewport}px viewport</span>
          <span>{maxVP}px</span>
        </div>
      </div>

      <div
        className="mt-6 rounded-md border border-border bg-background/60 p-6 text-foreground"
        style={{ fontSize: clamp }}
      >
        The quick brown fox jumps over the lazy dog.
      </div>

      <p className="text-comment mt-3 tabular-nums">
        {`// at ${viewport}px the rendered size ≈ ${livePx.toFixed(2)}px`}
      </p>
    </Card>
  );
}

// ─── Type scale panel ─────────────────────────────────────────────

function ScalePanel({
  remBase,
  unit,
}: {
  remBase: number;
  unit: "rem" | "px";
}) {
  const [minVP, setMinVP] = useState("375");
  const [maxVP, setMaxVP] = useState("1440");
  const [mobileBase, setMobileBase] = useState("16");
  const [desktopBase, setDesktopBase] = useState("18");
  const [ratio, setRatio] = useState("1.25");
  const [format, setFormat] = useState<"vars" | "rules">("vars");

  const rows = useMemo<ScaleRow[] | null>(() => {
    const mv = Number(minVP);
    const xv = Number(maxVP);
    const mb = Number(mobileBase);
    const db = Number(desktopBase);
    const r = Number(ratio);
    if (
      !Number.isFinite(mv) ||
      !Number.isFinite(xv) ||
      !Number.isFinite(mb) ||
      !Number.isFinite(db) ||
      !Number.isFinite(r) ||
      xv <= mv ||
      mb <= 0 ||
      db <= 0 ||
      r <= 1
    ) {
      return null;
    }
    return buildTypeScale({
      minViewport: mv,
      maxViewport: xv,
      mobileBase: mb,
      desktopBase: db,
      ratio: r,
      remBase,
      unit,
    });
  }, [minVP, maxVP, mobileBase, desktopBase, ratio, remBase, unit]);

  const codeOutput = useMemo(() => {
    if (!rows) return "";
    return format === "vars"
      ? formatScaleAsVariables(rows)
      : formatScaleAsRules(rows);
  }, [rows, format]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <Card>
        <SectionLabel>— inputs</SectionLabel>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <NumField
            id="scale-min-vp"
            label="min viewport"
            suffix="px"
            value={minVP}
            onChange={setMinVP}
          />
          <NumField
            id="scale-max-vp"
            label="max viewport"
            suffix="px"
            value={maxVP}
            onChange={setMaxVP}
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <NumField
            id="scale-mb"
            label="mobile body"
            suffix="px"
            value={mobileBase}
            onChange={setMobileBase}
          />
          <NumField
            id="scale-db"
            label="desktop body"
            suffix="px"
            value={desktopBase}
            onChange={setDesktopBase}
          />
        </div>

        <div className="mt-4">
          <label
            htmlFor="scale-ratio"
            className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground/60"
          >
            scale ratio
          </label>
          <select
            id="scale-ratio"
            value={ratio}
            onChange={(e) => setRatio(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/40"
          >
            {SCALE_RATIOS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {rows ? (
          <div className="mt-5">
            <SectionLabel>— preview</SectionLabel>
            <div className="mt-3 space-y-2 rounded-md border border-border bg-background/60 p-4">
              {rows.map((r) => (
                <div
                  key={r.varName}
                  className="flex items-baseline justify-between gap-3 border-b border-border/50 pb-2 last:border-0 last:pb-0"
                >
                  <span
                    className="truncate text-foreground"
                    style={{ fontSize: r.clamp }}
                  >
                    {r.label}
                  </span>
                  <span className="shrink-0 font-mono text-[0.65rem] tabular-nums text-muted-foreground">
                    {r.minSize}→{r.maxSize}px
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <SectionLabel>— output</SectionLabel>
          <div className="inline-flex rounded-md border border-border bg-background p-1">
            <button
              type="button"
              onClick={() => setFormat("vars")}
              className={`rounded-sm px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wider transition-colors ${
                format === "vars"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              :root vars
            </button>
            <button
              type="button"
              onClick={() => setFormat("rules")}
              className={`rounded-sm px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wider transition-colors ${
                format === "rules"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              direct rules
            </button>
          </div>
        </div>

        {rows ? (
          <>
            <div className="mt-4 overflow-x-auto rounded-md border border-border bg-background/60 p-4">
              <pre className="font-mono text-xs leading-relaxed text-foreground">
                {codeOutput}
              </pre>
            </div>
            <div className="mt-3">
              <CopyButton text={codeOutput} />
            </div>
          </>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            Fill in viewports + bases to generate the scale.
          </p>
        )}
      </Card>
    </div>
  );
}

// ─── Tiny primitives ──────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
      {children}
    </span>
  );
}

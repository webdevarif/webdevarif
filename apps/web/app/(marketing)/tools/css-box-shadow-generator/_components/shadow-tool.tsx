"use client";

import { useMemo, useState } from "react";

import { CopyButton } from "../../_components/copy-button";
import { Card, CodeBlock, SectionLabel } from "../../_components/tool-shell";

type Layer = {
  uid: string;
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
  opacity: number;
  inset: boolean;
};

type Preset = { name: string; layers: Omit<Layer, "uid">[] };

const PRESETS: Preset[] = [
  {
    name: "Subtle",
    layers: [
      { x: 0, y: 1, blur: 2, spread: 0, color: "#000000", opacity: 0.08, inset: false },
      { x: 0, y: 1, blur: 1, spread: 0, color: "#000000", opacity: 0.04, inset: false },
    ],
  },
  {
    name: "Soft",
    layers: [
      { x: 0, y: 4, blur: 12, spread: -2, color: "#000000", opacity: 0.1, inset: false },
      { x: 0, y: 8, blur: 24, spread: -4, color: "#000000", opacity: 0.08, inset: false },
    ],
  },
  {
    name: "Card lift",
    layers: [
      { x: 0, y: 2, blur: 4, spread: -1, color: "#000000", opacity: 0.06, inset: false },
      { x: 0, y: 10, blur: 30, spread: -4, color: "#000000", opacity: 0.12, inset: false },
    ],
  },
  {
    name: "Hard",
    layers: [
      { x: 4, y: 4, blur: 0, spread: 0, color: "#000000", opacity: 1, inset: false },
    ],
  },
  {
    name: "Neumorphic",
    layers: [
      { x: -8, y: -8, blur: 16, spread: 0, color: "#ffffff", opacity: 0.7, inset: false },
      { x: 8, y: 8, blur: 16, spread: 0, color: "#000000", opacity: 0.2, inset: false },
    ],
  },
  {
    name: "Glow",
    layers: [
      { x: 0, y: 0, blur: 24, spread: 0, color: "#baff04", opacity: 0.4, inset: false },
      { x: 0, y: 0, blur: 48, spread: 4, color: "#baff04", opacity: 0.2, inset: false },
    ],
  },
];

export function ShadowTool() {
  const [layers, setLayers] = useState<Layer[]>(() =>
    PRESETS[2]!.layers.map((l) => ({ ...l, uid: uid() })),
  );
  const [bg, setBg] = useState("#0e0e0e");
  const [boxColor, setBoxColor] = useState("#1a1a1a");
  const [radius, setRadius] = useState(16);

  const css = useMemo(() => buildShadowValue(layers), [layers]);

  const cssRule = `box-shadow: ${css};`;
  const variable = `--shadow-fluid: ${css};`;
  const tailwind = `shadow-[${css.replace(/\s+/g, "_")}]`;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-6">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <SectionLabel>— presets</SectionLabel>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() =>
                  setLayers(p.layers.map((l) => ({ ...l, uid: uid() })))
                }
                className="rounded-md border border-border bg-background px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-wider transition-colors hover:border-primary/40 hover:text-primary"
              >
                {p.name}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <SectionLabel>— shadow layers ({layers.length})</SectionLabel>
            <button
              type="button"
              onClick={() =>
                setLayers((arr) => [
                  ...arr,
                  {
                    uid: uid(),
                    x: 0,
                    y: 4,
                    blur: 12,
                    spread: 0,
                    color: "#000000",
                    opacity: 0.2,
                    inset: false,
                  },
                ])
              }
              className="rounded-sm border border-border bg-background px-2 py-1 font-mono text-[0.65rem] uppercase tracking-wider hover:border-primary/40 hover:text-primary"
            >
              + layer
            </button>
          </div>

          <ul className="mt-4 space-y-3">
            {layers.map((layer, i) => (
              <LayerRow
                key={layer.uid}
                layer={layer}
                index={i + 1}
                onChange={(next) =>
                  setLayers((arr) =>
                    arr.map((x, j) => (j === i ? next : x)),
                  )
                }
                onRemove={() =>
                  setLayers((arr) => arr.filter((_, j) => j !== i))
                }
              />
            ))}
          </ul>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <SectionLabel>— preview</SectionLabel>
          <div
            className="mt-4 flex h-64 items-center justify-center rounded-lg p-8 sm:h-80"
            style={{ background: bg }}
          >
            <div
              className="size-32 sm:size-40"
              style={{
                background: boxColor,
                borderRadius: `${radius}px`,
                boxShadow: css,
              }}
            />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <ColorField
              id="bg"
              label="background"
              value={bg}
              onChange={setBg}
            />
            <ColorField
              id="box"
              label="box color"
              value={boxColor}
              onChange={setBoxColor}
            />
            <div>
              <span className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground/60">
                radius {radius}px
              </span>
              <input
                type="range"
                min={0}
                max={64}
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="mt-1 w-full accent-primary"
              />
            </div>
          </div>
        </Card>

        <Card>
          <SectionLabel>— output</SectionLabel>
          <div className="mt-3 rounded-md border border-primary/30 bg-primary/5 p-4">
            <p className="break-all font-mono text-sm text-primary">{css}</p>
            <CopyButton text={css} className="mt-3" />
          </div>
          <div className="mt-3 space-y-3">
            <OutputBlock label="CSS rule" code={cssRule} />
            <OutputBlock label="CSS variable" code={variable} />
            <OutputBlock label="Tailwind" code={tailwind} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function LayerRow({
  layer,
  index,
  onChange,
  onRemove,
}: {
  layer: Layer;
  index: number;
  onChange: (l: Layer) => void;
  onRemove: () => void;
}) {
  const update = (patch: Partial<Layer>) => onChange({ ...layer, ...patch });
  return (
    <li className="rounded-md border border-border bg-background/50 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
          layer {index}
        </span>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
            <input
              type="checkbox"
              checked={layer.inset}
              onChange={(e) => update({ inset: e.target.checked })}
              className="size-3 accent-primary"
            />
            inset
          </label>
          <button
            type="button"
            onClick={onRemove}
            className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground hover:text-destructive"
          >
            ×
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <RangeField
          label={`x ${layer.x}`}
          min={-50}
          max={50}
          value={layer.x}
          onChange={(v) => update({ x: v })}
        />
        <RangeField
          label={`y ${layer.y}`}
          min={-50}
          max={50}
          value={layer.y}
          onChange={(v) => update({ y: v })}
        />
        <RangeField
          label={`blur ${layer.blur}`}
          min={0}
          max={100}
          value={layer.blur}
          onChange={(v) => update({ blur: v })}
        />
        <RangeField
          label={`spread ${layer.spread}`}
          min={-30}
          max={30}
          value={layer.spread}
          onChange={(v) => update({ spread: v })}
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <ColorField
          id={`c-${layer.uid}`}
          label="color"
          value={layer.color}
          onChange={(v) => update({ color: v })}
        />
        <RangeField
          label={`opacity ${Math.round(layer.opacity * 100)}%`}
          min={0}
          max={100}
          value={Math.round(layer.opacity * 100)}
          onChange={(v) => update({ opacity: v / 100 })}
        />
      </div>
    </li>
  );
}

function RangeField({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <span className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground/60">
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-primary"
      />
    </div>
  );
}

function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1">
      <span className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground/60">
        {label}
      </span>
      <div className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="size-6 cursor-pointer rounded border border-border bg-transparent"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent font-mono text-xs uppercase outline-none"
        />
      </div>
    </label>
  );
}

function OutputBlock({ label, code }: { label: string; code: string }) {
  return (
    <div className="rounded-md border border-border bg-background/60 p-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <CopyButton text={code} />
      </div>
      <div className="mt-2">
        <CodeBlock code={code} />
      </div>
    </div>
  );
}

function buildShadowValue(layers: Layer[]): string {
  return layers
    .map((l) => {
      const color = hexToRgba(l.color, l.opacity);
      const prefix = l.inset ? "inset " : "";
      return `${prefix}${l.x}px ${l.y}px ${l.blur}px ${l.spread}px ${color}`;
    })
    .join(", ");
}

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace("#", "");
  const fullHex =
    m.length === 3
      ? m
          .split("")
          .map((c) => c + c)
          .join("")
      : m;
  if (!/^[0-9a-fA-F]{6}$/.test(fullHex)) return hex;
  const r = parseInt(fullHex.slice(0, 2), 16);
  const g = parseInt(fullHex.slice(2, 4), 16);
  const b = parseInt(fullHex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

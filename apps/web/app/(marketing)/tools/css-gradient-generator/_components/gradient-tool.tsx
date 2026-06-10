"use client";

import { useMemo, useState } from "react";

import {
  Select as ShadcnSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@kit/ui/components/select";

import { CopyButton } from "../../_components/copy-button";
import { Card, CodeBlock, SectionLabel } from "../../_components/tool-shell";

type GradientType = "linear" | "radial" | "conic";

type Stop = {
  uid: string;
  color: string;
  position: number;
};

type State = {
  type: GradientType;
  angle: number;
  radialShape: "ellipse" | "circle";
  radialPosition: string;
  conicPosition: string;
  stops: Stop[];
};

const PRESETS: { name: string; state: Omit<State, "stops"> & { stops: Omit<Stop, "uid">[] } }[] = [
  {
    name: "Sunset",
    state: {
      type: "linear",
      angle: 135,
      radialShape: "ellipse",
      radialPosition: "center",
      conicPosition: "center",
      stops: [
        { color: "#ff6b6b", position: 0 },
        { color: "#feca57", position: 100 },
      ],
    },
  },
  {
    name: "Lime glow",
    state: {
      type: "linear",
      angle: 180,
      radialShape: "ellipse",
      radialPosition: "center",
      conicPosition: "center",
      stops: [
        { color: "#baff04", position: 0 },
        { color: "#8bcc00", position: 100 },
      ],
    },
  },
  {
    name: "Aurora",
    state: {
      type: "linear",
      angle: 90,
      radialShape: "ellipse",
      radialPosition: "center",
      conicPosition: "center",
      stops: [
        { color: "#667eea", position: 0 },
        { color: "#764ba2", position: 50 },
        { color: "#f093fb", position: 100 },
      ],
    },
  },
  {
    name: "Radial spotlight",
    state: {
      type: "radial",
      angle: 0,
      radialShape: "circle",
      radialPosition: "center",
      conicPosition: "center",
      stops: [
        { color: "#ffffff", position: 0 },
        { color: "#0e0e0e", position: 100 },
      ],
    },
  },
  {
    name: "Conic ring",
    state: {
      type: "conic",
      angle: 0,
      radialShape: "ellipse",
      radialPosition: "center",
      conicPosition: "center",
      stops: [
        { color: "#baff04", position: 0 },
        { color: "#667eea", position: 33 },
        { color: "#f093fb", position: 66 },
        { color: "#baff04", position: 100 },
      ],
    },
  },
  {
    name: "Dark fade",
    state: {
      type: "linear",
      angle: 180,
      radialShape: "ellipse",
      radialPosition: "center",
      conicPosition: "center",
      stops: [
        { color: "#1a1a1a", position: 0 },
        { color: "#0e0e0e", position: 100 },
      ],
    },
  },
];

export function GradientTool() {
  const [state, setState] = useState<State>(() => ({
    ...PRESETS[2]!.state,
    stops: PRESETS[2]!.state.stops.map((s) => ({ ...s, uid: uid() })),
  }));

  const gradient = useMemo(() => buildGradient(state), [state]);
  const rule = `background: ${gradient};`;
  const variable = `--gradient-fluid: ${gradient};`;
  const tailwind = `bg-[${gradient.replace(/\s+/g, "_")}]`;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-6">
        <Card>
          <SectionLabel>— presets</SectionLabel>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() =>
                  setState({
                    ...p.state,
                    stops: p.state.stops.map((s) => ({ ...s, uid: uid() })),
                  })
                }
                className="group relative h-16 overflow-hidden rounded-md border border-border transition-colors hover:border-primary/40"
                style={{
                  background: buildGradient({
                    ...p.state,
                    stops: p.state.stops.map((s) => ({ ...s, uid: "preview" })),
                  }),
                }}
              >
                <span className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-center font-mono text-[0.6rem] uppercase tracking-wider text-white">
                  {p.name}
                </span>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <SectionLabel>— gradient type</SectionLabel>
          <div className="mt-3 inline-flex rounded-md border border-border bg-background p-1">
            {(["linear", "radial", "conic"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setState((s) => ({ ...s, type: t }))}
                className={`rounded-sm px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-wider transition-colors ${
                  state.type === t
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {state.type === "linear" ? (
            <div className="mt-4">
              <span className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground/60">
                angle {state.angle}°
              </span>
              <input
                type="range"
                min={0}
                max={360}
                value={state.angle}
                onChange={(e) =>
                  setState((s) => ({ ...s, angle: Number(e.target.value) }))
                }
                className="mt-1 w-full accent-primary"
              />
            </div>
          ) : null}

          {state.type === "radial" ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Select
                label="shape"
                value={state.radialShape}
                onChange={(v) =>
                  setState((s) => ({ ...s, radialShape: v as "ellipse" | "circle" }))
                }
                options={["ellipse", "circle"]}
              />
              <Select
                label="position"
                value={state.radialPosition}
                onChange={(v) =>
                  setState((s) => ({ ...s, radialPosition: v }))
                }
                options={[
                  "center",
                  "top",
                  "bottom",
                  "left",
                  "right",
                  "top left",
                  "top right",
                  "bottom left",
                  "bottom right",
                ]}
              />
            </div>
          ) : null}

          {state.type === "conic" ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <span className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground/60">
                  from {state.angle}°
                </span>
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={state.angle}
                  onChange={(e) =>
                    setState((s) => ({ ...s, angle: Number(e.target.value) }))
                  }
                  className="mt-1 w-full accent-primary"
                />
              </div>
              <Select
                label="position"
                value={state.conicPosition}
                onChange={(v) => setState((s) => ({ ...s, conicPosition: v }))}
                options={[
                  "center",
                  "top",
                  "bottom",
                  "left",
                  "right",
                  "top left",
                  "top right",
                  "bottom left",
                  "bottom right",
                ]}
              />
            </div>
          ) : null}
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <SectionLabel>— color stops ({state.stops.length})</SectionLabel>
            <button
              type="button"
              onClick={() =>
                setState((s) => ({
                  ...s,
                  stops: [
                    ...s.stops,
                    { uid: uid(), color: "#ffffff", position: 50 },
                  ],
                }))
              }
              className="rounded-sm border border-border bg-background px-2 py-1 font-mono text-[0.65rem] uppercase tracking-wider hover:border-primary/40 hover:text-primary"
            >
              + stop
            </button>
          </div>

          <ul className="mt-4 space-y-3">
            {state.stops
              .slice()
              .sort((a, b) => a.position - b.position)
              .map((stop) => (
                <StopRow
                  key={stop.uid}
                  stop={stop}
                  onChange={(next) =>
                    setState((s) => ({
                      ...s,
                      stops: s.stops.map((x) =>
                        x.uid === next.uid ? next : x,
                      ),
                    }))
                  }
                  onRemove={() =>
                    setState((s) => ({
                      ...s,
                      stops:
                        s.stops.length > 2
                          ? s.stops.filter((x) => x.uid !== stop.uid)
                          : s.stops,
                    }))
                  }
                  removable={state.stops.length > 2}
                />
              ))}
          </ul>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <SectionLabel>— preview</SectionLabel>
          <div
            className="mt-4 h-64 rounded-lg border border-border sm:h-80"
            style={{ background: gradient }}
          />
        </Card>

        <Card>
          <SectionLabel>— output</SectionLabel>
          <div className="mt-3 rounded-md border border-primary/30 bg-primary/5 p-4">
            <p className="break-all font-mono text-sm text-primary">
              {gradient}
            </p>
            <CopyButton text={gradient} className="mt-3" />
          </div>
          <div className="mt-3 space-y-3">
            <OutputBlock label="CSS rule" code={rule} />
            <OutputBlock label="CSS variable" code={variable} />
            <OutputBlock label="Tailwind" code={tailwind} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function StopRow({
  stop,
  onChange,
  onRemove,
  removable,
}: {
  stop: Stop;
  onChange: (s: Stop) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  return (
    <li className="rounded-md border border-border bg-background/50 p-3">
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={stop.color}
          onChange={(e) => onChange({ ...stop, color: e.target.value })}
          className="size-8 cursor-pointer rounded border border-border bg-transparent"
        />
        <input
          type="text"
          value={stop.color}
          onChange={(e) => onChange({ ...stop, color: e.target.value })}
          className="w-24 rounded-md border border-border bg-background px-2 py-1 font-mono text-xs uppercase outline-none focus:border-primary/40"
        />
        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={100}
            value={stop.position}
            onChange={(e) =>
              onChange({ ...stop, position: Number(e.target.value) })
            }
            className="w-full accent-primary"
          />
          <div className="mt-0.5 text-right font-mono text-[0.6rem] tabular-nums text-muted-foreground">
            {stop.position}%
          </div>
        </div>
        {removable ? (
          <button
            type="button"
            onClick={onRemove}
            className="font-mono text-xs text-muted-foreground hover:text-destructive"
          >
            ×
          </button>
        ) : null}
      </div>
    </li>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="block">
      <span className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground/60">
        {label}
      </span>
      <ShadcnSelect value={value} onValueChange={onChange}>
        <SelectTrigger className="mt-1 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </ShadcnSelect>
    </div>
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

function buildGradient(s: State): string {
  const stops = s.stops
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((x) => `${x.color} ${x.position}%`)
    .join(", ");

  if (s.type === "linear") {
    return `linear-gradient(${s.angle}deg, ${stops})`;
  }
  if (s.type === "radial") {
    return `radial-gradient(${s.radialShape} at ${s.radialPosition}, ${stops})`;
  }
  return `conic-gradient(from ${s.angle}deg at ${s.conicPosition}, ${stops})`;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

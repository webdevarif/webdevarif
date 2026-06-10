"use client";

import { useMemo, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@kit/ui/components/select";

import { CopyButton } from "../../_components/copy-button";
import { Card, CodeBlock, SectionLabel } from "../../_components/tool-shell";

// ─── Setting type catalog ──────────────────────────────────────────

type SettingType =
  | "text"
  | "textarea"
  | "richtext"
  | "url"
  | "color"
  | "color_scheme"
  | "image_picker"
  | "video"
  | "range"
  | "checkbox"
  | "select"
  | "header"
  | "paragraph";

const SETTING_TYPES: { value: SettingType; label: string; hint?: string }[] = [
  { value: "text", label: "text" },
  { value: "textarea", label: "textarea" },
  { value: "richtext", label: "richtext" },
  { value: "url", label: "url" },
  { value: "color", label: "color" },
  { value: "color_scheme", label: "color_scheme" },
  { value: "image_picker", label: "image_picker" },
  { value: "video", label: "video" },
  { value: "range", label: "range (slider)" },
  { value: "checkbox", label: "checkbox" },
  { value: "select", label: "select" },
  { value: "header", label: "— header (visual)" },
  { value: "paragraph", label: "— paragraph (visual)" },
];

type Setting = {
  uid: string;
  type: SettingType;
  id: string;
  label: string;
  default?: string;
  // range
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  // select
  options?: { value: string; label: string }[];
  // header / paragraph
  content?: string;
};

type Block = {
  uid: string;
  type: string;
  name: string;
  settings: Setting[];
};

type Preset = {
  uid: string;
  name: string;
};

// ─── Main tool ─────────────────────────────────────────────────────

export function SchemaTool() {
  const [name, setName] = useState("Custom Section");
  const [tag, setTag] = useState("section");
  const [className, setClassName] = useState("custom-section");
  const [acceptThemeBlocks, setAcceptThemeBlocks] = useState(true);
  const [settings, setSettings] = useState<Setting[]>([
    newSetting("text", "heading", "Heading", { default: "Hello world" }),
  ]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [presets, setPresets] = useState<Preset[]>([
    { uid: uid(), name: "Custom Section" },
  ]);

  const schema = useMemo(
    () =>
      buildSchema({
        name,
        tag,
        className,
        acceptThemeBlocks,
        settings,
        blocks,
        presets,
      }),
    [name, tag, className, acceptThemeBlocks, settings, blocks, presets],
  );

  const liquid = useMemo(() => buildLiquid(schema, className), [
    schema,
    className,
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-6">
        <Card>
          <SectionLabel>— section meta</SectionLabel>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field
              id="sec-name"
              label="name"
              value={name}
              onChange={setName}
              placeholder="Custom Section"
            />
            <Field
              id="sec-tag"
              label="tag"
              value={tag}
              onChange={setTag}
              placeholder="section"
            />
            <Field
              id="sec-class"
              label="class"
              value={className}
              onChange={setClassName}
              placeholder="custom-section"
            />
            <label className="flex items-end gap-2">
              <input
                type="checkbox"
                checked={acceptThemeBlocks}
                onChange={(e) => setAcceptThemeBlocks(e.target.checked)}
                className="size-4 accent-primary"
              />
              <span className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                accept all theme blocks (@theme)
              </span>
            </label>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <SectionLabel>— settings</SectionLabel>
            <SettingTypeMenu
              onPick={(type) =>
                setSettings((s) => [...s, newSetting(type, "", "")])
              }
            />
          </div>

          <ul className="mt-4 space-y-3">
            {settings.map((s, i) => (
              <SettingRow
                key={s.uid}
                setting={s}
                onChange={(next) =>
                  setSettings((arr) => arr.map((x, j) => (j === i ? next : x)))
                }
                onRemove={() =>
                  setSettings((arr) => arr.filter((_, j) => j !== i))
                }
                onMove={(dir) =>
                  setSettings((arr) => move(arr, i, dir))
                }
              />
            ))}
          </ul>
          {settings.length === 0 ? (
            <p className="text-comment mt-3">{`// no settings yet — add one with the + button above`}</p>
          ) : null}
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <SectionLabel>— blocks</SectionLabel>
            <button
              type="button"
              onClick={() =>
                setBlocks((b) => [
                  ...b,
                  { uid: uid(), type: "feature", name: "Feature", settings: [] },
                ])
              }
              className="rounded-sm border border-border bg-background px-2 py-1 font-mono text-[0.65rem] uppercase tracking-wider transition-colors hover:border-primary/40 hover:text-primary"
            >
              + block
            </button>
          </div>

          <ul className="mt-4 space-y-3">
            {blocks.map((b, i) => (
              <BlockRow
                key={b.uid}
                block={b}
                onChange={(next) =>
                  setBlocks((arr) => arr.map((x, j) => (j === i ? next : x)))
                }
                onRemove={() =>
                  setBlocks((arr) => arr.filter((_, j) => j !== i))
                }
              />
            ))}
          </ul>
          {blocks.length === 0 ? (
            <p className="text-comment mt-3">{`// no custom block types — section will accept theme blocks instead`}</p>
          ) : null}
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <SectionLabel>— presets</SectionLabel>
            <button
              type="button"
              onClick={() =>
                setPresets((p) => [...p, { uid: uid(), name: "Preset" }])
              }
              className="rounded-sm border border-border bg-background px-2 py-1 font-mono text-[0.65rem] uppercase tracking-wider transition-colors hover:border-primary/40 hover:text-primary"
            >
              + preset
            </button>
          </div>

          <ul className="mt-4 space-y-2">
            {presets.map((p, i) => (
              <li key={p.uid} className="flex items-center gap-2">
                <input
                  value={p.name}
                  onChange={(e) =>
                    setPresets((arr) =>
                      arr.map((x, j) =>
                        j === i ? { ...x, name: e.target.value } : x,
                      ),
                    )
                  }
                  className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary/40"
                />
                <button
                  type="button"
                  onClick={() =>
                    setPresets((arr) => arr.filter((_, j) => j !== i))
                  }
                  className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground hover:text-destructive"
                >
                  remove
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <SectionLabel>— schema output</SectionLabel>
            <CopyButton text={schema} />
          </div>
          <div className="mt-3">
            <CodeBlock code={schema} />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <SectionLabel>— full section file</SectionLabel>
            <CopyButton text={liquid} />
          </div>
          <p className="text-comment mt-2">
            {`// save as sections/${className || "section"}.liquid`}
          </p>
          <div className="mt-3">
            <CodeBlock code={liquid} />
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Row UIs ───────────────────────────────────────────────────────

function SettingRow({
  setting,
  onChange,
  onRemove,
  onMove,
}: {
  setting: Setting;
  onChange: (s: Setting) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const update = (patch: Partial<Setting>) => onChange({ ...setting, ...patch });

  return (
    <li className="rounded-md border border-border bg-background/50 p-3">
      <div className="flex items-start justify-between gap-2">
        <span className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
          {setting.type}
        </span>
        <div className="flex gap-1 font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
          <button type="button" onClick={() => onMove(-1)} className="hover:text-foreground">↑</button>
          <button type="button" onClick={() => onMove(1)} className="hover:text-foreground">↓</button>
          <button type="button" onClick={onRemove} className="hover:text-destructive">×</button>
        </div>
      </div>

      {setting.type === "header" || setting.type === "paragraph" ? (
        <div className="mt-3">
          <Field
            id={`s-content-${setting.uid}`}
            label="content"
            value={setting.content ?? ""}
            onChange={(v) => update({ content: v })}
          />
        </div>
      ) : (
        <>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field
              id={`s-id-${setting.uid}`}
              label="id"
              value={setting.id}
              onChange={(v) => update({ id: v })}
              placeholder="my_setting"
            />
            <Field
              id={`s-label-${setting.uid}`}
              label="label"
              value={setting.label}
              onChange={(v) => update({ label: v })}
              placeholder="My Setting"
            />
          </div>

          {setting.type !== "color_scheme" &&
          setting.type !== "image_picker" &&
          setting.type !== "video" ? (
            <div className="mt-3">
              <Field
                id={`s-default-${setting.uid}`}
                label="default"
                value={setting.default ?? ""}
                onChange={(v) => update({ default: v })}
                placeholder={defaultPlaceholder(setting.type)}
              />
            </div>
          ) : null}

          {setting.type === "range" ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              <Field
                id={`s-min-${setting.uid}`}
                label="min"
                value={String(setting.min ?? 0)}
                onChange={(v) => update({ min: Number(v) })}
                type="number"
              />
              <Field
                id={`s-max-${setting.uid}`}
                label="max"
                value={String(setting.max ?? 100)}
                onChange={(v) => update({ max: Number(v) })}
                type="number"
              />
              <Field
                id={`s-step-${setting.uid}`}
                label="step"
                value={String(setting.step ?? 1)}
                onChange={(v) => update({ step: Number(v) })}
                type="number"
              />
              <Field
                id={`s-unit-${setting.uid}`}
                label="unit"
                value={setting.unit ?? ""}
                onChange={(v) => update({ unit: v })}
                placeholder="px"
              />
            </div>
          ) : null}

          {setting.type === "select" ? (
            <SelectOptions
              options={setting.options ?? []}
              onChange={(options) => update({ options })}
            />
          ) : null}
        </>
      )}
    </li>
  );
}

function SelectOptions({
  options,
  onChange,
}: {
  options: { value: string; label: string }[];
  onChange: (next: { value: string; label: string }[]) => void;
}) {
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground/60">
          options
        </span>
        <button
          type="button"
          onClick={() => onChange([...options, { value: "", label: "" }])}
          className="rounded-sm border border-border bg-background px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider hover:border-primary/40 hover:text-primary"
        >
          + option
        </button>
      </div>
      <ul className="mt-2 space-y-2">
        {options.map((opt, i) => (
          <li key={i} className="flex items-center gap-2">
            <input
              value={opt.value}
              placeholder="value"
              onChange={(e) =>
                onChange(
                  options.map((x, j) =>
                    j === i ? { ...x, value: e.target.value } : x,
                  ),
                )
              }
              className="w-32 rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus:border-primary/40"
            />
            <input
              value={opt.label}
              placeholder="label"
              onChange={(e) =>
                onChange(
                  options.map((x, j) =>
                    j === i ? { ...x, label: e.target.value } : x,
                  ),
                )
              }
              className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus:border-primary/40"
            />
            <button
              type="button"
              onClick={() => onChange(options.filter((_, j) => j !== i))}
              className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground hover:text-destructive"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BlockRow({
  block,
  onChange,
  onRemove,
}: {
  block: Block;
  onChange: (b: Block) => void;
  onRemove: () => void;
}) {
  return (
    <li className="rounded-md border border-border bg-background/50 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
          custom block
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground hover:text-destructive"
        >
          remove
        </button>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field
          id={`b-type-${block.uid}`}
          label="type"
          value={block.type}
          onChange={(v) => onChange({ ...block, type: v })}
          placeholder="feature"
        />
        <Field
          id={`b-name-${block.uid}`}
          label="name"
          value={block.name}
          onChange={(v) => onChange({ ...block, name: v })}
          placeholder="Feature"
        />
      </div>
    </li>
  );
}

function SettingTypeMenu({
  onPick,
}: {
  onPick: (t: SettingType) => void;
}) {
  return (
    <Select
      value=""
      onValueChange={(v) => {
        if (v) onPick(v as SettingType);
      }}
    >
      <SelectTrigger className="w-44 font-mono text-[0.65rem] uppercase tracking-wider">
        <SelectValue placeholder="+ add setting" />
      </SelectTrigger>
      <SelectContent>
        {SETTING_TYPES.map((t) => (
          <SelectItem key={t.value} value={t.value}>
            {t.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "number";
}) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1">
      <span className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground/60">
        {label}
      </span>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary/40"
      />
    </label>
  );
}

// ─── Schema/Liquid builders ────────────────────────────────────────

function buildSchema(input: {
  name: string;
  tag: string;
  className: string;
  acceptThemeBlocks: boolean;
  settings: Setting[];
  blocks: Block[];
  presets: Preset[];
}): string {
  const root: Record<string, unknown> = {
    name: input.name || "Custom Section",
  };
  if (input.tag) root.tag = input.tag;
  if (input.className) root.class = input.className;

  if (input.settings.length > 0) {
    root.settings = input.settings.map(serialiseSetting);
  }

  const blockEntries: Record<string, unknown>[] = [];
  if (input.acceptThemeBlocks) blockEntries.push({ type: "@theme" });
  for (const b of input.blocks) {
    blockEntries.push({
      type: b.type || "custom",
      name: b.name || b.type || "Block",
      settings: b.settings.map(serialiseSetting),
    });
  }
  if (blockEntries.length > 0) root.blocks = blockEntries;

  if (input.presets.length > 0) {
    root.presets = input.presets.map((p) => ({
      name: p.name || input.name || "Preset",
    }));
  }

  return JSON.stringify(root, null, 2);
}

function serialiseSetting(s: Setting): Record<string, unknown> {
  if (s.type === "header" || s.type === "paragraph") {
    return { type: s.type, content: s.content ?? "" };
  }
  const out: Record<string, unknown> = {
    type: s.type,
    id: s.id || "setting",
    label: s.label || "Setting",
  };
  if (s.default !== undefined && s.default !== "") {
    out.default = coerceDefault(s.type, s.default);
  }
  if (s.type === "range") {
    out.min = s.min ?? 0;
    out.max = s.max ?? 100;
    out.step = s.step ?? 1;
    if (s.unit) out.unit = s.unit;
  }
  if (s.type === "select" && s.options && s.options.length > 0) {
    out.options = s.options.map((o) => ({
      value: o.value,
      label: o.label || o.value,
    }));
  }
  return out;
}

function coerceDefault(type: SettingType, raw: string): unknown {
  if (type === "checkbox") return raw === "true" || raw === "1";
  if (type === "range") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : raw;
  }
  return raw;
}

function buildLiquid(schema: string, className: string): string {
  return `{%- comment -%}
  sections/${className || "section"}.liquid
{%- endcomment -%}

<section class="${className || "section"} section-{{ section.id }}">
  {% content_for 'blocks' %}
</section>

{% style %}
  .section-{{ section.id }} {
    /* scoped overrides go here */
  }
{% endstyle %}

{% schema %}
${schema}
{% endschema %}
`;
}

// ─── Helpers ───────────────────────────────────────────────────────

function newSetting(
  type: SettingType,
  id: string,
  label: string,
  overrides: Partial<Setting> = {},
): Setting {
  return {
    uid: uid(),
    type,
    id,
    label,
    ...(type === "range"
      ? { min: 0, max: 100, step: 1 }
      : type === "select"
        ? { options: [{ value: "one", label: "One" }] }
        : type === "header" || type === "paragraph"
          ? { content: "Section header" }
          : {}),
    ...overrides,
  };
}

function defaultPlaceholder(type: SettingType): string {
  if (type === "checkbox") return "true / false";
  if (type === "color") return "#000000";
  if (type === "url") return "/collections/all";
  if (type === "range") return "16";
  return "";
}

function move<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const next = [...arr];
  const target = i + dir;
  if (target < 0 || target >= next.length) return arr;
  const itemA = next[i]!;
  const itemB = next[target]!;
  next[i] = itemB;
  next[target] = itemA;
  return next;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

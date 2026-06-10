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

type OwnerType =
  | "PRODUCT"
  | "PRODUCTVARIANT"
  | "COLLECTION"
  | "CUSTOMER"
  | "ORDER"
  | "PAGE"
  | "BLOG"
  | "ARTICLE"
  | "SHOP";

const OWNER_TYPES: { value: OwnerType; label: string; liquid: string }[] = [
  { value: "PRODUCT", label: "Product", liquid: "product" },
  { value: "PRODUCTVARIANT", label: "Variant", liquid: "variant" },
  { value: "COLLECTION", label: "Collection", liquid: "collection" },
  { value: "CUSTOMER", label: "Customer", liquid: "customer" },
  { value: "ORDER", label: "Order", liquid: "order" },
  { value: "PAGE", label: "Page", liquid: "page" },
  { value: "BLOG", label: "Blog", liquid: "blog" },
  { value: "ARTICLE", label: "Article", liquid: "article" },
  { value: "SHOP", label: "Shop", liquid: "shop" },
];

type FieldType =
  | "single_line_text_field"
  | "multi_line_text_field"
  | "rich_text_field"
  | "url"
  | "color"
  | "boolean"
  | "number_integer"
  | "number_decimal"
  | "date"
  | "date_time"
  | "rating"
  | "money"
  | "json"
  | "file_reference"
  | "page_reference"
  | "product_reference"
  | "variant_reference"
  | "collection_reference"
  | "list.single_line_text_field"
  | "list.product_reference"
  | "list.collection_reference"
  | "list.color"
  | "list.number_integer";

const FIELD_TYPES: { value: FieldType; label: string; group: string }[] = [
  { value: "single_line_text_field", label: "single line text", group: "Text" },
  { value: "multi_line_text_field", label: "multi line text", group: "Text" },
  { value: "rich_text_field", label: "rich text", group: "Text" },
  { value: "url", label: "url", group: "Text" },
  { value: "color", label: "color", group: "Visual" },
  { value: "boolean", label: "boolean", group: "Number" },
  { value: "number_integer", label: "integer", group: "Number" },
  { value: "number_decimal", label: "decimal", group: "Number" },
  { value: "date", label: "date", group: "Date" },
  { value: "date_time", label: "date_time", group: "Date" },
  { value: "rating", label: "rating", group: "Number" },
  { value: "money", label: "money", group: "Number" },
  { value: "json", label: "json", group: "Advanced" },
  { value: "file_reference", label: "file reference", group: "Reference" },
  { value: "page_reference", label: "page reference", group: "Reference" },
  { value: "product_reference", label: "product reference", group: "Reference" },
  { value: "variant_reference", label: "variant reference", group: "Reference" },
  { value: "collection_reference", label: "collection reference", group: "Reference" },
  { value: "list.single_line_text_field", label: "list · single line text", group: "List" },
  { value: "list.product_reference", label: "list · product reference", group: "List" },
  { value: "list.collection_reference", label: "list · collection reference", group: "List" },
  { value: "list.color", label: "list · color", group: "List" },
  { value: "list.number_integer", label: "list · integer", group: "List" },
];

export function MetafieldTool() {
  const [owner, setOwner] = useState<OwnerType>("PRODUCT");
  const [name, setName] = useState("Care instructions");
  const [namespace, setNamespace] = useState("custom");
  const [key, setKey] = useState("care_instructions");
  const [description, setDescription] = useState(
    "How to care for this product",
  );
  const [type, setType] = useState<FieldType>("multi_line_text_field");

  const ownerInfo = useMemo(
    () => OWNER_TYPES.find((o) => o.value === owner) ?? OWNER_TYPES[0]!,
    [owner],
  );

  const definitionJSON = useMemo(
    () =>
      JSON.stringify(
        {
          definition: {
            name,
            namespace,
            key,
            description,
            type,
            ownerType: owner,
          },
        },
        null,
        2,
      ),
    [name, namespace, key, description, type, owner],
  );

  const graphqlMutation = useMemo(
    () =>
      `mutation CreateMetafieldDefinition {
  metafieldDefinitionCreate(
    definition: {
      name: "${escapeGql(name)}"
      namespace: "${escapeGql(namespace)}"
      key: "${escapeGql(key)}"
      description: "${escapeGql(description)}"
      type: "${type}"
      ownerType: ${owner}
    }
  ) {
    createdDefinition { id name }
    userErrors { field message }
  }
}`,
    [name, namespace, key, description, type, owner],
  );

  const liquidRender = useMemo(
    () => buildLiquidRender(ownerInfo.liquid, namespace, key, type),
    [ownerInfo.liquid, namespace, key, type],
  );

  const themeAppExtension = useMemo(
    () => buildThemeAppExtensionSetting(namespace, key, type),
    [namespace, key, type],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <Card>
        <SectionLabel>— metafield definition</SectionLabel>

        <div className="mt-4 space-y-4">
          <Select
            id="owner"
            label="owner resource"
            value={owner}
            onChange={(v) => setOwner(v as OwnerType)}
            options={OWNER_TYPES.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
          />

          <Field
            id="name"
            label="name"
            value={name}
            onChange={setName}
            placeholder="Care instructions"
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              id="namespace"
              label="namespace"
              value={namespace}
              onChange={setNamespace}
              placeholder="custom"
              hint="lowercase, letters/digits/_"
            />
            <Field
              id="key"
              label="key"
              value={key}
              onChange={setKey}
              placeholder="care_instructions"
              hint="lowercase, letters/digits/_"
            />
          </div>

          <Field
            id="desc"
            label="description"
            value={description}
            onChange={setDescription}
            placeholder="What is this field for?"
          />

          <Select
            id="type"
            label="content type"
            value={type}
            onChange={(v) => setType(v as FieldType)}
            options={FIELD_TYPES.map((t) => ({
              value: t.value,
              label: `${t.group} — ${t.label}`,
            }))}
          />

          <div className="rounded-md border border-border bg-background/60 p-3">
            <p className="text-comment">
              {`// access path: ${ownerInfo.liquid}.metafields.${namespace}.${key}`}
            </p>
          </div>
        </div>
      </Card>

      <div className="space-y-6">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <SectionLabel>— liquid render snippet</SectionLabel>
            <CopyButton text={liquidRender} />
          </div>
          <p className="text-comment mt-2">
            {`// null-safe — won't break if the metafield isn't set`}
          </p>
          <div className="mt-3">
            <CodeBlock code={liquidRender} />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <SectionLabel>— graphql mutation</SectionLabel>
            <CopyButton text={graphqlMutation} />
          </div>
          <p className="text-comment mt-2">
            {`// create the definition programmatically via the admin api`}
          </p>
          <div className="mt-3">
            <CodeBlock code={graphqlMutation} />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <SectionLabel>— theme app extension setting</SectionLabel>
            <CopyButton text={themeAppExtension} />
          </div>
          <p className="text-comment mt-2">
            {`// drop into your section schema to let merchants pick the metafield`}
          </p>
          <div className="mt-3">
            <CodeBlock code={themeAppExtension} />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <SectionLabel>— definition (json)</SectionLabel>
            <CopyButton text={definitionJSON} />
          </div>
          <div className="mt-3">
            <CodeBlock code={definitionJSON} />
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Liquid render builders ─────────────────────────────────────────

function buildLiquidRender(
  ownerLiquid: string,
  namespace: string,
  key: string,
  type: FieldType,
): string {
  const access = `${ownerLiquid}.metafields.${namespace}.${key}`;
  const valueRef = `${access}.value`;
  const meta = `${access}`;

  if (type.startsWith("list.")) {
    const inner = type.replace("list.", "");
    return `{%- if ${valueRef} != blank -%}
  <ul class="metafield-list">
    {%- for item in ${valueRef} -%}
      <li>
        ${renderInnerListItem(inner as FieldType)}
      </li>
    {%- endfor -%}
  </ul>
{%- endif -%}`;
  }

  switch (type) {
    case "rich_text_field":
      return `{%- if ${valueRef} != blank -%}
  <div class="metafield-richtext">
    {{ ${meta} | metafield_tag }}
  </div>
{%- endif -%}`;
    case "multi_line_text_field":
      return `{%- if ${valueRef} != blank -%}
  <p class="metafield-text">{{ ${valueRef} | newline_to_br }}</p>
{%- endif -%}`;
    case "single_line_text_field":
      return `{%- if ${valueRef} != blank -%}
  <span>{{ ${valueRef} | escape }}</span>
{%- endif -%}`;
    case "url":
      return `{%- if ${valueRef} != blank -%}
  <a href="{{ ${valueRef} }}" target="_blank" rel="noopener">
    {{ ${valueRef} }}
  </a>
{%- endif -%}`;
    case "color":
      return `{%- if ${valueRef} != blank -%}
  <span class="swatch" style="background: {{ ${valueRef} }}; display:inline-block; width:24px; height:24px; border-radius:50%;"></span>
{%- endif -%}`;
    case "boolean":
      return `{%- if ${valueRef} -%}
  <span class="badge badge--on">Yes</span>
{%- else -%}
  <span class="badge badge--off">No</span>
{%- endif -%}`;
    case "number_integer":
    case "number_decimal":
      return `{%- if ${valueRef} != blank -%}
  <span>{{ ${valueRef} }}</span>
{%- endif -%}`;
    case "money":
      return `{%- if ${valueRef} != blank -%}
  <span class="price">{{ ${valueRef} | money }}</span>
{%- endif -%}`;
    case "rating":
      return `{%- if ${meta} != blank -%}
  {%- assign r = ${meta}.value -%}
  <span class="rating" aria-label="{{ r.value }} out of {{ r.scale_max }}">
    {{ r.value }} / {{ r.scale_max }}
  </span>
{%- endif -%}`;
    case "date":
      return `{%- if ${valueRef} != blank -%}
  <time datetime="{{ ${valueRef} }}">{{ ${valueRef} | date: "%B %-d, %Y" }}</time>
{%- endif -%}`;
    case "date_time":
      return `{%- if ${valueRef} != blank -%}
  <time datetime="{{ ${valueRef} }}">{{ ${valueRef} | date: "%B %-d, %Y · %-l:%M %p" }}</time>
{%- endif -%}`;
    case "json":
      return `{%- if ${valueRef} != blank -%}
  {%- comment -%} JSON is a hash — access individual keys: {%- endcomment -%}
  <pre>{{ ${valueRef} | json }}</pre>
{%- endif -%}`;
    case "file_reference":
      return `{%- if ${valueRef} != blank -%}
  {%- assign file = ${valueRef} -%}
  {%- if file.image -%}
    <img src="{{ file | image_url: width: 800 }}" alt="{{ file.alt | escape }}" loading="lazy">
  {%- else -%}
    <a href="{{ file.url }}" download>Download</a>
  {%- endif -%}
{%- endif -%}`;
    case "page_reference":
      return `{%- if ${valueRef} != blank -%}
  {%- assign page_ref = ${valueRef} -%}
  <a href="{{ page_ref.url }}">{{ page_ref.title | escape }}</a>
{%- endif -%}`;
    case "product_reference":
      return `{%- if ${valueRef} != blank -%}
  {%- assign p = ${valueRef} -%}
  <a href="{{ p.url }}" class="product-card">
    {%- if p.featured_image -%}
      <img src="{{ p.featured_image | image_url: width: 400 }}" alt="{{ p.title | escape }}" loading="lazy">
    {%- endif -%}
    <span>{{ p.title | escape }}</span>
  </a>
{%- endif -%}`;
    case "variant_reference":
      return `{%- if ${valueRef} != blank -%}
  {%- assign v = ${valueRef} -%}
  <span>{{ v.product.title | escape }} — {{ v.title | escape }}</span>
{%- endif -%}`;
    case "collection_reference":
      return `{%- if ${valueRef} != blank -%}
  {%- assign c = ${valueRef} -%}
  <a href="{{ c.url }}">{{ c.title | escape }} ({{ c.products_count }})</a>
{%- endif -%}`;
    default:
      return `{%- if ${valueRef} != blank -%}
  <span>{{ ${valueRef} }}</span>
{%- endif -%}`;
  }
}

function renderInnerListItem(inner: FieldType): string {
  switch (inner) {
    case "product_reference":
      return `<a href="{{ item.url }}">{{ item.title | escape }}</a>`;
    case "collection_reference":
      return `<a href="{{ item.url }}">{{ item.title | escape }}</a>`;
    case "color":
      return `<span class="swatch" style="background: {{ item }}; display:inline-block; width:20px; height:20px; border-radius:50%;"></span>`;
    case "number_integer":
      return `<span>{{ item }}</span>`;
    case "single_line_text_field":
    default:
      return `<span>{{ item | escape }}</span>`;
  }
}

function buildThemeAppExtensionSetting(
  namespace: string,
  key: string,
  type: FieldType,
): string {
  const acceptType = type.startsWith("list.") ? type.replace("list.", "") : type;
  return `{
  "type": "${type}",
  "id": "metafield_picker",
  "label": "Metafield",
  "info": "Pick a metafield to render"
}

// Or use the namespace+key directly via:
//   {{ section.settings.metafield_picker }}
//   {{ product.metafields.${namespace}.${key} | metafield_tag }}

{%- comment -%} For typed pickers, use the metaobject_reference family. {%- endcomment -%}
{%- comment -%} accepts: ${acceptType} {%- endcomment -%}`;
}

function escapeGql(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

// ─── UI primitives ──────────────────────────────────────────────────

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground/60">
        {label}
      </span>
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/40"
      />
      {hint ? (
        <span className="text-comment mt-1 block text-[0.6rem]">{`// ${hint}`}</span>
      ) : null}
    </label>
  );
}

function Select({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="block">
      <label
        htmlFor={id}
        className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground/60"
      >
        {label}
      </label>
      <ShadcnSelect value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="mt-1 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </ShadcnSelect>
    </div>
  );
}

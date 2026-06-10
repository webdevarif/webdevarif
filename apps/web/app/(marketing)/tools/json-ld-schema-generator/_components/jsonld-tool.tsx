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

type SchemaType = "Product" | "Organization" | "FAQPage" | "BreadcrumbList";

export function JsonLdTool() {
  const [type, setType] = useState<SchemaType>("Product");
  const [liquid, setLiquid] = useState(true);

  return (
    <div className="space-y-6">
      <Card>
        <SectionLabel>— schema type</SectionLabel>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-md border border-border bg-background p-1">
            {(
              ["Product", "Organization", "FAQPage", "BreadcrumbList"] as const
            ).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`rounded-sm px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-wider transition-colors ${
                  type === t
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setLiquid((v) => !v)}
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 transition-colors ${
              liquid
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            <span
              className={`relative inline-flex h-4 w-7 rounded-full transition-colors ${
                liquid ? "bg-primary" : "bg-border"
              }`}
            >
              <span
                className={`absolute top-0.5 size-3 rounded-full bg-background transition-transform ${
                  liquid ? "translate-x-3.5" : "translate-x-0.5"
                }`}
              />
            </span>
            <span className="font-mono text-[0.65rem] uppercase tracking-wider">
              Liquid bindings
            </span>
          </button>
        </div>
        <p className="text-comment mt-3">
          {liquid
            ? `// values come from shopify objects — paste inside templates/product.liquid or similar`
            : `// static values — useful for static pages / hand-edited blocks`}
        </p>
      </Card>

      {type === "Product" ? (
        <ProductPanel liquid={liquid} />
      ) : type === "Organization" ? (
        <OrganizationPanel liquid={liquid} />
      ) : type === "FAQPage" ? (
        <FAQPanel />
      ) : (
        <BreadcrumbPanel liquid={liquid} />
      )}
    </div>
  );
}

// ─── Product ───────────────────────────────────────────────────────

function ProductPanel({ liquid }: { liquid: boolean }) {
  const [name, setName] = useState("Acme T-Shirt");
  const [sku, setSku] = useState("ACME-001");
  const [brand, setBrand] = useState("Acme");
  const [description, setDescription] = useState("A premium cotton tee.");
  const [image, setImage] = useState("https://cdn.shopify.com/.../image.jpg");
  const [price, setPrice] = useState("29.00");
  const [currency, setCurrency] = useState("USD");
  const [availability, setAvailability] = useState("InStock");

  const json = useMemo(() => {
    const body = liquid
      ? {
          "@context": "https://schema.org/",
          "@type": "Product",
          name: "{{ product.title | escape }}",
          image: ["{{ product.featured_image | image_url: width: 1200 }}"],
          description: "{{ product.description | strip_html | escape }}",
          sku: "{{ product.selected_or_first_available_variant.sku }}",
          brand: {
            "@type": "Brand",
            name: "{{ product.vendor | escape }}",
          },
          offers: {
            "@type": "Offer",
            url: "{{ shop.url }}{{ product.url }}",
            priceCurrency: "{{ cart.currency.iso_code }}",
            price: "{{ product.selected_or_first_available_variant.price | money_without_currency | replace: ',', '' }}",
            availability:
              "{% if product.available %}https://schema.org/InStock{% else %}https://schema.org/OutOfStock{% endif %}",
            itemCondition: "https://schema.org/NewCondition",
          },
        }
      : {
          "@context": "https://schema.org/",
          "@type": "Product",
          name,
          image: [image],
          description,
          sku,
          brand: { "@type": "Brand", name: brand },
          offers: {
            "@type": "Offer",
            priceCurrency: currency,
            price,
            availability: `https://schema.org/${availability}`,
            itemCondition: "https://schema.org/NewCondition",
          },
        };
    return wrapScript(JSON.stringify(body, null, 2));
  }, [
    liquid,
    name,
    sku,
    brand,
    description,
    image,
    price,
    currency,
    availability,
  ]);

  if (liquid) {
    return (
      <Output
        code={json}
        hint="paste inside <head> or just before </body> · values come from product.* — nothing to edit"
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <Card>
        <SectionLabel>— product details</SectionLabel>
        <div className="mt-4 space-y-4">
          <Field id="name" label="name" value={name} onChange={setName} />
          <Field id="sku" label="sku" value={sku} onChange={setSku} />
          <Field id="brand" label="brand" value={brand} onChange={setBrand} />
          <Field
            id="image"
            label="image url"
            value={image}
            onChange={setImage}
          />
          <Field
            id="desc"
            label="description"
            value={description}
            onChange={setDescription}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <Field id="price" label="price" value={price} onChange={setPrice} />
            <Field
              id="currency"
              label="currency"
              value={currency}
              onChange={setCurrency}
            />
            <Select
              id="avail"
              label="availability"
              value={availability}
              onChange={setAvailability}
              options={[
                "InStock",
                "OutOfStock",
                "PreOrder",
                "BackOrder",
                "Discontinued",
              ]}
            />
          </div>
        </div>
      </Card>

      <Output code={json} hint="paste inside <head> or just before </body>" />
    </div>
  );
}

// ─── Organization ──────────────────────────────────────────────────

function OrganizationPanel({ liquid }: { liquid: boolean }) {
  const [name, setName] = useState("webdevarif");
  const [url, setUrl] = useState("https://webdevarif.com");
  const [logo, setLogo] = useState("https://webdevarif.com/logo.png");
  const [sameAs, setSameAs] = useState(
    "https://github.com/webdevarif,https://linkedin.com/in/webdevarif",
  );

  const json = useMemo(() => {
    const body = liquid
      ? {
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "{{ shop.name | escape }}",
          url: "{{ shop.url }}",
          logo: "{{ shop.brand.logo | image_url: width: 600 }}",
          sameAs: ["{{ shop.brand.short_description | escape }}"],
        }
      : {
          "@context": "https://schema.org",
          "@type": "Organization",
          name,
          url,
          logo,
          sameAs: sameAs
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        };
    return wrapScript(JSON.stringify(body, null, 2));
  }, [liquid, name, url, logo, sameAs]);

  if (liquid) {
    return (
      <Output
        code={json}
        hint="paste inside layout/theme.liquid <head> · values come from shop.* — nothing to edit"
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <Card>
        <SectionLabel>— organization details</SectionLabel>
        <div className="mt-4 space-y-4">
          <Field id="org-name" label="name" value={name} onChange={setName} />
          <Field id="org-url" label="url" value={url} onChange={setUrl} />
          <Field
            id="org-logo"
            label="logo url"
            value={logo}
            onChange={setLogo}
          />
          <Field
            id="org-sameas"
            label="social profiles (comma-separated)"
            value={sameAs}
            onChange={setSameAs}
          />
        </div>
      </Card>

      <Output code={json} hint="paste inside layout/theme.liquid <head>" />
    </div>
  );
}

// ─── FAQ ───────────────────────────────────────────────────────────

type Faq = { uid: string; q: string; a: string };

function FAQPanel() {
  const [items, setItems] = useState<Faq[]>([
    { uid: uid(), q: "Do you offer refunds?", a: "Yes, within 30 days." },
    { uid: uid(), q: "How fast is shipping?", a: "3-5 business days domestic." },
  ]);

  const json = useMemo(() => {
    const body = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: items.map((it) => ({
        "@type": "Question",
        name: it.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: it.a,
        },
      })),
    };
    return wrapScript(JSON.stringify(body, null, 2));
  }, [items]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <Card>
        <div className="flex items-center justify-between gap-3">
          <SectionLabel>— faq items</SectionLabel>
          <button
            type="button"
            onClick={() =>
              setItems((arr) => [...arr, { uid: uid(), q: "", a: "" }])
            }
            className="rounded-sm border border-border bg-background px-2 py-1 font-mono text-[0.65rem] uppercase tracking-wider hover:border-primary/40 hover:text-primary"
          >
            + question
          </button>
        </div>

        <ul className="mt-4 space-y-3">
          {items.map((it, i) => (
            <li
              key={it.uid}
              className="rounded-md border border-border bg-background/50 p-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
                  Q{i + 1}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setItems((arr) => arr.filter((x) => x.uid !== it.uid))
                  }
                  className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground hover:text-destructive"
                >
                  remove
                </button>
              </div>
              <Field
                id={`q-${it.uid}`}
                label="question"
                value={it.q}
                onChange={(v) =>
                  setItems((arr) =>
                    arr.map((x) => (x.uid === it.uid ? { ...x, q: v } : x)),
                  )
                }
              />
              <Field
                id={`a-${it.uid}`}
                label="answer"
                value={it.a}
                onChange={(v) =>
                  setItems((arr) =>
                    arr.map((x) => (x.uid === it.uid ? { ...x, a: v } : x)),
                  )
                }
              />
            </li>
          ))}
        </ul>
      </Card>

      <Output code={json} hint="paste on the FAQ page" />
    </div>
  );
}

// ─── Breadcrumb ────────────────────────────────────────────────────

function BreadcrumbPanel({ liquid }: { liquid: boolean }) {
  const json = useMemo(() => {
    const body = liquid
      ? {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Home",
              item: "{{ shop.url }}",
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "{{ collection.title | escape }}",
              item: "{{ shop.url }}{{ collection.url }}",
            },
            {
              "@type": "ListItem",
              position: 3,
              name: "{{ product.title | escape }}",
              item: "{{ shop.url }}{{ product.url }}",
            },
          ],
        }
      : {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Home",
              item: "https://example.com/",
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Category",
              item: "https://example.com/category",
            },
            {
              "@type": "ListItem",
              position: 3,
              name: "Product",
              item: "https://example.com/category/product",
            },
          ],
        };
    return wrapScript(JSON.stringify(body, null, 2));
  }, [liquid]);

  return (
    <Output
      code={json}
      hint="paste in templates/product.liquid · default 3-step breadcrumb · edit the JSON directly if you need more or fewer steps"
    />
  );
}

// ─── Output card ───────────────────────────────────────────────────

function Output({ code, hint }: { code: string; hint: string }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <SectionLabel>— jsonld output</SectionLabel>
        <CopyButton text={code} />
      </div>
      <p className="text-comment mt-2">{`// ${hint}`}</p>
      <div className="mt-3">
        <CodeBlock code={code} />
      </div>
    </Card>
  );
}

function wrapScript(json: string): string {
  return `<script type="application/ld+json">
${json}
</script>`;
}

// ─── Primitives ────────────────────────────────────────────────────

function Field({
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
    <label htmlFor={id} className="block">
      <span className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground/60">
        {label}
      </span>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/40"
      />
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
  options: string[];
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
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </ShadcnSelect>
    </div>
  );
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

import Link from "next/link";

import { ClampTool } from "./_components/clamp-tool";

export const metadata = {
  title: "CSS Clamp Generator — Fluid Typography Tool · webdevarif",
  description:
    "Generate responsive font sizes with clamp() — no media queries. Three-point mobile / tablet / desktop input, live preview, and a one-click Shopify Horizon mode (1rem = 10px).",
};

export default function ClampGeneratorPage() {
  return (
    <main className="min-h-screen bg-[#080808] pt-24 pb-24 text-foreground">
      <div className="mx-auto w-full max-w-6xl px-6 lg:px-8">
        <nav className="mb-6 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
          <Link href="/" className="hover:text-primary">
            home
          </Link>
          <span className="mx-2 opacity-50">/</span>
          <span className="text-muted-foreground/70">tools</span>
          <span className="mx-2 opacity-50">/</span>
          <span className="text-foreground">css clamp generator</span>
        </nav>

        <header className="mb-10">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-primary">
            — fluid typography tool
          </p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            CSS Clamp Generator
          </h1>
          <p className="text-comment mt-3 max-w-2xl">
            {`// stop writing media queries for font sizes. enter mobile + tablet + desktop, copy the clamp(). built for shopify horizon themes too — toggle the switch to get 1rem = 10px math.`}
          </p>
        </header>

        <ClampTool />

        <section className="mt-16">
          <p className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
            — how to use the output
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <HelpCard
              title="Regular CSS"
              body="Paste the clamp() value into any font-size rule. Replaces 2-3 media queries with one line."
              code={`h2 {
  font-size: clamp(...);
}`}
            />
            <HelpCard
              title="Shopify Horizon"
              body="Toggle Horizon mode. rem values reflect the 62.5% root. Paste into your section's {% style %} block."
              code={`{% style %}
  .section-{{ section.id }} .h2 {
    font-size: clamp(...);
  }
{% endstyle %}`}
            />
            <HelpCard
              title="Tailwind arbitrary"
              body="Use the Tailwind output as a className. Works with any version that supports arbitrary values."
              code={`<h1 className="text-[clamp(...)]">…</h1>`}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function HelpCard({
  title,
  body,
  code,
}: {
  title: string;
  body: string;
  code: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
      <pre className="mt-3 overflow-x-auto rounded-md border border-border bg-background/60 p-3 font-mono text-xs leading-relaxed text-foreground">
        {code}
      </pre>
    </div>
  );
}

"use client";

import type { ApiEndpoint } from "@/lib/api/catalog";

import { CodeBlock } from "./code-block";

/**
 * Documentation card for a single `/api/v1/*` endpoint: method + path,
 * scope, request schema, and copy-paste curl / fetch / response samples.
 */
export function EndpointCard({
  endpoint,
  baseUrl,
}: {
  endpoint: ApiEndpoint;
  baseUrl: string;
}) {
  const fullUrl = `${baseUrl}${endpoint.path}`;
  const bodyJson = endpoint.requestExample
    ? JSON.stringify(endpoint.requestExample, null, 2)
    : null;

  return (
    <article
      id={endpoint.id}
      className="scroll-mt-20 space-y-4 rounded-xl border border-border bg-card p-5"
    >
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[0.65rem] font-bold uppercase tracking-wider text-primary">
            {endpoint.method}
          </span>
          <code className="break-all font-mono text-sm">{endpoint.path}</code>
          <span className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">
            scope: {endpoint.scope}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{endpoint.summary}</p>
      </header>

      {endpoint.requestFields?.length ? (
        <div className="space-y-1.5">
          <p className="text-label">Request body</p>
          <ul className="space-y-1">
            {endpoint.requestFields.map((f) => (
              <li key={f.name} className="text-xs">
                <code className="font-mono text-foreground">{f.name}</code>
                <span className="ml-1.5 font-mono text-muted-foreground">
                  {f.type}
                </span>
                <span className="ml-2 text-muted-foreground">— {f.note}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <CodeBlock label="curl" code={buildCurl(fullUrl, endpoint.method, bodyJson)} />
      <CodeBlock
        label="javascript (fetch)"
        code={buildFetch(fullUrl, endpoint.method, bodyJson)}
      />
      <CodeBlock
        label="response"
        code={JSON.stringify(endpoint.responseExample, null, 2)}
      />
    </article>
  );
}

const KEY_PLACEHOLDER = "tm_YOUR_API_KEY";

function buildCurl(
  url: string,
  method: string,
  body: string | null,
): string {
  const lines = [
    `curl -X ${method} ${url} \\`,
    `  -H "Authorization: Bearer ${KEY_PLACEHOLDER}" \\`,
  ];
  if (body) {
    lines.push(`  -H "Content-Type: application/json" \\`);
    // Single-quote the JSON for the shell; inner quotes are already double.
    lines.push(`  -d '${body}'`);
  } else {
    // Drop the trailing backslash on the last header line.
    lines[lines.length - 1] = lines[lines.length - 1]!.replace(/ \\$/, "");
  }
  return lines.join("\n");
}

function buildFetch(
  url: string,
  method: string,
  body: string | null,
): string {
  const headers = body
    ? `    Authorization: "Bearer ${KEY_PLACEHOLDER}",\n    "Content-Type": "application/json",`
    : `    Authorization: "Bearer ${KEY_PLACEHOLDER}",`;
  const bodyLine = body
    ? `\n  body: JSON.stringify(${indent(body)}),`
    : "";
  return `const res = await fetch("${url}", {
  method: "${method}",
  headers: {
${headers}
  },${bodyLine}
});
const { ok, data, error } = await res.json();`;
}

/** Re-indent a pretty-printed JSON block to sit inside the fetch snippet. */
function indent(json: string): string {
  return json
    .split("\n")
    .map((line, i) => (i === 0 ? line : `  ${line}`))
    .join("\n");
}

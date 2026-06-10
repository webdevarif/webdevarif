"use client";

import { Button } from "@kit/ui/components/button";

import { API_ENDPOINTS, API_GROUPS, type ApiEndpoint } from "@/lib/api/catalog";
import { API_SCOPES } from "@/lib/api/scopes";

const KEY_PLACEHOLDER = "tm_YOUR_API_KEY";

/**
 * Generates a complete API reference as a markdown file and triggers a
 * browser download. The markdown includes auth instructions, all scopes,
 * and every endpoint with request fields + curl/fetch/response examples.
 */
export function ExportButton({ baseUrl }: { baseUrl: string }) {
  const download = () => {
    const md = buildMarkdown(baseUrl);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "webdevarif-api-docs.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={download}>
      Export .md
    </Button>
  );
}

// ─── Markdown builder ────────────────────────────────────────────────

function buildMarkdown(baseUrl: string): string {
  const lines: string[] = [];

  lines.push("# WebDevArif API Reference");
  lines.push("");
  lines.push(`> Base URL: \`${baseUrl}\``);
  lines.push(`> Generated: ${new Date().toISOString().slice(0, 10)}`);
  lines.push("");

  // Auth
  lines.push("## Authentication");
  lines.push("");
  lines.push("Every request requires a Bearer token in the `Authorization` header:");
  lines.push("");
  lines.push("```");
  lines.push(`Authorization: Bearer ${KEY_PLACEHOLDER}`);
  lines.push("```");
  lines.push("");
  lines.push("Create API keys from the dashboard at `/dashboard/api`. Keys are shown once at creation — copy immediately.");
  lines.push("");

  // Response format
  lines.push("## Response Format");
  lines.push("");
  lines.push("All endpoints return JSON with a uniform envelope:");
  lines.push("");
  lines.push("```json");
  lines.push('// Success');
  lines.push('{ "ok": true, "data": { ... } }');
  lines.push("");
  lines.push('// Error');
  lines.push('{ "ok": false, "error": { "code": "...", "message": "..." } }');
  lines.push("```");
  lines.push("");

  // Scopes
  lines.push("## Scopes");
  lines.push("");
  lines.push("| Scope | Description |");
  lines.push("|-------|-------------|");
  for (const s of API_SCOPES) {
    lines.push(`| \`${s.id}\` | ${s.description} |`);
  }
  lines.push("");

  // Endpoints by group
  lines.push("## Endpoints");
  lines.push("");

  for (const group of API_GROUPS) {
    const endpoints = API_ENDPOINTS.filter((e) => e.group === group);
    lines.push(`### ${group}`);
    lines.push("");

    for (const ep of endpoints) {
      lines.push(...endpointSection(ep, baseUrl));
      lines.push("");
    }
  }

  return lines.join("\n");
}

function endpointSection(ep: ApiEndpoint, baseUrl: string): string[] {
  const lines: string[] = [];
  const fullUrl = `${baseUrl}${ep.path}`;

  lines.push(`#### ${ep.method} \`${ep.path}\``);
  lines.push("");
  lines.push(`**Scope:** \`${ep.scope}\``);
  lines.push("");
  lines.push(ep.summary);
  lines.push("");

  // Request fields
  if (ep.requestFields?.length) {
    lines.push("**Request body:**");
    lines.push("");
    lines.push("| Field | Type | Description |");
    lines.push("|-------|------|-------------|");
    for (const f of ep.requestFields) {
      lines.push(`| \`${f.name}\` | \`${f.type}\` | ${f.note} |`);
    }
    lines.push("");
  }

  // curl
  const bodyJson = ep.requestExample
    ? JSON.stringify(ep.requestExample, null, 2)
    : null;

  lines.push("**curl:**");
  lines.push("");
  lines.push("```bash");
  lines.push(`curl -X ${ep.method} ${fullUrl} \\`);
  lines.push(`  -H "Authorization: Bearer ${KEY_PLACEHOLDER}" \\`);
  if (bodyJson) {
    lines.push(`  -H "Content-Type: application/json" \\`);
    lines.push(`  -d '${bodyJson}'`);
  }
  lines.push("```");
  lines.push("");

  // fetch
  lines.push("**JavaScript (fetch):**");
  lines.push("");
  lines.push("```js");
  lines.push(`const res = await fetch("${fullUrl}", {`);
  lines.push(`  method: "${ep.method}",`);
  lines.push("  headers: {");
  lines.push(`    Authorization: "Bearer ${KEY_PLACEHOLDER}",`);
  if (bodyJson) {
    lines.push(`    "Content-Type": "application/json",`);
  }
  lines.push("  },");
  if (bodyJson) {
    lines.push(`  body: JSON.stringify(${bodyJson}),`);
  }
  lines.push("});");
  lines.push("const { ok, data, error } = await res.json();");
  lines.push("```");
  lines.push("");

  // response
  lines.push("**Response:**");
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify(ep.responseExample, null, 2));
  lines.push("```");

  return lines;
}

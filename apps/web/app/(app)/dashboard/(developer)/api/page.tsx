import { headers } from "next/headers";

import { listApiKeys } from "@kit/database";

import { API_SCOPES } from "@/lib/api/scopes";
import { requireUser } from "@/lib/auth/session";

import { ApiKeysPanel } from "@/app/(app)/dashboard/(projects)/projects/settings/api-keys/_components/api-keys-panel";

import { ApiDocs } from "./_components/api-docs";

export const metadata = {
  title: "API & Docs · webdevarif",
};

export default async function DeveloperApiPage() {
  const user = await requireUser();
  const [keys, baseUrl] = await Promise.all([
    listApiKeys(user.id),
    resolveBaseUrl(),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 sm:px-8">
      <header className="mb-8">
        <p className="text-label">— developers</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          API &amp; Docs
        </h1>
        <p className="text-comment mt-2">
          {`// call your tools from anywhere — create a key, send a POST, get JSON back`}
        </p>
      </header>

      <GettingStarted baseUrl={baseUrl} />

      <section className="mt-12">
        <ApiKeysPanel keys={keys} />
      </section>

      <section className="mt-12 space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Endpoints</h2>
          <p className="text-comment mt-1">
            {`// each endpoint requires a key with the matching scope`}
          </p>
        </div>
        <ApiDocs baseUrl={baseUrl} />
      </section>
    </div>
  );
}

function GettingStarted({ baseUrl }: { baseUrl: string }) {
  return (
    <section className="space-y-5 rounded-xl border border-border bg-card p-5">
      <div>
        <h2 className="text-xl font-semibold">Getting started</h2>
        <p className="text-comment mt-1">
          {`// server-to-server REST — authenticate with a bearer key`}
        </p>
      </div>

      <ol className="space-y-3 text-sm text-muted-foreground">
        <li>
          <span className="font-semibold text-foreground">1.</span> Create an
          API key below and copy it — it is shown only once.
        </li>
        <li>
          <span className="font-semibold text-foreground">2.</span> Send the key
          on every request:{" "}
          <code className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-xs">
            Authorization: Bearer tm_…
          </code>
        </li>
        <li>
          <span className="font-semibold text-foreground">3.</span> POST JSON to
          an endpoint below. The base URL is{" "}
          <code className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-xs">
            {baseUrl}
          </code>
        </li>
      </ol>

      <div className="space-y-2">
        <p className="text-label">Scopes</p>
        <ul className="space-y-1.5">
          {API_SCOPES.map((s) => (
            <li key={s.id} className="text-xs">
              <code className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-foreground">
                {s.id}
              </code>
              <span className="ml-2 text-muted-foreground">
                — {s.description}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-border bg-background/60 p-3">
        <p className="text-comment text-xs">
          {`// keep keys secret — they are not meant for browser-side code. responses are { ok, data } on success or { ok: false, error } on failure.`}
        </p>
      </div>
    </section>
  );
}

async function resolveBaseUrl(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "webdevarif.com";
  return `${proto}://${host}`;
}

import { headers } from "next/headers";

import { listShortLinks } from "@kit/database";

import { requireUser } from "@/lib/auth/session";

import { CreateLinkForm } from "./_components/create-link-form";
import { LinksTable } from "./_components/links-table";

export const metadata = {
  title: "Link Shortener · webdevarif",
};

export default async function LinkShortenerPage() {
  const user = await requireUser();
  const [links, baseUrl] = await Promise.all([
    listShortLinks(user.id),
    resolveBaseUrl(),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 sm:px-8">
      <header className="mb-8">
        <p className="text-label">— utilities</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Link Shortener
        </h1>
        <p className="text-comment mt-2">
          {`// shorten URLs, customize slugs, and track every click`}
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-5">
        <CreateLinkForm baseUrl={baseUrl} />
      </section>

      <section className="mt-8">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Your Links</h2>
          <p className="text-comment mt-1">
            {`// ${links.length} link${links.length === 1 ? "" : "s"} total`}
          </p>
        </div>
        <LinksTable links={links} baseUrl={baseUrl} />
      </section>
    </div>
  );
}

async function resolveBaseUrl(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "webdevarif.com";
  return `${proto}://${host}`;
}

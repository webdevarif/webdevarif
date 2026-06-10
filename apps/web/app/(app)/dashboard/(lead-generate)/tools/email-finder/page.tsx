import { requireUser } from "@/lib/auth/session";

import { FinderTool } from "./_components/finder-tool";

export const metadata = {
  title: "Email Finder · webdevarif",
};

export default async function EmailFinderPage() {
  await requireUser();

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <header>
        <p className="text-label">— lead generate · contact discovery</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Email Finder
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Paste a domain — we scrape its homepage and contact pages for
          <span className="font-mono"> mailto:</span> links + visible emails,
          plus DuckDuckGo for public mentions. No third-party API, no key, no
          cost. Confidence labels tell you what&apos;s solid vs guessed.
        </p>
      </header>

      <section className="mt-8">
        <FinderTool />
      </section>
    </div>
  );
}

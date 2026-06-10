import { requireUser } from "@/lib/auth/session";

import { FinderTool } from "./_components/finder-tool";

export const metadata = {
  title: "Competitor Finder · webdevarif",
};

export default async function CompetitorFinderPage() {
  await requireUser();

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <header>
        <p className="text-label">— competitive intelligence · auto discovery</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Competitor Finder
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your product name and description — AI searches the web to
          discover direct and indirect competitors with pricing, strengths,
          weaknesses, and market positioning.
        </p>
      </header>

      <section className="mt-8">
        <FinderTool />
      </section>
    </div>
  );
}

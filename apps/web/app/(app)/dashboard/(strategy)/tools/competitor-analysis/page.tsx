import { requireUser } from "@/lib/auth/session";

import { CompetitorTool } from "./_components/competitor-tool";

export const metadata = {
  title: "Competitor Analysis · webdevarif",
};

export default async function CompetitorAnalysisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();

  const params = await searchParams;
  const urlsParam = typeof params.urls === "string" ? params.urls : "";
  const initialUrls = urlsParam
    ? urlsParam.split(",").map((u) => u.trim()).filter(Boolean)
    : undefined;

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <header>
        <p className="text-label">— marketing strategy · competitive intelligence</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Competitor Analysis
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Paste 2–5 competitor URLs — we run every audit tool in parallel
          (Website Speed · Mobile · CMS · Domain & Hosting · AI SEO) and
          build a side-by-side scorecard with AI-generated quickest wins.
        </p>
      </header>

      <section className="mt-8">
        <CompetitorTool initialUrls={initialUrls} />
      </section>
    </div>
  );
}

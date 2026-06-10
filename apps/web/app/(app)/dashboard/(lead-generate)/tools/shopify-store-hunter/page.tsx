import { requireUser } from "@/lib/auth/session";

import { HunterTool } from "./_components/hunter-tool";

export const metadata = {
  title: "Shopify Store Hunter · webdevarif",
};

export default async function ShopifyStoreHunterPage() {
  await requireUser();

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <header>
        <p className="text-label">— lead generate · shopify store discovery</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Shopify Store Hunter
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Type a niche — AI searches the web (Shopify directories, social, news)
          and brings back real, small-to-growing Shopify stores you can pitch
          web dev / customisation services to. Skips the giants who already
          have in-house teams.
        </p>
      </header>

      <section className="mt-8">
        <HunterTool />
      </section>
    </div>
  );
}

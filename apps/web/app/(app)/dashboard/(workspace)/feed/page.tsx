import { listFeedSources, listFeedItems } from "@kit/database";

import { requireUser } from "@/lib/auth/session";

import { ensureDefaultSources } from "./_lib/actions";
import { FeedList } from "./_components/feed-list";

export const metadata = {
  title: "Smart Feed · webdevarif",
};

export default async function FeedPage() {
  const user = await requireUser();

  await ensureDefaultSources();

  const [sources, items] = await Promise.all([
    listFeedSources(user.id),
    listFeedItems(user.id, { limit: 100 }),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <header>
        <p className="text-label">&mdash; intelligence &middot; curated feed</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Smart Feed
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          AI-curated trending topics, job opportunities, and business ideas
          based on your skills. Updated daily.
        </p>
      </header>
      <section className="mt-8">
        <FeedList items={items} sources={sources} />
      </section>
    </div>
  );
}

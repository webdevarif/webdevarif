import Link from "next/link";
import { notFound } from "next/navigation";

import {
  findSocialSession,
  listSocialPosts,
} from "@kit/database";

import { requireUser } from "@/lib/auth/session";

import { DeleteButton } from "./_components/delete-button";
import { PostCard } from "./_components/post-card";

export const metadata = {
  title: "Session · Social Studio · webdevarif",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function SocialSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const user = await requireUser();
  const session = await findSocialSession(user.id, id);
  if (!session) notFound();

  const posts = await listSocialPosts(session.id);

  // Group posts by platform — within each, oldest first so "Original"
  // shows above any variants.
  const byPlatform = new Map<
    string,
    Array<(typeof posts)[number]>
  >();
  for (const p of posts) {
    const arr = byPlatform.get(p.platform) ?? [];
    arr.push(p);
    byPlatform.set(p.platform, arr);
  }

  return (
    <div className="mx-auto max-w-7xl px-8 py-10">
      <Link
        href="/dashboard/tools/social-studio"
        className="text-comment hover:text-foreground"
      >
        ← back to sessions
      </Link>

      <header className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-label">— social session</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            {session.topic}
          </h1>
          <p className="text-comment mt-2">
            {`// ${session.tone} · ${session.imageStyle} · ${new Date(session.createdAt).toLocaleString()}${session.modelUsed ? ` · model: ${session.modelUsed}` : ""}`}
          </p>
        </div>
        <DeleteButton id={session.id} />
      </header>

      <div className="mt-8 space-y-10">
        {session.platforms.map((platform) => {
          const items = byPlatform.get(platform) ?? [];
          if (items.length === 0) return null;
          return (
            <section key={platform}>
              <p className="text-label">
                {platform} · {items.length} {items.length === 1 ? "post" : "variants"}
              </p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((p) => (
                  <PostCard
                    key={p.id}
                    post={{
                      id: p.id,
                      platform: p.platform,
                      caption: p.caption,
                      hashtags: p.hashtags,
                      imagePrompt: p.imagePrompt,
                      imageStatus: p.imageStatus,
                      imageProvider: p.imageProvider,
                      imageError: p.imageError,
                      variantLabel: p.variantLabel,
                      createdAt: p.createdAt.toISOString(),
                    }}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

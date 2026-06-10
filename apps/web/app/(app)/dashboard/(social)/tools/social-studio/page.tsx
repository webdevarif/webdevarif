import Link from "next/link";

import { listSocialSessions } from "@kit/database";

import { requireUser } from "@/lib/auth/session";

import { GeneratorForm } from "./_components/generator-form";

export const metadata = {
  title: "Social Studio · webdevarif",
};

export default async function SocialStudioPage() {
  const user = await requireUser();
  const rows = await listSocialSessions(user.id, 100);

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <header>
        <p className="text-label">— marketing · social posts</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Social Studio
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          One topic → captions + image for Instagram, LinkedIn, and Facebook —
          tuned to each platform&apos;s vocab and shape. Free FLUX images via
          Pollinations · variants on tap.
        </p>
      </header>

      <section className="mt-8">
        <GeneratorForm />
      </section>

      <section className="mt-8 space-y-3">
        <p className="text-label">your sessions · {rows.length}</p>

        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/40 p-10 text-center">
            <p className="text-comment">{"// no sessions yet"}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Drop a topic above — Aria&apos;s caption sibling will write the
              copy in seconds.
            </p>
          </div>
        ) : null}

        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/dashboard/tools/social-studio/${r.id}`}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30"
              >
                <div className="min-w-0 flex-1">
                  <h2 className="line-clamp-2 text-sm font-semibold text-foreground">
                    {r.topic}
                  </h2>
                  <p className="text-comment mt-1">
                    {`// ${r.tone} · ${r.imageStyle} · ${new Date(r.createdAt).toLocaleString()}`}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {r.platforms.map((p) => (
                      <span
                        key={p}
                        className="rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[0.625rem] text-muted-foreground"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";

import { findResume } from "@kit/database";

import { requireUser } from "@/lib/auth/session";

import { DeleteButton } from "./_components/detail-actions";

export const metadata = {
  title: "Resume preview · webdevarif",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ResumeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const user = await requireUser();
  const row = await findResume(user.id, id);
  if (!row) notFound();

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <Link
        href="/dashboard/tools/resume-generator"
        className="text-comment hover:text-foreground"
      >
        ← back to resumes
      </Link>

      <header className="mt-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-label">— tailored resume</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            {row.title}
          </h1>
          <p className="text-comment mt-2">
            {`// ${row.source} · ${new Date(row.createdAt).toLocaleString()}${row.modelUsed ? ` · model: ${row.modelUsed}` : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/resumes/${row.id}/pdf`}
            className="rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 font-mono text-[0.6875rem] uppercase tracking-wider text-primary transition-colors hover:bg-primary/15"
          >
            Download PDF
          </a>
          <a
            href={`/api/resumes/${row.id}/html`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-border px-3 py-1.5 font-mono text-[0.6875rem] uppercase tracking-wider text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
          >
            Open HTML ↗
          </a>
          <DeleteButton id={row.id} />
        </div>
      </header>

      {row.jobInfo ? (
        <section className="mt-6 rounded-lg border border-border bg-card p-5">
          <p className="text-label">job summary used</p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {row.jobInfo.summary}
          </p>
          {row.jobInfo.requiredSkills.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {row.jobInfo.requiredSkills.map((s, i) => (
                <span
                  key={i}
                  className="rounded border border-primary/20 bg-primary/5 px-2 py-0.5 font-mono text-[0.625rem] text-primary"
                >
                  {s}
                </span>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
        <iframe
          src={`/api/resumes/${row.id}/html`}
          title="Resume preview"
          className="h-[1100px] w-full"
        />
      </section>
    </div>
  );
}

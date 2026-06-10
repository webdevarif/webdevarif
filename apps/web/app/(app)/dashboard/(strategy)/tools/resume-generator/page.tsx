import Link from "next/link";

import { listResumes } from "@kit/database";

import { requireUser } from "@/lib/auth/session";

import { GeneratorForm } from "./_components/generator-form";

export const metadata = {
  title: "Resume Generator · webdevarif",
};

export default async function ResumeGeneratorPage() {
  const user = await requireUser();
  const rows = await listResumes(user.id, 100);

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <header>
        <p className="text-label">— career · job-tailored resumes</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Resume Generator
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Paste a LinkedIn / Facebook / Upwork job post (or upload a
          screenshot) — AI parses the role, then tailors your base resume
          (Shopify-focused template) to lead with the skills that match.
          Preview as HTML and download as a clean A4 PDF.
        </p>
      </header>

      <section className="mt-8">
        <GeneratorForm />
      </section>

      <section className="mt-8 space-y-3">
        <p className="text-label">your generated resumes · {rows.length}</p>

        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/40 p-10 text-center">
            <p className="text-comment">{"// nothing yet"}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Generate your first tailored resume above. Every one stays
              here so you can re-download the PDF anytime.
            </p>
          </div>
        ) : null}

        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/dashboard/tools/resume-generator/${r.id}`}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30"
              >
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-sm font-semibold text-foreground">
                    {r.title}
                  </h2>
                  <p className="text-comment mt-1">
                    {`// ${r.source} · ${new Date(r.createdAt).toLocaleString()}`}
                  </p>
                  {r.jobInfo ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {r.jobInfo.requiredSkills.slice(0, 8).map((s, i) => (
                        <span
                          key={i}
                          className="rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[0.625rem] text-muted-foreground"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <a
                  href={`/api/resumes/${r.id}/pdf`}
                  className="shrink-0 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 font-mono text-[0.6875rem] uppercase tracking-wider text-primary transition-colors hover:bg-primary/15"
                  onClick={(e) => e.stopPropagation()}
                >
                  Download PDF
                </a>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

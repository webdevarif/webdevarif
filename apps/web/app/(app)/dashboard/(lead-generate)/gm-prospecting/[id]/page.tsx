import Link from "next/link";
import { notFound } from "next/navigation";

import { findProspectByIdForUser } from "@kit/database";

import { requireUser } from "@/lib/auth/session";

export const metadata = {
  title: "Audit · webdevarif",
};

// Reject non-UUID id values up front so we never hit Postgres with a bad type.
// Without this, navigating to /gm-prospecting/<anything-not-a-uuid> would
// throw "invalid input syntax for type uuid" inside Drizzle.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ProspectAuditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const user = await requireUser();
  const prospect = await findProspectByIdForUser(id, user.id);
  if (!prospect) notFound();

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <Link
        href="/dashboard/gm-prospecting"
        className="text-comment hover:text-foreground"
      >
        ← back to prospects
      </Link>

      <header className="mt-6">
        <p className="text-label">— audit report</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          {prospect.name}
        </h1>
        {prospect.formattedAddress ? (
          <p className="text-comment mt-2">{prospect.formattedAddress}</p>
        ) : null}
      </header>

      <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <InfoCard label="Phone" value={prospect.phone ?? "—"} />
        <InfoCard
          label="Website"
          value={
            prospect.website ? (
              <a
                href={prospect.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                {prospect.website.replace(/^https?:\/\//, "")}
              </a>
            ) : (
              "—"
            )
          }
        />
        <InfoCard label="Status" value={prospect.status} />
      </section>

      <section className="mt-6">
        <div className="flex items-baseline justify-between">
          <p className="text-label">— owner contact · from WHOIS / RDAP</p>
          {!prospect.registrantEmail && !prospect.registrantPhone ? (
            <span className="text-comment">
              {"// often redacted by GDPR / WHOIS privacy"}
            </span>
          ) : null}
        </div>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <InfoCard
            label="Registrant email"
            value={
              prospect.registrantEmail ? (
                <a
                  href={`mailto:${prospect.registrantEmail}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {prospect.registrantEmail}
                </a>
              ) : (
                <span className="text-muted-foreground">—</span>
              )
            }
          />
          <InfoCard
            label="Registrant phone"
            value={
              prospect.registrantPhone ? (
                <a
                  href={`tel:${prospect.registrantPhone}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {prospect.registrantPhone}
                </a>
              ) : (
                <span className="text-muted-foreground">—</span>
              )
            }
          />
        </div>
      </section>

      <section className="mt-10 rounded-lg border border-border bg-card p-10">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-sm bg-primary" />
          <h2 className="text-base font-medium">Audit sections</h2>
        </div>
        <p className="mt-4 text-sm text-foreground">
          The 7-section audit (Business Details, Techno Stack, Google Business
          Profile, Listings, Online Reputation, Website Performance, SEO
          Analysis) is the next build phase.
        </p>
        <p className="text-comment mt-2">
          Phase 2C — scoring algorithms + PDF export
        </p>
      </section>
    </div>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <p className="text-label">{label}</p>
      <p className="mt-2 truncate font-mono text-sm">{value}</p>
    </div>
  );
}

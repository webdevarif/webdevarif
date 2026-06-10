/**
 * Public contact card rendered below the video on share pages.
 * Server component — receives already-resolved profile data so we can
 * tailor the call-to-action without bringing client interactivity in.
 */

export type ContactInfo = {
  name: string;
  title: string;
  location: string;
  email: string;
  phone: string;
  website: string;
  linkedin: string;
  github: string;
};

export function ContactCard({ contact }: { contact: ContactInfo }) {
  const initials = contact.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  const cleanLabel = (url: string) =>
    url
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "");

  // Strip to digits for wa.me. Bangladesh numbers stored as "+88 0185-7323271"
  // become "8801857323271" — wa.me accepts the digits without the leading "+".
  const waNumber = contact.phone.replace(/\D+/g, "");
  const waHref = waNumber.length >= 8 ? `https://wa.me/${waNumber}` : null;

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start gap-5">
        {/* Identity */}
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/15 text-base font-extrabold tracking-wider text-primary">
            {initials || "—"}
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold leading-tight">
              {contact.name}
            </p>
            <p className="mt-0.5 text-xs text-primary">{contact.title}</p>
            {contact.location ? (
              <p className="text-comment mt-0.5">
                {`// ${contact.location}`}
              </p>
            ) : null}
          </div>
        </div>

        {/* Primary CTAs — fused segmented group on sm+ */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-0">
          {contact.email ? (
            <a
              href={`mailto:${contact.email}`}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:rounded-r-none"
            >
              <MailIcon className="size-4" />
              <span>Email me</span>
            </a>
          ) : null}
          {waHref ? (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-[oklch(0.72_0.16_150/45%)] bg-[oklch(0.72_0.16_150/12%)] px-4 py-2 text-sm font-semibold text-[oklch(0.82_0.16_150)] transition-colors hover:bg-[oklch(0.72_0.16_150/20%)] sm:rounded-l-none sm:border-l-0"
            >
              <WhatsAppIcon className="size-4" />
              <span>WhatsApp</span>
            </a>
          ) : null}
        </div>
      </div>

      {/* Secondary links */}
      <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
        {contact.email ? (
          <ContactPill
            href={`mailto:${contact.email}`}
            icon={<MailIcon className="size-3.5" />}
            label={contact.email}
          />
        ) : null}
        {contact.phone ? (
          <ContactPill
            href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`}
            icon={<PhoneIcon className="size-3.5" />}
            label={contact.phone}
          />
        ) : null}
        {contact.website ? (
          <ContactPill
            href={contact.website}
            external
            icon={<GlobeIcon className="size-3.5" />}
            label={cleanLabel(contact.website)}
          />
        ) : null}
        {contact.linkedin ? (
          <ContactPill
            href={contact.linkedin}
            external
            icon={<LinkedInIcon className="size-3.5" />}
            label={cleanLabel(contact.linkedin)}
          />
        ) : null}
        {contact.github ? (
          <ContactPill
            href={contact.github}
            external
            icon={<GitHubIcon className="size-3.5" />}
            label={cleanLabel(contact.github)}
          />
        ) : null}
      </div>
    </section>
  );
}

function ContactPill({
  href,
  external = false,
  icon,
  label,
}: {
  href: string;
  external?: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
    >
      {icon}
      <span>{label}</span>
    </a>
  );
}

// ─── Inline icons (no dep, tightly coupled to this component) ──────

type IconProps = { className?: string };

function MailIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function PhoneIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.52 3.45A11.86 11.86 0 0 0 12.04 0C5.46 0 .09 5.37.09 11.95c0 2.11.55 4.17 1.6 5.99L0 24l6.21-1.63a11.94 11.94 0 0 0 5.82 1.49h.01c6.58 0 11.95-5.37 11.95-11.95 0-3.19-1.24-6.19-3.47-8.46Zm-8.48 18.39h-.01a9.92 9.92 0 0 1-5.06-1.39l-.36-.22-3.69.97.99-3.6-.24-.37a9.93 9.93 0 0 1-1.52-5.28c0-5.48 4.46-9.94 9.95-9.94 2.66 0 5.16 1.04 7.04 2.92a9.88 9.88 0 0 1 2.91 7.03c0 5.48-4.46 9.94-9.95 9.94Zm5.46-7.45c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48a9 9 0 0 1-1.66-2.07c-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.21-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.89 1.22 3.09.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.22 1.36.19 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.34Z" />
    </svg>
  );
}

function GlobeIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20M12 2a15.3 15.3 0 0 0 0 20" />
    </svg>
  );
}

function LinkedInIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.26 2.37 4.26 5.45v6.29ZM5.34 7.43a2.06 2.06 0 1 1 0-4.11 2.06 2.06 0 0 1 0 4.11ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45C23.2 24 24 23.23 24 22.28V1.72C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}

function GitHubIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.69-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.28 1.19-3.08-.12-.29-.52-1.47.11-3.05 0 0 .97-.31 3.18 1.17a11.07 11.07 0 0 1 5.79 0c2.2-1.48 3.18-1.17 3.18-1.17.63 1.58.23 2.76.11 3.05.74.8 1.19 1.82 1.19 3.08 0 4.43-2.69 5.4-5.25 5.69.41.35.78 1.04.78 2.11v3.13c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

import { TrackerScript } from "@/components/tracker-script";

/**
 * Layout for /v/[slug] — the public video share route. Adds the
 * Tracker Machine snippet here (instead of the root layout) so the
 * authenticated dashboard's pageviews don't pollute analytics.
 */
export default function PublicVideoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <TrackerScript />
    </>
  );
}

import { TrackerScript } from "@/components/tracker-script";

/**
 * Layout for /r/[token]/* — the public report-share route tree (the
 * shared GM-prospecting reports). Adds the Tracker Machine snippet
 * here so the authenticated dashboard's pageviews don't pollute
 * analytics with admin clicks + private URLs.
 */
export default function PublicReportLayout({
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

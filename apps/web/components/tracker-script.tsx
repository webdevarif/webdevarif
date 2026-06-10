/**
 * Tracker Machine bootstrap for webdevarif.com — included only on
 * public-facing routes:
 *   - (marketing)/* (home + every public tool)
 *   - /v/[slug]     (video share pages)
 *   - /r/[token]/*  (public report share pages)
 *
 * Deliberately NOT included in:
 *   - (app)/*       authenticated dashboard — would pollute analytics
 *                   with the owner's own admin clicks and leak private
 *                   URLs into track_events.url_path
 *   - (auth)/*      sign-in/sign-up — same noise concern; only the
 *                   owner uses these
 *
 * Using a plain <script async> instead of next/script because in
 * Next.js 16 App Router <Script strategy="beforeInteractive"> emits
 * only a <link rel="preload"> and never actually executes the file.
 */
const TRACKER_SRC =
  "https://webdevarif.com/t/_d6O7yRRhEvVeKWwkaC7bA.js";

export function TrackerScript() {
  return <script async src={TRACKER_SRC} />;
}

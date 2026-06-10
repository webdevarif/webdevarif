import "server-only";

/**
 * Normalise an Origin header into a bare hostname.
 *
 *   "https://www.example.com:443" → "www.example.com"
 *   "http://localhost:3000"       → "localhost"
 *
 * Returns null when the value isn't a parseable URL — caller treats
 * that as a hard reject (no Origin → no CORS → no ingest).
 */
export function normaliseOrigin(origin: string | null): string | null {
  if (!origin) return null;
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * The site's registered domain wins for any subdomain too. Examples for
 * registered `example.com`:
 *   - `example.com`        ✓
 *   - `www.example.com`    ✓
 *   - `shop.example.com`   ✓
 *   - `notexample.com`     ✗
 *   - `evil-example.com`   ✗
 *
 * Localhost matches itself only — useful while you're testing the
 * snippet on a dev machine before pointing the site at production.
 */
export function originMatchesDomain(
  originHostname: string,
  registeredDomain: string,
): boolean {
  const o = originHostname.toLowerCase();
  const d = registeredDomain.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!d) return false;
  if (o === d) return true;
  return o.endsWith(`.${d}`);
}

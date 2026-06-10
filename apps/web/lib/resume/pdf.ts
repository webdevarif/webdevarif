import "server-only";

/**
 * Render arbitrary HTML to an A4 PDF using a headless Chromium. The
 * incoming HTML already contains a print stylesheet (the resume CSS) so
 * we just emulate the print media and let Playwright handle the rest.
 *
 * One short-lived browser instance per request — keeps cold-start memory
 * low and avoids leaking state across users.
 *
 * Playwright is loaded LAZILY via dynamic import. When the standalone
 * bundle is missing `playwright-core/browsers.json` (a known pitfall
 * with Next.js file tracing), this contains the failure to the resume
 * PDF endpoint — the rest of the app keeps running.
 */
export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch (err) {
    // Whatever the cause (missing browsers.json in the standalone bundle,
    // un-installed Chromium binaries, broken pnpm install), turn it into a
    // throw the route handler can catch — never an unhandled rejection.
    const msg = err instanceof Error ? err.message : "playwright load failed";
    throw new Error(`PDF renderer unavailable: ${msg}`);
  }
  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await page.setContent(html, { waitUntil: "networkidle" });
    await page.emulateMedia({ media: "print" });

    const buf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "10mm",
        bottom: "10mm",
        left: "10mm",
        right: "10mm",
      },
      preferCSSPageSize: true,
    });

    return buf;
  } finally {
    await browser.close();
  }
}

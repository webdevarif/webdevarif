import { findInvoiceByPublicToken, getClientSettings } from "@kit/database";

import { renderInvoiceHtml } from "@/lib/invoice/render";
import { publicInvoiceUrl, resolveBaseUrl, toDoc } from "@/lib/invoice/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The client's copy of an invoice — `/i/<token>`, no sign-in.
 *
 * Served as a raw HTML response rather than a React page so it is literally
 * the same document the PDF prints. A client who opens the link and a client
 * who opens the attachment must not be able to find a difference.
 *
 * The token is the credential, so:
 *   - drafts 404 (the query layer excludes them) — sharing a link early
 *     cannot expose an invoice you have not sent,
 *   - `noindex` keeps it out of search results,
 *   - nothing here reveals the owner's account or any other client.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params;

  const found = await findInvoiceByPublicToken(token);
  if (!found) {
    return new Response(notFoundHtml(), {
      status: 404,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow",
        "Cache-Control": "no-store",
      },
    });
  }

  const baseUrl = await resolveBaseUrl();
  const settings = await getClientSettings(found.invoice.userId);
  const doc = toDoc(found, settings, baseUrl);

  const html = renderInvoiceHtml(doc)
    .replace(
      "</head>",
      `<meta name="robots" content="noindex, nofollow">
<style>
  .actions { max-width: 800px; margin: 20px auto -8px; padding: 0 8px; display: flex; gap: 10px; }
  .actions a, .actions button {
    display: inline-block; padding: 8px 15px; border-radius: 7px;
    background: #1a1a1f; color: #fff; text-decoration: none;
    font: 600 13px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  }
  .actions .ghost { background: #fff; color: #1a1a1f; border: 1px solid #d8d8df; cursor: pointer; }
  @media print { .actions { display: none !important; } }
</style>
</head>`,
    )
    .replace(
      "<body>",
      `<body>
<div class="actions">
  <a href="${publicInvoiceUrl(baseUrl, found.invoice.publicToken)}/pdf">Download PDF</a>
  <button class="ghost" type="button" onclick="window.print()">Print</button>
</div>`,
    );

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "no-store",
    },
  });
}

/** Deliberately vague: a wrong token must not confirm what does exist. */
function notFoundHtml(): string {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Invoice unavailable</title>
<style>
  body {
    margin: 0; min-height: 100vh; display: grid; place-items: center;
    background: #f4f4f6; color: #1a1a1f;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  }
  .box { text-align: center; padding: 40px; max-width: 420px; }
  h1 { font-size: 20px; margin: 0 0 8px; }
  p { color: #6b6b76; margin: 0; line-height: 1.6; }
</style>
</head><body>
  <div class="box">
    <h1>This invoice is not available</h1>
    <p>The link may have expired, been replaced, or not be shared yet. Reply to the email you received and we will send a fresh one.</p>
  </div>
</body></html>`;
}

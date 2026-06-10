import type { ResumeData } from "@kit/database/schema";

/**
 * Render a tailored {@link ResumeData} into the standalone HTML used for
 * preview + Playwright PDF generation. CSS is inlined and matches the
 * `rsm-` prefixed system from the master template — print rules included
 * so Playwright's `format: "A4"` produces a clean one-page-ish output.
 *
 * Trust boundary: `data.summary` and `experience[].bullets` are allowed
 * to carry the limited HTML the template supports (<strong>, <code>,
 * <span class="rsm-hl">). Everything else is escaped.
 */
export function renderResume(data: ResumeData): string {
  const e = escape;

  const headerContact = [
    e(data.contact.location),
    `<a href="mailto:${e(data.contact.email)}">${e(data.contact.email)}</a>`,
    `<a href="tel:${e(data.contact.phone)}">${e(data.contact.phone)}</a>`,
    linkBare(data.contact.website),
    linkBare(data.contact.linkedin),
    linkBare(data.contact.github),
  ]
    .map((part, i, arr) =>
      i < arr.length - 1
        ? `${part}<span class="rsm-head__contact-sep">·</span>`
        : part,
    )
    .join("");

  const featuredApps = data.featuredApps
    .map(
      (a) => `
        <a class="rsm-app" href="${e(a.href)}" target="_blank" rel="noopener">
          <img class="rsm-app__logo" src="${e(a.iconUrl)}" alt="${e(a.name)} app icon" />
          <div class="rsm-app__body">
            <div class="rsm-app__head">
              <span class="rsm-app__name">${e(a.name)}</span>
              <span class="rsm-app__link">${e(a.linkLabel)}</span>
            </div>
            <p class="rsm-app__desc">${e(a.description)}</p>
          </div>
        </a>`,
    )
    .join("");

  const experience = data.experience
    .map(
      (x) => `
        <article class="rsm-exp-item">
          <img class="rsm-exp-item__logo" src="${e(x.logoUrl)}" alt="${e(x.company)} logo" />
          <div class="rsm-exp-item__body">
            <div class="rsm-exp-item__head">
              <div class="rsm-exp-item__role">${e(x.role)}</div>
              <div class="rsm-exp-item__period">${e(x.period)}</div>
            </div>
            <div class="rsm-exp-item__company">
              <span class="rsm-exp-item__company-name">${e(x.company)}</span>
              <span class="rsm-exp-item__location">${e(x.location)}</span>
            </div>
            <ul class="rsm-exp-item__points">
              ${x.bullets.map((b) => `<li>${sanitizeRichText(b)}</li>`).join("")}
            </ul>
            ${
              x.tags.length > 0
                ? `<div class="rsm-exp-item__tags">${x.tags
                    .map((t) => `<span class="rsm-tag">${e(t)}</span>`)
                    .join("")}</div>`
                : ""
            }
          </div>
        </article>`,
    )
    .join("");

  const shopifyStack = data.shopifyStack
    .map(
      (s) =>
        `<span class="rsm-skill-chip rsm-skill-chip--accent">${e(s)}</span>`,
    )
    .join("");

  const skillGroups = data.skillGroups
    .map(
      (g) => `
        <div class="rsm-skill-group">
          <div class="rsm-skill-group__label">${e(g.label)}</div>
          <div class="rsm-skill-group__items">
            ${g.items.map((it) => `<span class="rsm-skill-chip">${e(it)}</span>`).join("")}
          </div>
        </div>`,
    )
    .join("");

  const education = data.education
    .map(
      (ed) => `
        <div class="rsm-edu-item">
          <div class="rsm-edu-item__school">${e(ed.school)}</div>
          <div class="rsm-edu-item__degree">${e(ed.degree)}</div>
          <div class="rsm-edu-item__year">${e(ed.year)}</div>
        </div>`,
    )
    .join("");

  const languages = data.languages
    .map((l) => `<li><span>${e(l.name)}</span><span>${e(l.level)}</span></li>`)
    .join("");

  const links = data.links
    .map(
      (l) =>
        `<li><a href="${e(l.href)}" target="_blank" rel="noopener">${e(l.label)}</a></li>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${e(data.name)} — ${e(stripTags(data.titleLine))}</title>
<style>${TEMPLATE_CSS}</style>
</head>
<body>
<main class="rsm-page">

  <header class="rsm-head">
    <h1 class="rsm-head__name">${e(data.name)}</h1>
    <div class="rsm-head__title">${e(data.titleLine)}</div>
    <div class="rsm-head__contact">${headerContact}</div>
  </header>

  <section class="rsm-section">
    <h2 class="rsm-section__title">Summary</h2>
    <p class="rsm-summary">${sanitizeRichText(data.summary)}</p>
  </section>

  <div class="rsm-grid">
    <div class="rsm-main">

      ${
        data.featuredApps.length > 0
          ? `<section class="rsm-section">
        <h2 class="rsm-section__title">Featured Shopify Work</h2>
        <div class="rsm-apps-list">${featuredApps}</div>
      </section>`
          : ""
      }

      <section class="rsm-section">
        <h2 class="rsm-section__title">Experience</h2>
        ${experience}
      </section>

    </div>

    <aside class="rsm-side">

      ${
        data.shopifyStack.length > 0
          ? `<section class="rsm-section">
        <h2 class="rsm-section__title">Shopify Stack</h2>
        <div class="rsm-skill-group__items">${shopifyStack}</div>
      </section>`
          : ""
      }

      <section class="rsm-section">
        <h2 class="rsm-section__title">Engineering</h2>
        ${skillGroups}
      </section>

      <section class="rsm-section">
        <h2 class="rsm-section__title">Education</h2>
        ${education}
      </section>

      <section class="rsm-section">
        <h2 class="rsm-section__title">Languages</h2>
        <ul class="rsm-lang-list">${languages}</ul>
      </section>

      <section class="rsm-section">
        <h2 class="rsm-section__title">Online</h2>
        <ul class="rsm-links-list">${links}</ul>
      </section>

    </aside>
  </div>

</main>
</body>
</html>`;
}

// ─── Helpers ────────────────────────────────────────────────────────

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "");
}

/**
 * Allow ONLY the four tags the template uses — `<strong>`, `<em>`,
 * `<code>`, and `<span class="rsm-hl">`. Everything else is escaped.
 * Catches LLM trying to inject anchor/script/img tags into the summary
 * or bullets.
 */
function sanitizeRichText(input: string): string {
  // First fully escape, then re-allow the safe tags.
  const escaped = escape(input);
  return escaped
    .replace(/&lt;(\/?)strong&gt;/g, "<$1strong>")
    .replace(/&lt;(\/?)em&gt;/g, "<$1em>")
    .replace(/&lt;(\/?)code&gt;/g, "<$1code>")
    .replace(/&lt;span class=&quot;rsm-hl&quot;&gt;/g, '<span class="rsm-hl">')
    .replace(/&lt;\/span&gt;/g, "</span>");
}

function linkBare(url: string): string {
  const e = escape;
  const label = url.replace(/^https?:\/\//, "");
  return `<a href="${e(url)}" target="_blank" rel="noopener">${e(label)}</a>`;
}

// ─── CSS (identical to the master template) ─────────────────────────

const TEMPLATE_CSS = `
:root {
  --rsm-bg: #ffffff;
  --rsm-paper: #ffffff;
  --rsm-page-bg: #f3f4f6;
  --rsm-fg: #0f172a;
  --rsm-fg-2: #334155;
  --rsm-fg-3: #64748b;
  --rsm-fg-muted: #94a3b8;
  --rsm-line: #e2e8f0;
  --rsm-line-strong: #cbd5e1;
  --rsm-shopify: #008060;
  --rsm-shopify-2: #5e8e3e;
  --rsm-shopify-tint: #e3f1ec;
  --rsm-shopify-tint-2: #d6ebdf;
  --rsm-chip-bg: #f1f5f9;
  --rsm-chip-fg: #1e293b;
  --rsm-page-w: 8.5in;
  --rsm-page-h: auto;
  --rsm-page-pad-x: 56px;
  --rsm-page-pad-y: 48px;
  --rsm-font: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --rsm-font-display: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { font-family: var(--rsm-font); background: var(--rsm-page-bg); color: var(--rsm-fg); line-height: 1.5; font-size: 13.5px; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; padding: 32px 16px; }
a { color: inherit; text-decoration: none; }
ul { margin: 0; padding: 0; list-style: none; }
h1, h2, h3, h4, p { margin: 0; }
.rsm-page { width: 100%; max-width: var(--rsm-page-w); margin: 0 auto; background: var(--rsm-paper); box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 16px 50px -16px rgba(0,0,0,0.12); padding: var(--rsm-page-pad-y) var(--rsm-page-pad-x); border-radius: 4px; }
.rsm-head { border-bottom: 2px solid var(--rsm-fg); padding-bottom: 18px; margin-bottom: 22px; }
.rsm-head__name { font-family: var(--rsm-font-display); font-size: 34px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.1; color: var(--rsm-fg); }
.rsm-head__title { margin-top: 4px; font-size: 14px; font-weight: 500; color: var(--rsm-shopify); letter-spacing: 0.005em; }
.rsm-head__contact { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 12px; color: var(--rsm-fg-3); }
.rsm-head__contact a:hover { color: var(--rsm-shopify); }
.rsm-head__contact-sep { color: var(--rsm-line-strong); }
.rsm-grid { display: grid; grid-template-columns: minmax(0, 1fr) 230px; gap: 28px; align-items: start; }
.rsm-section { margin-bottom: 18px; }
.rsm-section:last-child { margin-bottom: 0; }
.rsm-section__title { font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--rsm-fg); padding-bottom: 6px; margin-bottom: 12px; border-bottom: 1px solid var(--rsm-line); display: flex; align-items: center; gap: 8px; }
.rsm-section__title::before { content: ""; width: 4px; height: 4px; border-radius: 50%; background: var(--rsm-shopify); }
.rsm-summary { font-size: 13px; line-height: 1.65; color: var(--rsm-fg-2); }
.rsm-summary strong { color: var(--rsm-fg); font-weight: 600; }
.rsm-summary .rsm-hl { color: var(--rsm-shopify); font-weight: 600; }
.rsm-exp-item { display: grid; grid-template-columns: 44px minmax(0, 1fr); gap: 14px; align-items: flex-start; padding-bottom: 14px; margin-bottom: 14px; border-bottom: 1px solid var(--rsm-line); page-break-inside: avoid; }
.rsm-exp-item:last-child { margin-bottom: 0; border-bottom: 0; padding-bottom: 0; }
.rsm-exp-item__logo { width: 44px; height: 44px; border-radius: 8px; object-fit: contain; background: #ffffff; border: 1px solid var(--rsm-line); padding: 4px; }
.rsm-exp-item__body { min-width: 0; }
.rsm-exp-item__head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 2px; }
.rsm-exp-item__role { font-size: 13.5px; font-weight: 600; color: var(--rsm-fg); }
.rsm-exp-item__period { font-size: 11.5px; color: var(--rsm-fg-3); white-space: nowrap; font-variant-numeric: tabular-nums; }
.rsm-exp-item__company { display: flex; align-items: baseline; gap: 8px; font-size: 12.5px; color: var(--rsm-fg-2); margin-bottom: 6px; }
.rsm-exp-item__company-name { font-weight: 600; color: var(--rsm-shopify); }
.rsm-exp-item__location { font-size: 11.5px; color: var(--rsm-fg-muted); }
.rsm-exp-item__location::before { content: "·"; margin-right: 6px; }
.rsm-exp-item__points { font-size: 12.5px; color: var(--rsm-fg-2); line-height: 1.55; }
.rsm-exp-item__points li { position: relative; padding-left: 14px; margin-top: 4px; }
.rsm-exp-item__points li::before { content: ""; position: absolute; left: 0; top: 8px; width: 5px; height: 5px; background: var(--rsm-shopify); border-radius: 50%; }
.rsm-exp-item__tags { margin-top: 6px; display: flex; flex-wrap: wrap; gap: 4px; }
.rsm-tag { display: inline-flex; align-items: center; background: var(--rsm-shopify-tint); color: #0a5142; border: 1px solid var(--rsm-shopify-tint-2); border-radius: 4px; padding: 2px 7px; font-size: 10.5px; font-weight: 500; line-height: 1.4; letter-spacing: 0.01em; }
.rsm-apps-list { display: flex; flex-direction: column; }
.rsm-app { display: grid; grid-template-columns: 44px minmax(0, 1fr); gap: 14px; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid var(--rsm-line); text-decoration: none; transition: background 0.2s ease; }
.rsm-app:first-child { padding-top: 2px; }
.rsm-app:last-child { border-bottom: 0; padding-bottom: 2px; }
.rsm-app:hover { background: rgba(0, 128, 96, 0.03); }
.rsm-app__logo { width: 44px; height: 44px; border-radius: 8px; object-fit: contain; background: #ffffff; border: 1px solid var(--rsm-line); padding: 4px; }
.rsm-app__body { min-width: 0; }
.rsm-app__head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 2px; }
.rsm-app__name { font-size: 13px; font-weight: 700; color: var(--rsm-fg); line-height: 1.2; }
.rsm-app__link { font-size: 11px; color: var(--rsm-shopify); font-weight: 600; white-space: nowrap; }
.rsm-app__desc { font-size: 12px; color: var(--rsm-fg-2); line-height: 1.5; }
.rsm-side .rsm-section__title { font-size: 10.5px; }
.rsm-skill-group { margin-bottom: 12px; }
.rsm-skill-group:last-child { margin-bottom: 0; }
.rsm-skill-group__label { font-size: 11px; font-weight: 600; color: var(--rsm-fg); margin-bottom: 6px; letter-spacing: 0.01em; }
.rsm-skill-group__items { display: flex; flex-wrap: wrap; gap: 4px; }
.rsm-skill-chip { display: inline-flex; align-items: center; background: var(--rsm-chip-bg); color: var(--rsm-chip-fg); border: 1px solid var(--rsm-line); border-radius: 4px; padding: 2px 7px; font-size: 10.5px; font-weight: 500; line-height: 1.5; }
.rsm-skill-chip--accent { background: var(--rsm-shopify-tint); border-color: var(--rsm-shopify-tint-2); color: #0a5142; }
.rsm-edu-item { font-size: 11.5px; margin-bottom: 8px; line-height: 1.45; }
.rsm-edu-item:last-child { margin-bottom: 0; }
.rsm-edu-item__school { font-weight: 600; color: var(--rsm-fg); font-size: 12px; }
.rsm-edu-item__degree { color: var(--rsm-fg-2); }
.rsm-edu-item__year { color: var(--rsm-fg-muted); font-size: 11px; font-variant-numeric: tabular-nums; }
.rsm-lang-list { font-size: 12px; }
.rsm-lang-list li { display: flex; justify-content: space-between; color: var(--rsm-fg-2); padding: 3px 0; border-bottom: 1px dashed var(--rsm-line); }
.rsm-lang-list li:last-child { border-bottom: 0; }
.rsm-lang-list li span:last-child { color: var(--rsm-fg-muted); font-size: 11px; }
.rsm-links-list { font-size: 11.5px; }
.rsm-links-list li { margin-bottom: 5px; }
.rsm-links-list li:last-child { margin-bottom: 0; }
.rsm-links-list li a { color: var(--rsm-shopify); word-break: break-all; }
.rsm-links-list li a:hover { text-decoration: underline; }
@media (max-width: 820px) {
  :root { --rsm-page-pad-x: 28px; --rsm-page-pad-y: 32px; }
  .rsm-grid { grid-template-columns: 1fr; }
  .rsm-head__name { font-size: 28px; }
}
@media print {
  @page { size: A4; margin: 10mm; }
  html, body { background: #ffffff; padding: 0; margin: 0; font-size: 10px; line-height: 1.42; }
  .rsm-page { max-width: none; box-shadow: none; padding: 0; border-radius: 0; width: 100%; }
  .rsm-grid { display: grid !important; grid-template-columns: minmax(0, 1fr) 195px !important; gap: 18px !important; align-items: start !important; }
  .rsm-head { margin-bottom: 12px; padding-bottom: 10px; }
  .rsm-head__name { font-size: 22px; }
  .rsm-head__title { font-size: 11px; margin-top: 2px; }
  .rsm-head__contact { font-size: 9.5px; margin-top: 6px; gap: 3px 10px; }
  .rsm-section { margin-bottom: 10px; }
  .rsm-section__title { font-size: 9.5px; margin-bottom: 7px; padding-bottom: 4px; }
  .rsm-summary { font-size: 10px; line-height: 1.5; }
  .rsm-app { padding: 6px 0; }
  .rsm-app__logo { width: 36px; height: 36px; padding: 3px; }
  .rsm-app__name { font-size: 11px; }
  .rsm-app__link { font-size: 9px; }
  .rsm-app__desc { font-size: 9.5px; line-height: 1.4; }
  .rsm-exp-item { padding-bottom: 9px; margin-bottom: 9px; page-break-inside: avoid; grid-template-columns: 36px minmax(0, 1fr) !important; gap: 10px !important; }
  .rsm-exp-item__logo { width: 36px; height: 36px; padding: 3px; }
  .rsm-exp-item__role { font-size: 11.5px; }
  .rsm-exp-item__period { font-size: 9.5px; }
  .rsm-exp-item__company { font-size: 10px; margin-bottom: 3px; gap: 6px; }
  .rsm-exp-item__location { font-size: 9.5px; }
  .rsm-exp-item__points { font-size: 10px; line-height: 1.4; }
  .rsm-exp-item__points li { margin-top: 2px; }
  .rsm-exp-item__points li::before { top: 6px; width: 4px; height: 4px; }
  .rsm-exp-item__tags { margin-top: 4px; gap: 3px; }
  .rsm-tag { font-size: 9px; padding: 1px 5px; }
  .rsm-skill-chip { font-size: 9px; padding: 1px 5px; }
  .rsm-skill-group { margin-bottom: 9px; }
  .rsm-skill-group__label { font-size: 9.5px; margin-bottom: 4px; }
  .rsm-edu-item { font-size: 9.5px; margin-bottom: 6px; }
  .rsm-edu-item__school { font-size: 10px; }
  .rsm-edu-item__year { font-size: 9px; }
  .rsm-lang-list { font-size: 9.5px; }
  .rsm-links-list { font-size: 9.5px; }
  .rsm-tag, .rsm-skill-chip, .rsm-skill-chip--accent, .rsm-app__logo, .rsm-exp-item__logo { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;

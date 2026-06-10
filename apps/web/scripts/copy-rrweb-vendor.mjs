/**
 * Copy the rrweb UMD bundle from node_modules into public/vendor so the
 * tracker script can <script src="/vendor/rrweb.min.js"> as a plain
 * static asset. Run automatically via the `build` script — pnpm
 * resolves rrweb to its virtual store, we read the file from there.
 *
 * Idempotent: skips the copy if the dest is already newer.
 */
import { createRequire } from "node:module";
import { copyFileSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const pkgEntry = require.resolve("rrweb", { paths: [process.cwd()] });
const distDir = path.dirname(pkgEntry);
const src = path.join(distDir, "rrweb.umd.min.cjs");
const destDir = path.join(process.cwd(), "public", "vendor");
const dest = path.join(destDir, "rrweb.min.js");

mkdirSync(destDir, { recursive: true });

try {
  const srcStat = statSync(src);
  let needCopy = true;
  try {
    const destStat = statSync(dest);
    needCopy = srcStat.mtimeMs > destStat.mtimeMs;
  } catch {
    needCopy = true;
  }
  if (needCopy) {
    copyFileSync(src, dest);
    console.log(`[rrweb-vendor] ${src} → ${dest} (${(srcStat.size / 1024).toFixed(1)} KB)`);
  } else {
    console.log("[rrweb-vendor] up-to-date, skipping copy");
  }
} catch (err) {
  console.error("[rrweb-vendor] copy failed:", err.message);
  process.exit(1);
}

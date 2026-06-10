/**
 * Next.js instrumentation hook (https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation).
 * Runs once when the Node server boots, before any request is served.
 *
 * Purpose: install a `process.on("unhandledRejection")` handler so that a
 * rogue rejected promise from a third-party module (playwright was the
 * first offender — its coreBundle.js can throw a MODULE_NOT_FOUND when
 * the standalone build is missing `browsers.json`) can never take down
 * the whole server. Without this hook, Node's default policy on
 * unhandled rejections is to terminate, which on Coolify means EVERY
 * route returns 502 until the next deploy.
 *
 * The Node-specific code lives in a sibling file loaded via dynamic
 * import. That keeps Turbopack's edge-runtime analyser from inspecting
 * `process.on` and emitting noisy (but benign) "unsupported in Edge
 * Runtime" warnings even though the guard above does its job at runtime.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { registerNodeProcessHandlers } = await import("./instrumentation-node");
  registerNodeProcessHandlers();
}

/**
 * Node-only side of the instrumentation hook. Lives in a separate file
 * so Turbopack never has to analyse it in the edge context (`process.on`
 * isn't available there and the analyser can't prove the runtime guard
 * at build time, producing benign "unsupported in Edge Runtime"
 * warnings even when the guard works correctly at runtime).
 *
 * Loaded via dynamic import from instrumentation.ts only when
 * NEXT_RUNTIME === "nodejs".
 */
export function registerNodeProcessHandlers(): void {
  process.on("unhandledRejection", (reason) => {
    const msg =
      reason instanceof Error
        ? `${reason.name}: ${reason.message}`
        : String(reason);
    console.error("[instrumentation] unhandled rejection swallowed:", msg);
    if (reason instanceof Error && reason.stack) {
      console.error(reason.stack);
    }
  });

  process.on("uncaughtException", (err) => {
    console.error(
      "[instrumentation] uncaught exception swallowed:",
      err.name,
      err.message,
    );
    if (err.stack) console.error(err.stack);
  });
}

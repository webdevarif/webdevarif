import { z } from "zod";

// Single source of truth for environment variables. Validate at load time
// so the app fails fast (build/start) when something is missing or malformed.
// Per blueprint §7: do not read process.env.X outside this module.

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.url().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters"),
  SESSION_MAX_AGE: z.coerce.number().int().positive().default(604_800),

  // Google Maps Platform — server-side key used by the GM Prospecting
  // feature for Places Text Search + Place Details. Permissive at parse
  // time (empty string treated as unset) so a bad value doesn't break the
  // whole app's module evaluation. The Maps client checks length at the
  // call site and throws an actionable error.
  GOOGLE_MAPS_API_KEY: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),

  // OpenRouter — single LLM gateway covering Anthropic / OpenAI / Google /
  // Meta / Mistral / DeepSeek etc. Used by AI-powered tools. Empty string
  // treated as unset; LLM helpers throw an actionable error at call time
  // when missing, so the absence doesn't break unrelated routes.
  OPENROUTER_API_KEY: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),

  // FreeLLMAPI — self-hosted OpenAI-compatible chat-completion gateway.
  // When BOTH vars are set, chat() / chatJson() prefer FreeLLMAPI for
  // pure-text LLM calls and use the magic "auto" model (FreeLLMAPI does
  // its own internal routing). Calls that need OpenRouter-specific
  // features (web search plugin, vision/image_url parts, image
  // generation) automatically stay on OpenRouter. Leave unset to keep
  // behavior identical to OpenRouter-only.
  FREELLMAPI_BASE_URL: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  FREELLMAPI_API_KEY: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),

  // 32-byte symmetric key (base64) for AES-256-GCM encryption of secrets
  // at rest — currently the Shopify Partner access token. Generate with:
  //   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  // Empty string treated as unset; Shopify settings page refuses to save
  // credentials without it.
  SHOPIFY_ENCRYPTION_KEY: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),

  // Cloudflare Workers AI — free tier (~10k neurons/day) used as the
  // default FLUX image generator for Social Studio. Both optional —
  // when missing, the image generator falls back to OpenRouter (paid).
  // Find Account ID at dash.cloudflare.com (right sidebar).
  // Create an API token with permission "Account → Workers AI → Read".
  CF_ACCOUNT_ID: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  CF_API_TOKEN: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),

  // Tracker Machine — daily-rollup cron protection. The /api/track/cron
  // route demands `Authorization: Bearer <CRON_SECRET>`. Empty string
  // treated as unset; the route returns 401 when missing so an
  // unconfigured deployment fails closed. Kept in env because cron
  // auth is infra-level — the agent-facing /api/track/summary endpoint
  // uses DB-managed api_keys instead.
  CRON_SECRET: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

export type Env = z.infer<typeof EnvSchema>;

function parseEnv(): Env {
  // During Next.js build (page data collection), env vars may not be
  // available. Return safe defaults so the build succeeds — real
  // validation happens at runtime when the server starts.
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return {
      NODE_ENV: "production",
      DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://localhost:5432/placeholder",
      JWT_SECRET: process.env.JWT_SECRET ?? "build-time-placeholder-secret-that-is-long-enough",
      SESSION_MAX_AGE: 604_800,
      GOOGLE_MAPS_API_KEY: undefined,
      OPENROUTER_API_KEY: undefined,
      FREELLMAPI_BASE_URL: undefined,
      FREELLMAPI_API_KEY: undefined,
      SHOPIFY_ENCRYPTION_KEY: undefined,
      CF_ACCOUNT_ID: undefined,
      CF_API_TOKEN: undefined,
      CRON_SECRET: undefined,
    } as Env;
  }

  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return result.data;
}

export const env: Env = parseEnv();

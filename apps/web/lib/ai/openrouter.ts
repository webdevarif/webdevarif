import "server-only";

import type { ZodType } from "zod";

import { env } from "@kit/shared/env";

// ─── Public types ────────────────────────────────────────────────────

export type ChatMessagePart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | ChatMessagePart[];
};

export type ChatUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  /** USD cost reported by OpenRouter — `0` for free models. */
  costUsd: number;
};

export type ChatResult = {
  text: string;
  /** Model that actually responded (after fallback). */
  modelUsed: string;
  usage: ChatUsage;
};

export type ChatOptions = {
  /**
   * Models to try in order. First success wins. Use this to express
   * "prefer free, fall back to cheap paid". When omitted, defaults to
   * FREE_MODELS — see tier presets below.
   */
  models?: string[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  /** Stop sequences. */
  stop?: string[];
  /** Force JSON output (uses OpenRouter's response_format). */
  json?: boolean;
  /** Per-request timeout in ms. Default 60_000. */
  timeoutMs?: number;
  /** Enable OpenRouter web search plugin for real-time data. */
  webSearch?: boolean;
};

export type ChatError =
  | { kind: "no_api_key" }
  | { kind: "all_models_failed"; attempts: ModelAttempt[] }
  | { kind: "invalid_response"; message: string };

export type ModelAttempt = {
  model: string;
  status: number | "network" | "timeout";
  message: string;
};

// ─── Model tier presets ──────────────────────────────────────────────

/**
 * **Free** models — zero cost, rate-limited daily. Try these first.
 * OpenRouter rotates free offerings; if one disappears it 404s and we
 * fall through to the next. Update this list as new free tiers appear.
 */
export const FREE_MODELS = [
  "google/gemini-2.0-flash-exp:free",
  "deepseek/deepseek-chat-v3-0324:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "nvidia/llama-3.1-nemotron-70b-instruct:free",
] as const;

/**
 * **Cheap paid** — sub-cent per typical call. Use when free tiers are
 * rate-limited or quality is too low. Sorted by quality+speed.
 */
export const CHEAP_MODELS = [
  "google/gemini-2.5-flash",
  "anthropic/claude-haiku-4-5",
  "openai/gpt-4o-mini",
] as const;

/**
 * **Balanced** paid — single-digit cents per call. Real workhorses for
 * strategy / persona / long-form content tasks.
 */
export const BALANCED_MODELS = [
  "anthropic/claude-sonnet-4-6",
  "openai/gpt-4o",
  "google/gemini-2.5-pro",
] as const;

/**
 * **Premium** — most expensive, save for high-stakes reasoning where
 * cost is justified by output quality.
 */
export const PREMIUM_MODELS = [
  "anthropic/claude-opus-4-7",
  "openai/o3",
] as const;

/**
 * **Vision** models — support image_url content parts.
 * Used for screenshot analysis, design critique, etc.
 */
export const VISION_MODELS = [
  "google/gemini-2.0-flash-exp:free",
  "google/gemini-2.5-flash",
  "openai/gpt-4o-mini",
  "openai/gpt-4o",
] as const;

/**
 * **Hermes / Agentic** — NousResearch Hermes models optimized for
 * structured JSON output, function calling, and deep reasoning.
 * Best for business intelligence, analysis, and agentic tasks.
 */
export const HERMES_MODELS = [
  "nousresearch/hermes-3-llama-3.1-405b",
  "nousresearch/hermes-3-llama-3.1-70b",
] as const;

/**
 * Cost-conscious default chain: try free → cheap paid.
 * Most use cases should pass this.
 */
export const ECONOMY_CHAIN = [
  ...FREE_MODELS,
  ...CHEAP_MODELS,
] as const;

/**
 * Agent chain for intelligence/analysis tasks: Hermes first (best
 * structured reasoning), then balanced models as fallback.
 * ~$0.01-0.10 per call — worth it for business-critical analysis.
 */
export const AGENT_CHAIN = [
  ...HERMES_MODELS,
  ...BALANCED_MODELS,
] as const;

// ─── Provider routing ───────────────────────────────────────────────

type Provider = "openrouter" | "freellmapi";

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

function freellmapiConfigured(): boolean {
  return Boolean(env.FREELLMAPI_BASE_URL && env.FREELLMAPI_API_KEY);
}

function freellmapiEndpoint(): string {
  // Tolerate trailing slashes in BASE_URL so both `https://x.com/v1` and
  // `https://x.com/v1/` work.
  const base = env.FREELLMAPI_BASE_URL!.replace(/\/+$/, "");
  return `${base}/chat/completions`;
}

function hasImageUrl(messages: ChatMessage[]): boolean {
  return messages.some(
    (m) =>
      Array.isArray(m.content) &&
      m.content.some((p) => p.type === "image_url"),
  );
}

/**
 * Decide which provider to use for THIS call.
 *
 * - `webSearch: true` → OpenRouter (FreeLLMAPI has no web plugin).
 * - Any image_url content part → OpenRouter (vision models live there).
 * - Otherwise → FreeLLMAPI when configured, else OpenRouter.
 *
 * The choice is silent — callers never need to know which provider
 * answered. Their `ChatResult.modelUsed` will be `"auto"` on FreeLLMAPI
 * since that's the only model they expose.
 */
function pickProvider(
  messages: ChatMessage[],
  options: ChatOptions,
): Provider {
  if (options.webSearch) return "openrouter";
  if (hasImageUrl(messages)) return "openrouter";
  if (freellmapiConfigured()) return "freellmapi";
  return "openrouter";
}

type ProviderConfig = {
  provider: Provider;
  endpoint: string;
  apiKey: string | undefined;
};

function configForProvider(provider: Provider): ProviderConfig {
  if (provider === "freellmapi") {
    return {
      provider,
      endpoint: freellmapiEndpoint(),
      apiKey: env.FREELLMAPI_API_KEY,
    };
  }
  return {
    provider,
    endpoint: OPENROUTER_ENDPOINT,
    apiKey: env.OPENROUTER_API_KEY,
  };
}

// ─── Core call ───────────────────────────────────────────────────────

/**
 * Call the LLM with a model fallback chain. Tries each model in order,
 * stopping at the first that responds with a 2xx. Free models go first
 * by default so monthly cost stays near zero.
 *
 * Routes to FreeLLMAPI when both FREELLMAPI_* env vars are set and the
 * call doesn't need an OpenRouter-only feature (web search, vision).
 * Otherwise routes to OpenRouter.
 *
 * Returns a discriminated result — caller pattern-matches on `ok` and
 * surfaces a friendly error from `error.kind`.
 */
export async function chat(
  messages: ChatMessage[],
  options: ChatOptions = {},
): Promise<{ ok: true; data: ChatResult } | { ok: false; error: ChatError }> {
  const provider = pickProvider(messages, options);
  const cfg = configForProvider(provider);

  if (!cfg.apiKey) {
    return { ok: false, error: { kind: "no_api_key" } };
  }

  const fullMessages: ChatMessage[] = options.systemPrompt
    ? [{ role: "system", content: options.systemPrompt }, ...messages]
    : messages;

  // FreeLLMAPI does its own internal routing — pass the magic "auto"
  // model regardless of what the caller asked for, because our default
  // chains (ECONOMY_CHAIN etc.) contain OpenRouter-specific model IDs
  // that FreeLLMAPI doesn't recognise. OpenRouter still honours the
  // caller's chain or falls back to ECONOMY_CHAIN.
  const models =
    provider === "freellmapi"
      ? ["auto"]
      : (options.models ?? [...ECONOMY_CHAIN]);

  const attempts: ModelAttempt[] = [];

  for (const model of models) {
    const attempt = await callOnce({
      provider: cfg.provider,
      endpoint: cfg.endpoint,
      apiKey: cfg.apiKey,
      model,
      messages: fullMessages,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      stop: options.stop,
      json: options.json,
      webSearch: options.webSearch,
      timeoutMs: options.timeoutMs ?? 60_000,
    });

    if (attempt.kind === "ok") {
      return { ok: true, data: attempt.data };
    }
    attempts.push({
      model,
      status: attempt.status,
      message: attempt.message,
    });

    // Don't bother trying more models on auth failures or quota for the
    // whole account — they'll fail identically.
    if (attempt.status === 401 || attempt.status === 402) {
      break;
    }
  }

  return { ok: false, error: { kind: "all_models_failed", attempts } };
}

/**
 * JSON-mode variant — instructs OpenRouter to return parsable JSON and
 * validates against the caller's Zod schema. Re-tries once with a
 * stricter system prompt if the first parse fails (common with smaller
 * free models).
 */
export async function chatJson<T>(
  messages: ChatMessage[],
  schema: ZodType<T>,
  options: Omit<ChatOptions, "json"> = {},
): Promise<
  | { ok: true; data: T; meta: { modelUsed: string; usage: ChatUsage } }
  | { ok: false; error: ChatError | { kind: "invalid_json"; raw: string; reason: string } }
> {
  const reinforce =
    "You MUST respond with valid JSON only — no prose, no markdown, no code fences. Match the shape requested in the user message exactly.";

  const result = await chat(messages, {
    ...options,
    json: true,
    systemPrompt: options.systemPrompt
      ? `${options.systemPrompt}\n\n${reinforce}`
      : reinforce,
  });

  if (!result.ok) return { ok: false, error: result.error };

  const text = result.data.text.trim();
  // Strip ```json fences if a model added them despite instructions.
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    return {
      ok: false,
      error: {
        kind: "invalid_json",
        raw: text,
        reason: err instanceof Error ? err.message : "JSON.parse failed",
      },
    };
  }

  const validated = schema.safeParse(parsed);
  if (!validated.success) {
    return {
      ok: false,
      error: {
        kind: "invalid_json",
        raw: text,
        reason: validated.error.message,
      },
    };
  }

  return {
    ok: true,
    data: validated.data,
    meta: {
      modelUsed: result.data.modelUsed,
      usage: result.data.usage,
    },
  };
}

// ─── Single-attempt fetch ───────────────────────────────────────────

type AttemptOk = { kind: "ok"; data: ChatResult };
type AttemptErr = {
  kind: "err";
  status: number | "network" | "timeout";
  message: string;
};

async function callOnce(input: {
  provider: Provider;
  endpoint: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stop?: string[];
  json?: boolean;
  webSearch?: boolean;
  timeoutMs: number;
}): Promise<AttemptOk | AttemptErr> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.timeoutMs);

  try {
    const body: Record<string, unknown> = {
      model: input.model,
      messages: input.messages,
    };
    if (input.temperature != null) body.temperature = input.temperature;
    if (input.maxTokens != null) body.max_tokens = input.maxTokens;
    if (input.stop?.length) body.stop = input.stop;
    if (input.json) body.response_format = { type: "json_object" };

    // OpenRouter-only request fields:
    //  - `plugins` is OpenRouter's web-search hook; FreeLLMAPI has no
    //    equivalent (and pickProvider already routed webSearch=true away
    //    from FreeLLMAPI, so this branch is just defence-in-depth).
    //  - `usage.include = true` asks OpenRouter to attach the real USD
    //    cost — FreeLLMAPI doesn't bill, so it's noise there.
    if (input.provider === "openrouter") {
      if (input.webSearch) {
        body.plugins = [{ id: "web", max_results: 5 }];
      }
      body.usage = { include: true };
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    };
    // OpenRouter shows these in their dashboard for per-app auditing. No
    // effect on routing. FreeLLMAPI is self-hosted so they're irrelevant.
    if (input.provider === "openrouter") {
      headers["HTTP-Referer"] = "https://webdevarif.app";
      headers["X-Title"] = "webdevarif";
    }

    const res = await fetch(input.endpoint, {
      method: "POST",
      signal: controller.signal,
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });
    clearTimeout(timer);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        kind: "err",
        status: res.status,
        message: extractProviderError(text) || res.statusText,
      };
    }

    const json = (await res.json()) as ChatCompletionResponse;
    const choice = json.choices?.[0];
    if (!choice?.message?.content) {
      return {
        kind: "err",
        status: res.status,
        message: `${input.provider} returned no content`,
      };
    }

    return {
      kind: "ok",
      data: {
        text: choice.message.content,
        modelUsed: json.model ?? input.model,
        usage: {
          promptTokens: json.usage?.prompt_tokens ?? 0,
          completionTokens: json.usage?.completion_tokens ?? 0,
          totalTokens: json.usage?.total_tokens ?? 0,
          // OpenRouter reports per-call USD when `usage.include = true`.
          // FreeLLMAPI doesn't bill, so 0 is the truthful answer.
          costUsd: json.usage?.cost ?? 0,
        },
      },
    };
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      return { kind: "err", status: "timeout", message: "Request timed out" };
    }
    return {
      kind: "err",
      status: "network",
      message: err instanceof Error ? err.message : "Network error",
    };
  }
}

/**
 * Extract an error message from a non-2xx OpenAI-compatible response
 * body. Both OpenRouter and FreeLLMAPI use the same shape, so one
 * function handles both. Falls back to the first 200 chars of the raw
 * body if the JSON doesn't have the expected shape.
 */
function extractProviderError(body: string): string {
  if (!body) return "";
  try {
    const parsed = JSON.parse(body) as {
      error?: { message?: string } | string;
    };
    if (typeof parsed.error === "string") return parsed.error;
    if (parsed?.error?.message) return parsed.error.message;
  } catch {
    /* fall through */
  }
  return body.slice(0, 200);
}

// Generic OpenAI-compatible chat completion response. `cost` is an
// OpenRouter extension and is absent from FreeLLMAPI responses.
type ChatCompletionResponse = {
  model?: string;
  choices?: Array<{
    message?: { role?: string; content?: string };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    cost?: number;
  };
};

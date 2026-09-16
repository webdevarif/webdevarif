import { createMcpHandler } from "@modelcontextprotocol/server";

import {
  findActiveApiKeyByHash,
  touchApiKeyLastUsed,
  type ApiKeyRow,
} from "@kit/database";

import { buildClientTrackerServer } from "@/lib/mcp/client-tracker";
import { extractBearerToken, hashApiKey } from "@/lib/tracker/api-key";
import { allow } from "@/lib/tracker/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Remote MCP endpoint for the Client Tracker.
 *
 * Streamable HTTP, stateless — one server instance per request, so any node
 * can serve any call and nothing has to be kept warm between them.
 *
 * Auth reuses the dashboard's existing API keys rather than inventing a
 * second credential: `Authorization: Bearer <key>` is hashed and looked up
 * exactly the way `/api/v1/*` does it. Connecting needs any ONE of the four
 * tracker scopes; each individual tool then re-checks the specific scope it
 * needs, so a read-only key can browse but never bill.
 *
 * Connect from Claude Code:
 *   claude mcp add --transport http webdevarif https://<host>/api/mcp \
 *     --header "Authorization: Bearer tm_xxx"
 */

const TRACKER_SCOPES = [
  "clients:read",
  "clients:write",
  "invoices:read",
  "invoices:write",
];

/** Generous for an agent, still capped if a key ever leaks. */
const PER_MINUTE = 120;

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID",
  "Access-Control-Expose-Headers": "Mcp-Session-Id, Mcp-Protocol-Version",
  "Access-Control-Max-Age": "86400",
};

type AuthOutcome =
  | { ok: true; key: ApiKeyRow }
  | { ok: false; response: Response };

/**
 * A 401 that tells the caller how to fix it. MCP clients surface this text
 * to the user, so a bad key should read as instructions, not a status code.
 */
function unauthorized(message: string, status = 401): Response {
  return Response.json(
    { jsonrpc: "2.0", error: { code: -32001, message }, id: null },
    {
      status,
      headers: {
        ...CORS_HEADERS,
        ...(status === 401
          ? { "WWW-Authenticate": 'Bearer realm="webdevarif-client-tracker"' }
          : {}),
      },
    },
  );
}

async function authenticate(req: Request): Promise<AuthOutcome> {
  const token = extractBearerToken(req);
  if (!token) {
    return {
      ok: false,
      response: unauthorized(
        "Missing 'Authorization: Bearer <key>'. Create a key in the dashboard under Projects → API Keys.",
      ),
    };
  }

  const key = await findActiveApiKeyByHash(hashApiKey(token));
  if (!key) {
    return { ok: false, response: unauthorized("Invalid or revoked API key.") };
  }

  if (!TRACKER_SCOPES.some((s) => key.scopes.includes(s))) {
    return {
      ok: false,
      response: unauthorized(
        `This key has no Client Tracker scopes. Grant at least one of: ${TRACKER_SCOPES.join(", ")}.`,
        403,
      ),
    };
  }

  const verdict = allow(`mcp:${key.id}`, PER_MINUTE);
  if (!verdict.ok) {
    return {
      ok: false,
      response: Response.json(
        {
          jsonrpc: "2.0",
          error: { code: -32000, message: "Too many requests." },
          id: null,
        },
        {
          status: 429,
          headers: {
            ...CORS_HEADERS,
            "Retry-After": String(Math.ceil(verdict.retryAfterMs / 1000)),
          },
        },
      ),
    };
  }

  void touchApiKeyLastUsed(key.id);
  return { ok: true, key };
}

/** Origin of this deployment, so tools can hand back working links. */
function baseUrlOf(req: Request): string {
  const h = req.headers;
  const url = new URL(req.url);
  const proto = h.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? url.host;
  return `${proto}://${host}`;
}

/**
 * The handler is built once; the factory runs per request and receives the
 * `authInfo` we verified, so every server instance is already scoped to one
 * user's data before a single tool can run.
 */
const handler = createMcpHandler(({ authInfo }) => {
  const extra = authInfo?.extra as
    | { key: ApiKeyRow; baseUrl: string }
    | undefined;
  if (!extra) {
    // Unreachable via POST below, which authenticates first. Failing loudly
    // beats silently handing out an unscoped server.
    throw new Error("MCP handler invoked without verified auth context");
  }
  return buildClientTrackerServer(extra.key, extra.baseUrl);
});

export async function POST(req: Request): Promise<Response> {
  const auth = await authenticate(req);
  if (!auth.ok) return auth.response;

  const res = await handler.fetch(req, {
    authInfo: {
      token: "api-key",
      clientId: auth.key.id,
      scopes: auth.key.scopes,
      extra: { key: auth.key, baseUrl: baseUrlOf(req) },
    },
  });

  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

/**
 * Stateless mode keeps no session to resume, so there is no server-initiated
 * stream to open. Answer with something a human who pasted the URL into a
 * browser can act on.
 */
export async function GET(): Promise<Response> {
  return Response.json(
    {
      name: "webdevarif-client-tracker",
      transport: "streamable-http",
      mode: "stateless",
      hint: 'POST JSON-RPC here with "Authorization: Bearer <api key>". Add it to Claude Code with: claude mcp add --transport http webdevarif <this-url> --header "Authorization: Bearer <key>"',
    },
    { status: 200, headers: CORS_HEADERS },
  );
}

export async function DELETE(): Promise<Response> {
  // No sessions to terminate in stateless mode; succeed so clients that
  // always send a teardown do not report a spurious error on disconnect.
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { z } from "zod";

import { env } from "@kit/shared/env";

// Minimal OIDC (Authorization Code + PKCE) client for "Sign in with
// AuthPass" — https://docs.authpass.site/. AuthPass endpoints are fixed
// (not discovered at runtime) to avoid a network round-trip on every
// login attempt; they match the published /.well-known/openid-configuration.

export const AUTHPASS_SCOPE = "openid profile email";

export function isAuthpassConfigured(): boolean {
  return Boolean(env.AUTHPASS_CLIENT_ID && env.AUTHPASS_CLIENT_SECRET);
}

function endpoint(path: string): string {
  return `${env.AUTHPASS_ISSUER}${path}`;
}

function base64url(input: Buffer): string {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function generatePkce(): { state: string; codeVerifier: string; codeChallenge: string } {
  const state = base64url(randomBytes(16));
  const codeVerifier = base64url(randomBytes(32));
  const codeChallenge = base64url(createHash("sha256").update(codeVerifier).digest());
  return { state, codeVerifier, codeChallenge };
}

export function buildAuthorizeUrl(params: {
  state: string;
  codeChallenge: string;
  redirectUri: string;
}): string {
  if (!env.AUTHPASS_CLIENT_ID) {
    throw new Error("AuthPass is not configured");
  }

  const url = new URL(endpoint("/api/oidc/authorize"));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", env.AUTHPASS_CLIENT_ID);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("scope", AUTHPASS_SCOPE);
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

const TokenResponseSchema = z.object({
  access_token: z.string(),
  id_token: z.string().optional(),
  token_type: z.string(),
  expires_in: z.number().optional(),
});

export async function exchangeCodeForToken(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<z.infer<typeof TokenResponseSchema>> {
  if (!env.AUTHPASS_CLIENT_ID || !env.AUTHPASS_CLIENT_SECRET) {
    throw new Error("AuthPass is not configured");
  }

  const res = await fetch(endpoint("/api/oidc/token"), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: params.code,
      redirect_uri: params.redirectUri,
      client_id: env.AUTHPASS_CLIENT_ID,
      client_secret: env.AUTHPASS_CLIENT_SECRET,
      code_verifier: params.codeVerifier,
    }),
  });

  if (!res.ok) {
    throw new Error(`AuthPass token exchange failed (${res.status})`);
  }

  return TokenResponseSchema.parse(await res.json());
}

const UserInfoSchema = z.object({
  sub: z.string(),
  email: z.string().email().optional(),
  email_verified: z.boolean().optional(),
  name: z.string().optional(),
});

export type AuthpassUserInfo = z.infer<typeof UserInfoSchema>;

export async function fetchUserInfo(
  accessToken: string,
): Promise<AuthpassUserInfo> {
  const res = await fetch(endpoint("/api/oidc/userinfo"), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`AuthPass userinfo fetch failed (${res.status})`);
  }

  return UserInfoSchema.parse(await res.json());
}

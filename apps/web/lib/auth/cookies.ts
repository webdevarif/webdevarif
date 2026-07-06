import "server-only";

import { cookies } from "next/headers";

import { env } from "@kit/shared/env";

export const AUTH_COOKIE_NAME = "auth-token";

function baseOptions() {
  const isHttps = process.env.NEXT_PUBLIC_APP_URL?.startsWith("https") ?? false;
  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax" as const,
    path: "/",
  };
}

export async function setAuthCookie(token: string, maxAgeSeconds?: number) {
  const jar = await cookies();
  jar.set(AUTH_COOKIE_NAME, token, {
    ...baseOptions(),
    maxAge: maxAgeSeconds ?? env.SESSION_MAX_AGE,
  });
}

export async function clearAuthCookie() {
  const jar = await cookies();
  jar.set(AUTH_COOKIE_NAME, "", {
    ...baseOptions(),
    maxAge: 0,
  });
}

export async function readAuthCookie(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(AUTH_COOKIE_NAME)?.value ?? null;
}

// Short-lived cookie holding the AuthPass OIDC `state` + PKCE `code_verifier`
// between the /authpass/login redirect and the /authpass/callback request.
const AUTHPASS_PKCE_COOKIE_NAME = "authpass-pkce";

export async function setAuthpassPkceCookie(value: {
  state: string;
  codeVerifier: string;
}) {
  const jar = await cookies();
  jar.set(AUTHPASS_PKCE_COOKIE_NAME, JSON.stringify(value), {
    ...baseOptions(),
    maxAge: 600, // 10 minutes — plenty for the redirect round-trip
  });
}

export async function readAndClearAuthpassPkceCookie(): Promise<{
  state: string;
  codeVerifier: string;
} | null> {
  const jar = await cookies();
  const raw = jar.get(AUTHPASS_PKCE_COOKIE_NAME)?.value;
  jar.set(AUTHPASS_PKCE_COOKIE_NAME, "", { ...baseOptions(), maxAge: 0 });
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

import { NextResponse } from "next/server";

import { handleAuthpassCallback } from "@/app/(auth)/sign-in/_lib/authpass-service";
import {
  readAndClearAuthpassPkceCookie,
  setAuthCookie,
} from "@/lib/auth/cookies";

function signInErrorRedirect(request: Request, reason: string) {
  const url = new URL("/sign-in", request.url);
  url.searchParams.set("authpass_error", reason);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const pkce = await readAndClearAuthpassPkceCookie();

  if (!code || !state || !pkce || pkce.state !== state) {
    return signInErrorRedirect(request, "invalid_state");
  }

  try {
    const redirectUri = new URL(
      "/api/auth/authpass/callback",
      request.url,
    ).toString();
    const { token } = await handleAuthpassCallback({
      code,
      codeVerifier: pkce.codeVerifier,
      redirectUri,
    });
    await setAuthCookie(token);
    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (err) {
    console.error("[GET /api/auth/authpass/callback]", err);
    return signInErrorRedirect(request, "login_failed");
  }
}

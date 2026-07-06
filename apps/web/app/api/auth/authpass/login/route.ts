import { NextResponse } from "next/server";

import {
  buildAuthorizeUrl,
  generatePkce,
  isAuthpassConfigured,
} from "@/lib/auth/authpass";
import { setAuthpassPkceCookie } from "@/lib/auth/cookies";

export async function GET(request: Request) {
  if (!isAuthpassConfigured()) {
    return NextResponse.json(
      { error: { code: "NOT_CONFIGURED", message: "AuthPass sign-in is not configured" } },
      { status: 501 },
    );
  }

  const { state, codeVerifier, codeChallenge } = generatePkce();
  await setAuthpassPkceCookie({ state, codeVerifier });

  const redirectUri = new URL("/api/auth/authpass/callback", request.url).toString();

  return NextResponse.redirect(
    buildAuthorizeUrl({ state, codeChallenge, redirectUri }),
  );
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Edge middleware — handles CORS preflight (OPTIONS) for `/api/v1/*` so
 * Chrome extensions and browser-based callers can reach the public API.
 * Actual auth is enforced via Bearer key inside each route handler.
 */
export function middleware(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/v1/:path*",
};

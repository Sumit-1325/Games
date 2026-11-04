/**
 * Cheap redirect for private pages: no session cookie → /sign-in.
 * This only checks that a cookie exists; every page and API handler still
 * verifies the session itself (PLAN.md → "Never rely on middleware alone").
 */
import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  if (!getSessionCookie(req)) {
    const url = new URL("/sign-in", req.url);
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/profile/:path*", "/admin/:path*", "/results/:path*"] };

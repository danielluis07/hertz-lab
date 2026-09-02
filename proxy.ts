import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Cheap cookie presence check so logged-out visitors are redirected before a
 * render is wasted. This is NOT authorisation: it never validates the session
 * and never reads `user.role`. The real check lives in each protected
 * `page.tsx` via `requireAuth()` / `requireAdmin()`. See ADR-0006.
 */
export async function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "next",
      request.nextUrl.pathname + request.nextUrl.search,
    );
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/minha-conta/:path*",
    "/carrinho",
    "/checkout",
  ],
};

import { NextRequest, NextResponse } from "next/server";

import { DEMO_MODE } from "@/lib/config";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/server/session";

/**
 * Route protection (product-audit Fix 4).
 *
 * Next 16 convention: `proxy.ts` (the `middleware.ts` file was renamed).
 *
 * Every request to a protected path requires a valid signed session cookie;
 * anonymous visitors are sent to /login?next=<path> so they land back where
 * they were headed after signing in. /admin is protected like the rest of
 * the (app) group — the client-side role gate still renders the "Admins
 * only" panel for signed-in learners; the real role gate lives in the
 * backend (build.md §4.2).
 *
 * In DEMO_MODE the boundary is intentionally lenient: the demo auto-auth
 * issues the cookie server-side, so the guided demo stays frictionless.
 *
 * Public browsing (no session required): "/" (the marketing landing page),
 * the catalog, and course detail pages. Everything else — the course player
 * (/courses/[id]/learn), judge, labs, assessments, gamification, commerce,
 * admin, support — stays behind the session gate.
 */
function isPublicRoute(pathname: string): boolean {
  if (pathname === "/" || pathname === "/courses" || pathname === "/offline") {
    return true;
  }
  if (pathname === "/judge" || pathname === "/labs") return true;
  if (/^\/judge\/[^/]+$/.test(pathname)) return true;
  if (/^\/labs\/[^/]+$/.test(pathname)) return true;
  if (/^\/rank\/verify\/[^/]+$/.test(pathname)) return true;
  // Course detail pages are a single segment under /courses (e.g.
  // /courses/<id>); deeper paths like /courses/<id>/learn are enrolled
  // learner surfaces and remain gated.
  return /^\/courses\/[^/]+$/.test(pathname);
}

export async function proxy(request: NextRequest) {
  if (DEMO_MODE) return NextResponse.next();
  if (isPublicRoute(request.nextUrl.pathname)) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const valid = await verifySessionToken(token);
  if (valid) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set(
    "next",
    request.nextUrl.pathname + request.nextUrl.search,
  );
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // Protect everything except public assets, API routes and the auth
    // pages. Files with a dot (monaco AMD under /vs, fonts, icons) are
    // static assets and stay public.
    "/((?!api|_next/static|_next/image|favicon.ico|login|register|.*\\..*).*)",
  ],
};

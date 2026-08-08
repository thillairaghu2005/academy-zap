import { NextRequest, NextResponse } from "next/server";

import { DEMO_MODE } from "@/lib/config";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/server/session";

function isPublicRoute(pathname: string): boolean {
  if (pathname === "/" || pathname === "/courses" || pathname === "/offline") {
    return true;
  }
  if (pathname === "/judge" || pathname === "/labs" || pathname === "/mentors") return true;
  if (/^\/judge\/[^/]+$/.test(pathname)) return true;
  if (/^\/labs\/[^/]+$/.test(pathname)) return true;
  if (/^\/mentors\/[^/]+$/.test(pathname)) return true;
  if (/^\/rank\/verify\/[^/]+$/.test(pathname)) return true;
  // Course detail pages are a single segment under /courses (e.g.
  // /courses/<id>); deeper paths like /courses/<id>/learn are enrolled
  // learner surfaces and remain gated.
  return /^\/courses\/[^/]+$/.test(pathname);
}

function safeNextPath(request: NextRequest): string {
  const target = request.nextUrl.pathname + request.nextUrl.search;
  if (
    target.length > 2048 ||
    target.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(target)
  ) {
    return "/";
  }
  try {
    const decodedPath = decodeURIComponent(request.nextUrl.pathname);
    if (
      decodedPath.startsWith("//") ||
      decodedPath.includes("\\") ||
      /[\u0000-\u001f\u007f]/.test(decodedPath)
    ) {
      return "/";
    }
  } catch {
    return "/";
  }
  return target;
}

export async function proxy(request: NextRequest) {
  if (DEMO_MODE) return NextResponse.next();
  if (isPublicRoute(request.nextUrl.pathname)) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  let valid: Awaited<ReturnType<typeof verifySessionToken>>;
  try {
    valid = await verifySessionToken(token);
  } catch {
    return NextResponse.json(
      {
        code: "session_unavailable",
        message: "The auth service is unavailable. Please try again later.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (valid) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", safeNextPath(request));
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

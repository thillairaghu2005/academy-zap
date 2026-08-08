import { NextResponse } from "next/server";

/** Authentication is client-only; localStorage is unavailable to proxy. */
export function proxy() {
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protect everything except public assets, API routes and the auth
    // pages. Files with a dot (monaco AMD under /vs, fonts, icons) are
    // static assets and stay public.
    "/((?!api|_next/static|_next/image|favicon.ico|login|register|.*\\..*).*)",
  ],
};

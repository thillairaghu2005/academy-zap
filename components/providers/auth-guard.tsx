"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import { AppRouteLoading } from "@/components/shared/route-loading";
import { useSession } from "@/components/providers/session-provider";

function isPublicRoute(pathname: string): boolean {
  if (pathname === "/" || pathname === "/offline") return true;
  // Course listing and detail pages are public — guests can browse and read
  // course details without an account. The learn/player sub-route (/courses/:id/learn)
  // is intentionally excluded: the regex matches exactly one path segment.
  if (pathname === "/courses") return true;
  if (/^\/courses\/[^/]+$/.test(pathname)) return true;
  return false;
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, isLoading } = useSession();
  const publicRoute = isPublicRoute(pathname);

  React.useEffect(() => {
    if (publicRoute || isLoading || session.status === "authenticated") return;

    const next = `${pathname}${window.location.search}`;
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [isLoading, pathname, publicRoute, router, session.status]);

  if (publicRoute) return <>{children}</>;
  if (isLoading || session.status !== "authenticated") return <AppRouteLoading />;
  return <>{children}</>;
}

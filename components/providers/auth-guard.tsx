"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import { AppRouteLoading } from "@/components/shared/route-loading";
import { useSession } from "@/components/providers/session-provider";

function isPublicRoute(pathname: string): boolean {
  if (pathname === "/" || pathname === "/courses" || pathname === "/offline") {
    return true;
  }
  if (pathname === "/judge" || pathname === "/labs" || pathname === "/mentors") {
    return true;
  }
  if (/^\/judge\/[^/]+$/.test(pathname)) return true;
  if (/^\/labs\/[^/]+$/.test(pathname)) return true;
  if (/^\/mentors\/[^/]+$/.test(pathname)) return true;
  if (/^\/rank\/verify\/[^/]+$/.test(pathname)) return true;
  return /^\/courses\/[^/]+$/.test(pathname);
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

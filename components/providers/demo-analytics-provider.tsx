"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { trackDemoEvent } from "@/lib/demo/analytics";

export function DemoAnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const lastPath = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    trackDemoEvent("page_view");
  }, [pathname]);

  return <>{children}</>;
}

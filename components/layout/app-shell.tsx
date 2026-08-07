"use client";

import * as React from "react";

import { TopNav } from "@/components/layout/top-nav";
import { SideNav } from "@/components/layout/side-nav";
import { BottomNavigation } from "@/components/layout/bottom-navigation";

/**
 * Global app shell (build.md F0). Every authenticated surface renders inside
 * this: sticky top nav + responsive side nav + content region.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-background bg-[radial-gradient(circle_at_70%_-10%,rgba(96,165,250,.08),transparent_32rem)]">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Skip to content
      </a>
      <TopNav />
      <div className="flex min-h-0 flex-1">
        <SideNav />
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 pb-20 outline-none lg:pb-0">
          {children}
        </main>
      </div>
      <BottomNavigation />
    </div>
  );
}

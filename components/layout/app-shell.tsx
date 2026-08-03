"use client";

import * as React from "react";

import { TopNav } from "@/components/layout/top-nav";
import { SideNav } from "@/components/layout/side-nav";

/**
 * Global app shell (build.md F0). Every authenticated surface renders inside
 * this: sticky top nav + responsive side nav + content region.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-background">
      <TopNav />
      <div className="flex min-h-0 flex-1">
        <SideNav />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

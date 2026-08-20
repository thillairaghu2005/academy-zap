"use client";

import * as React from "react";

import { TopNav } from "@/components/layout/top-nav";
import { SideNav } from "@/components/layout/side-nav";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { NavigationTour } from "@/components/demo/navigation-tour";
import { AuthGuard } from "@/components/providers/auth-guard";
import { DemoModeBadge } from "@/components/layout/demo-mode-badge";
import { AiTutor } from "@/components/ai/tutor";
import { XpFlyout } from "@/components/gamification/xp-flyout";
import { LevelUpCelebration } from "@/components/gamification/level-up-celebration";
import { useSession } from "@/components/providers/session-provider";
import { useRealtimeUpdates } from "@/lib/real-time/sse";

/**
 * Activates the real-time SSE freshness channel while a user is signed in (backend mode
 * only — demo mode is a no-op). SSE only invalidates queries; the server stays authoritative.
 */
function RealtimeUpdates() {
  const { user } = useSession();
  useRealtimeUpdates(Boolean(user));
  return null;
}

/**
 * Global app shell (build.md F0). Every authenticated surface renders inside
 * this: sticky top nav + responsive side nav + content region.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="relative flex min-h-dvh flex-col overflow-x-clip bg-background">
        <a
          href="#main-content"
          className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Skip to content
        </a>
        <TopNav />
        <DemoModeBadge />
        <div className="flex min-h-0 flex-1">
          <SideNav />
          <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 pb-20 outline-none lg:pb-0">
            {children}
          </main>
        </div>
        <BottomNavigation />
        <NavigationTour />
        <AiTutor />
        <XpFlyout />
        <LevelUpCelebration />
        <RealtimeUpdates />
      </div>
    </AuthGuard>
  );
}

"use client";

import * as React from "react";
import { WifiOff } from "lucide-react";

import { useAnnounce } from "@/components/providers/live-region-provider";
import { useOnlineStatus } from "@/hooks/use-online-status";

/**
 * Connectivity pill for the top nav. Appears only while offline and announces
 * the transition for screen readers — a demo of the offline status surface
 * (build.md task: visible offline indicator + async announcements).
 */
export function OfflineIndicator() {
  const online = useOnlineStatus();
  const announce = useAnnounce();
  const prevRef = React.useRef<boolean | null>(null);

  React.useEffect(() => {
    if (prevRef.current !== null && prevRef.current !== online) {
      announce(
        online
          ? "Back online — live demo data is available again."
          : "You are offline. Courses saved for offline reading remain available.",
      );
    }
    prevRef.current = online;
  }, [online, announce]);

  if (online) return null;

  return (
    <span
      role="status"
      className="inline-flex items-center gap-1.5 rounded-full border border-warning/25 bg-warning/10 px-2.5 py-1 text-caption font-medium text-warning-strong"
    >
      <WifiOff className="size-3.5" />
      Offline
    </span>
  );
}

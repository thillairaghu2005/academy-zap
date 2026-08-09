"use client";

import * as React from "react";

export function getOnlineStatus(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

export function subscribeOnlineStatus(listener: (online: boolean) => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onOnline = () => listener(true);
  const onOffline = () => listener(false);
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
  };
}

/**
 * Live browser connectivity state. Used by the top-nav offline indicator and
 * the demo settings surface. SSR-safe (defaults to online while hydrating).
 */
export function useOnlineStatus(): boolean {
  // Initialize from the real browser state on the first client render so an
  // offline user never sees a wrong "online" flash before the effect syncs.
  const [online, setOnline] = React.useState<boolean>(() => getOnlineStatus());

  React.useEffect(() => {
    return subscribeOnlineStatus(setOnline);
  }, []);

  return online;
}

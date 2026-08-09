"use client";

import * as React from "react";

interface LiveRegionValue {
  announce: (message: string) => void;
}

const LiveRegionContext = React.createContext<LiveRegionValue | null>(null);

export function LiveRegionProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = React.useState("");
  const announce = React.useCallback((next: string) => setMessage(next), []);

  return (
    <LiveRegionContext.Provider value={{ announce }}>
      {children}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {message}
      </div>
    </LiveRegionContext.Provider>
  );
}

export function useAnnounce(): (message: string) => void {
  const context = React.useContext(LiveRegionContext);
  if (!context) throw new Error("useAnnounce must be used within LiveRegionProvider");
  return context.announce;
}

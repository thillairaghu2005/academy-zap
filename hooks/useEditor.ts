"use client";

import * as React from "react";

import type { IDESettings } from "@/types/ide";

const DEFAULT_SETTINGS: IDESettings = {
  wordWrap: false,
  minimap: true,
  fontSize: 13,
};

export function useEditor(storageKey = "ide:settings") {
  const [settings, setSettings] = React.useState<IDESettings>(DEFAULT_SETTINGS);

  React.useEffect(() => {
    let timer = 0;
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const nextSettings = { ...DEFAULT_SETTINGS, ...(JSON.parse(stored) as Partial<IDESettings>) };
        timer = window.setTimeout(() => setSettings(nextSettings), 0);
      }
    } catch {
      // Local storage is optional; the editor remains fully usable when blocked.
    }
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  React.useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(settings));
  }, [settings, storageKey]);

  const updateSettings = React.useCallback((patch: Partial<IDESettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  return { settings, updateSettings };
}

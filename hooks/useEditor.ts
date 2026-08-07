"use client";

import * as React from "react";

import type { IDESettings } from "@/types/ide";

const DEFAULT_SETTINGS: IDESettings = {
  wordWrap: false,
  minimap: true,
  fontSize: 14,
};

function normalizeSettings(value: Partial<IDESettings>): IDESettings {
  const fontSize = typeof value.fontSize === "number"
    ? Math.min(20, Math.max(12, Math.round(value.fontSize)))
    : DEFAULT_SETTINGS.fontSize;
  return {
    wordWrap: typeof value.wordWrap === "boolean" ? value.wordWrap : DEFAULT_SETTINGS.wordWrap,
    minimap: typeof value.minimap === "boolean" ? value.minimap : DEFAULT_SETTINGS.minimap,
    fontSize,
  };
}

export function useEditor(storageKey = "ide:settings") {
  const [settings, setSettings] = React.useState<IDESettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    let timer = 0;
    try {
      const stored = window.localStorage.getItem(storageKey);
      const nextSettings = stored ? normalizeSettings(JSON.parse(stored) as Partial<IDESettings>) : DEFAULT_SETTINGS;
      timer = window.setTimeout(() => {
        if (stored) setSettings(nextSettings);
        setHydrated(true);
      }, 0);
    } catch {
      // Local storage is optional; the editor remains fully usable when blocked.
    }
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  React.useEffect(() => {
    try {
      if (!hydrated) return;
      window.localStorage.setItem(storageKey, JSON.stringify(settings));
    } catch {
      // Local storage is optional; the editor remains fully usable when blocked.
    }
  }, [hydrated, settings, storageKey]);

  const updateSettings = React.useCallback((patch: Partial<IDESettings>) => {
    setSettings((current) => normalizeSettings({ ...current, ...patch }));
  }, []);

  return { settings, updateSettings };
}

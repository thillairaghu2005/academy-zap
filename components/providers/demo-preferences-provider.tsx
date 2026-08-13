"use client";

import * as React from "react";

import {
  DEFAULT_DEMO_PREFERENCES,
  getDemoPreferences,
  getCatalogView,
  saveDemoPreferences,
  type CatalogView,
  saveCatalogView,
  type DemoPreferences,
} from "@/lib/demo/preferences";
import { subscribeDemoStorage } from "@/lib/demo/storage";

interface DemoPreferencesContextValue extends DemoPreferences {
  setCompactMode: (value: boolean) => void;
  setReduceData: (value: boolean) => void;
  catalogView: CatalogView;
  setCatalogView: (value: CatalogView) => void;
}

const DemoPreferencesContext = React.createContext<DemoPreferencesContextValue | null>(null);

export function DemoPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = React.useState<DemoPreferences>(DEFAULT_DEMO_PREFERENCES);
  const [catalogView, setCatalogViewState] = React.useState<CatalogView>("grid");

  React.useEffect(() => {
    const sync = () => {
      setPreferences(getDemoPreferences());
      setCatalogViewState(getCatalogView());
    };
    sync();
    return subscribeDemoStorage(sync);
  }, []);

  React.useEffect(() => {
    document.documentElement.dataset.density = preferences.compactMode ? "compact" : "comfortable";
    document.documentElement.dataset.reduceData = preferences.reduceData ? "true" : "false";
  }, [preferences]);

  const update = React.useCallback((next: DemoPreferences) => {
    setPreferences(next);
    saveDemoPreferences(next);
  }, []);

  const value = React.useMemo<DemoPreferencesContextValue>(() => ({
    ...preferences,
    catalogView,
    setCompactMode: (value) => update({ ...preferences, compactMode: value }),
    setReduceData: (value) => update({ ...preferences, reduceData: value }),
    setCatalogView: (value) => {
      setCatalogViewState(value);
      saveCatalogView(value);
    },
  }), [catalogView, preferences, update]);

  return (
    <DemoPreferencesContext.Provider value={value}>
      {children}
    </DemoPreferencesContext.Provider>
  );
}

export function useDemoPreferences(): DemoPreferencesContextValue {
  const value = React.useContext(DemoPreferencesContext);
  if (!value) throw new Error("useDemoPreferences must be used within DemoPreferencesProvider");
  return value;
}

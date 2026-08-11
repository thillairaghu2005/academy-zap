import {
  DEMO_STORAGE_KEYS,
  readDemoStorage,
  writeDemoStorage,
} from "./storage";

export interface DemoPreferences {
  compactMode: boolean;
  reduceData: boolean;
}

export type CatalogView = "grid" | "list";

export const DEFAULT_DEMO_PREFERENCES: DemoPreferences = {
  compactMode: false,
  reduceData: false,
};

export function getDemoPreferences(): DemoPreferences {
  const saved = readDemoStorage<Partial<DemoPreferences>>(
    DEMO_STORAGE_KEYS.preferences,
    {},
  );
  return {
    ...DEFAULT_DEMO_PREFERENCES,
    ...saved,
  };
}

export function saveDemoPreferences(next: DemoPreferences): void {
  const current = readDemoStorage<Record<string, unknown>>(DEMO_STORAGE_KEYS.preferences, {});
  writeDemoStorage(DEMO_STORAGE_KEYS.preferences, { ...current, ...next });
}

export function getCatalogView(): CatalogView {
  const saved = readDemoStorage<{ catalogView?: CatalogView }>(DEMO_STORAGE_KEYS.preferences, {});
  return saved.catalogView === "list" ? "list" : "grid";
}

export function saveCatalogView(value: CatalogView): void {
  const current = readDemoStorage<DemoPreferences>(DEMO_STORAGE_KEYS.preferences, DEFAULT_DEMO_PREFERENCES);
  writeDemoStorage(DEMO_STORAGE_KEYS.preferences, { ...current, catalogView: value });
}

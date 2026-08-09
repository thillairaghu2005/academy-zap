import {
  DEMO_STORAGE_KEYS,
  readDemoStorage,
  writeDemoStorage,
} from "./storage";

export interface DemoPreferences {
  compactMode: boolean;
  reduceData: boolean;
}

export const DEFAULT_DEMO_PREFERENCES: DemoPreferences = {
  compactMode: false,
  reduceData: false,
};

export function getDemoPreferences(): DemoPreferences {
  return {
    ...DEFAULT_DEMO_PREFERENCES,
    ...readDemoStorage<Partial<DemoPreferences>>(
      DEMO_STORAGE_KEYS.preferences,
      {},
    ),
  };
}

export function saveDemoPreferences(next: DemoPreferences): void {
  writeDemoStorage(DEMO_STORAGE_KEYS.preferences, next);
}

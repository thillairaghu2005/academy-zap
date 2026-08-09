import {
  DEMO_STORAGE_KEYS,
  readDemoStorage,
  writeDemoStorage,
} from "./storage";

export interface DemoActivity {
  type: string;
  label: string;
  created_at: string;
  metadata?: Record<string, string | number>;
}

export function recordDemoActivity(
  type: string,
  label: string,
  metadata?: Record<string, string | number>,
): void {
  const current = readDemoStorage<DemoActivity[]>(DEMO_STORAGE_KEYS.activity, []);
  current.push({ type, label, metadata, created_at: new Date().toISOString() });
  writeDemoStorage(DEMO_STORAGE_KEYS.activity, current.slice(-100));
}

export function getDemoActivity(): DemoActivity[] {
  return readDemoStorage<DemoActivity[]>(DEMO_STORAGE_KEYS.activity, []);
}

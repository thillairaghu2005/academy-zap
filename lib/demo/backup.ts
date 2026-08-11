import { DEMO_STORAGE_KEYS, writeDemoStorage } from "./storage";

const BACKUP_VERSION = 1;
const EXTRA_KEYS = ["zapsters.mock.cart"] as const;

export interface DemoBackup {
  version: 1;
  exported_at: string;
  stores: Record<string, unknown>;
}

export function createDemoBackup(): DemoBackup {
  const stores: Record<string, unknown> = {};
  if (typeof window === "undefined") {
    return { version: BACKUP_VERSION, exported_at: new Date().toISOString(), stores };
  }

  for (const key of [...Object.values(DEMO_STORAGE_KEYS), ...EXTRA_KEYS]) {
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;
    try {
      stores[key] = JSON.parse(raw);
    } catch {
      stores[key] = raw;
    }
  }

  return { version: BACKUP_VERSION, exported_at: new Date().toISOString(), stores };
}

export function downloadDemoBackup(): void {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify(createDemoBackup(), null, 2);
  const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `zapsters-demo-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function importDemoBackup(raw: string): void {
  const parsed = JSON.parse(raw) as Partial<DemoBackup>;
  if (parsed.version !== BACKUP_VERSION || !parsed.stores || typeof parsed.stores !== "object") {
    throw new Error("This is not a compatible Zapsters demo backup.");
  }

  const allowed = new Set<string>([...Object.values(DEMO_STORAGE_KEYS), ...EXTRA_KEYS]);
  for (const [key, value] of Object.entries(parsed.stores)) {
    if (!allowed.has(key)) continue;
    writeDemoStorage(key, value);
  }
}

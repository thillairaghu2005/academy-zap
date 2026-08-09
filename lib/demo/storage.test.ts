import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEMO_STORAGE_KEYS,
  readDemoStorage,
  removeDemoStorage,
  resetDemoStorage,
  subscribeDemoStorage,
  writeDemoStorage,
} from "@/lib/demo/storage";

const values = new Map<string, string>();
const listeners = new Map<string, Set<(event: unknown) => void>>();

const localStorageStub = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => values.set(key, value),
  removeItem: (key: string) => values.delete(key),
  clear: () => values.clear(),
  key: (index: number) => [...values.keys()][index] ?? null,
  get length() {
    return values.size;
  },
} as Storage;

const windowStub = {
  localStorage: localStorageStub,
  addEventListener: (type: string, listener: (event: unknown) => void) => {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type)!.add(listener);
  },
  removeEventListener: (type: string, listener: (event: unknown) => void) => {
    listeners.get(type)?.delete(listener);
  },
  dispatchEvent: (event: CustomEvent) => {
    listeners.get(event.type)?.forEach((listener) => listener(event));
    return true;
  },
  location: { pathname: "/dashboard" },
} as unknown as Window & typeof globalThis;

Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: windowStub,
});

describe("demo storage", () => {
  beforeEach(() => {
    values.clear();
    listeners.clear();
  });

  it("returns the fallback when a key is empty or corrupt", () => {
    expect(readDemoStorage("missing", 42)).toBe(42);
    values.set("corrupt", "{not json");
    expect(readDemoStorage("corrupt", 42)).toBe(42);
  });

  it("round-trips JSON values", () => {
    writeDemoStorage("key", { a: [1, 2, 3] });
    expect(readDemoStorage("key", null)).toEqual({ a: [1, 2, 3] });
  });

  it("dispatches a demo-state event on write", () => {
    const listener = vi.fn();
    windowStub.addEventListener("zapsters:demo-state", listener);
    writeDemoStorage("key", "value");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("removes a key and notifies subscribers", () => {
    writeDemoStorage("key", "value");
    const listener = vi.fn();
    const unsubscribe = subscribeDemoStorage(listener);
    removeDemoStorage("key");
    expect(readDemoStorage("key", null)).toBeNull();
    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });

  it("resetDemoStorage wipes every demo key plus the legacy mock cart", () => {
    writeDemoStorage(DEMO_STORAGE_KEYS.progress, { x: 1 });
    writeDemoStorage(DEMO_STORAGE_KEYS.analytics, [{ id: "e" }]);
    values.set("zapsters.mock.cart", "{}");
    values.set("unrelated-key", "keep-me");

    resetDemoStorage();

    for (const key of Object.values(DEMO_STORAGE_KEYS)) {
      expect(values.has(key)).toBe(false);
    }
    expect(values.has("zapsters.mock.cart")).toBe(false);
    expect(values.get("unrelated-key")).toBe("keep-me");
  });
});

import { beforeEach, describe, expect, it } from "vitest";

import {
  DEFAULT_DEMO_PREFERENCES,
  getDemoPreferences,
  saveDemoPreferences,
} from "@/lib/demo/preferences";
import { DEMO_STORAGE_KEYS } from "@/lib/demo/storage";

const values = new Map<string, string>();

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
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  dispatchEvent: () => true,
} as unknown as Window & typeof globalThis;

Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: windowStub,
});

describe("demo preferences", () => {
  beforeEach(() => {
    values.clear();
  });

  it("returns defaults when nothing is stored", () => {
    expect(getDemoPreferences()).toEqual(DEFAULT_DEMO_PREFERENCES);
  });

  it("persists and restores partial preference updates", () => {
    saveDemoPreferences({ compactMode: true, reduceData: false });

    const raw = values.get(DEMO_STORAGE_KEYS.preferences) ?? "{}";
    expect(JSON.parse(raw)).toEqual({ compactMode: true, reduceData: false });
    expect(getDemoPreferences()).toEqual({
      compactMode: true,
      reduceData: false,
    });
  });

  it("merges partial reads over the defaults", () => {
    values.set(DEMO_STORAGE_KEYS.preferences, JSON.stringify({ reduceData: true }));
    expect(getDemoPreferences()).toEqual({
      compactMode: false,
      reduceData: true,
    });
  });
});

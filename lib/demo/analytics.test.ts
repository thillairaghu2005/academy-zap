import { beforeEach, describe, expect, it } from "vitest";

import {
  clearDemoAnalytics,
  getAnalyticsSummary,
  trackDemoEvent,
} from "@/lib/demo/analytics";
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
  location: { pathname: "/dashboard" },
} as unknown as Window & typeof globalThis;

Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: windowStub,
});

describe("demo analytics", () => {
  beforeEach(() => {
    values.clear();
  });

  it("tracks events with type, path and timestamp", () => {
    trackDemoEvent("lesson_completed", { course_id: "c1" });

    const raw = values.get(DEMO_STORAGE_KEYS.analytics) ?? "[]";
    const events = JSON.parse(raw) as {
      type: string;
      path?: string;
      metadata?: Record<string, unknown>;
      created_at: string;
    }[];
    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe("lesson_completed");
    expect(events[0]!.path).toBe("/dashboard");
    expect(events[0]!.metadata).toEqual({ course_id: "c1" });
    expect(new Date(events[0]!.created_at).getTime()).not.toBeNaN();
  });

  it("summarizes event counts by type", () => {
    trackDemoEvent("page_view");
    trackDemoEvent("page_view");
    trackDemoEvent("lesson_completed");
    trackDemoEvent("lab_started");
    trackDemoEvent("assessment_submitted");
    trackDemoEvent("judge_submitted");

    const summary = getAnalyticsSummary();
    expect(summary.total).toBe(6);
    expect(summary.pages).toBe(1);
    expect(summary.completedLessons).toBe(1);
    expect(summary.labStarts).toBe(1);
    expect(summary.assessmentSubmissions).toBe(1);
    expect(summary.judgeSubmissions).toBe(1);
  });

  it("clearDemoAnalytics empties the store", () => {
    trackDemoEvent("page_view");
    clearDemoAnalytics();
    expect(getAnalyticsSummary().total).toBe(0);
  });
});

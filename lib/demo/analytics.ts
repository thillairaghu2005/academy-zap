import {
  DEMO_STORAGE_KEYS,
  readDemoStorage,
  writeDemoStorage,
} from "./storage";

export interface DemoAnalyticsEvent {
  id: string;
  type: string;
  path?: string;
  metadata?: Record<string, string | number | boolean | null>;
  created_at: string;
}

const MAX_EVENTS = 500;

function makeId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

export function getDemoAnalytics(): DemoAnalyticsEvent[] {
  return readDemoStorage<DemoAnalyticsEvent[]>(DEMO_STORAGE_KEYS.analytics, []);
}

export function trackDemoEvent(
  type: string,
  metadata?: Record<string, string | number | boolean | null>,
): void {
  const events = getDemoAnalytics();
  events.push({
    id: makeId(),
    type,
    path: typeof window === "undefined" ? undefined : window.location.pathname,
    metadata,
    created_at: new Date().toISOString(),
  });
  writeDemoStorage(DEMO_STORAGE_KEYS.analytics, events.slice(-MAX_EVENTS));
}

export function clearDemoAnalytics(): void {
  writeDemoStorage(DEMO_STORAGE_KEYS.analytics, []);
}

export function getAnalyticsSummary(): {
  total: number;
  pages: number;
  completedLessons: number;
  labStarts: number;
  assessmentSubmissions: number;
  judgeSubmissions: number;
} {
  const events = getDemoAnalytics();
  return {
    total: events.length,
    pages: new Set(events.filter((event) => event.type === "page_view").map((event) => event.path)).size,
    completedLessons: events.filter((event) => event.type === "lesson_completed").length,
    labStarts: events.filter((event) => event.type === "lab_started").length,
    assessmentSubmissions: events.filter((event) => event.type === "assessment_submitted").length,
    judgeSubmissions: events.filter((event) => event.type === "judge_submitted").length,
  };
}

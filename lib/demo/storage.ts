export const DEMO_STORAGE_KEYS = {
  analytics: "zapsters.demo.analytics.v1",
  activity: "zapsters.demo.activity.v1",
  preferences: "zapsters.demo.preferences.v1",
  scenario: "zapsters.demo.scenario.v1",
  tour: "zapsters.demo.tour.v1",
  courseNotes: "zapsters.demo.course-notes.v1",
  progress: "zapsters.demo.progress.v1",
  attempts: "zapsters.demo.attempts.v1",
  labSessions: "zapsters.demo.lab-sessions.v1",
  notificationReads: "zapsters.demo.notification-reads.v1",
  commerce: "zapsters.demo.commerce.v1",
} as const;

export function readDemoStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeDemoStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("zapsters:demo-state", { detail: { key } }));
  } catch {
    // Private browsing and exhausted storage should not break the demo.
  }
}

export function removeDemoStorage(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
    window.dispatchEvent(new CustomEvent("zapsters:demo-state", { detail: { key } }));
  } catch {
    // Storage may be unavailable.
  }
}

export function resetDemoStorage(): void {
  if (typeof window === "undefined") return;
  for (const key of Object.values(DEMO_STORAGE_KEYS)) removeDemoStorage(key);
  window.localStorage.removeItem("zapsters.mock.cart");
  window.localStorage.removeItem("zapsters.mock.course-cache");
  window.localStorage.removeItem("zapsters.theme");
  window.dispatchEvent(new CustomEvent("zapsters:demo-reset"));
  // Best-effort clear of the IndexedDB course mirror — never blocks the
  // localStorage reset if the db is unavailable.
  void import("./idb").then(({ idbClearCourses }) => idbClearCourses());
}

export function subscribeDemoStorage(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onStorage = () => listener();
  const onDemoState = () => listener();
  window.addEventListener("storage", onStorage);
  window.addEventListener("zapsters:demo-state", onDemoState);
  window.addEventListener("zapsters:demo-reset", onDemoState);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("zapsters:demo-state", onDemoState);
    window.removeEventListener("zapsters:demo-reset", onDemoState);
  };
}

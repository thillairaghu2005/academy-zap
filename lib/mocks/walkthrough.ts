/**
 * Admin walkthrough "seen" state (F7 Task 1).
 *
 * Persisted per user in localStorage. There is no real auth or user_prefs
 * table yet (build.md §3), so this is the mock stand-in for what the real
 * A future account service could store this — flagged provisional in the
 * assumption register. Purely a UI flag; never gates anything.
 */

const storageKey = (userId: string) => `zapsters.walkthrough_seen.${userId}`;

export function isWalkthroughSeen(userId: string): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(storageKey(userId)) === "1";
}

export function markWalkthroughSeen(userId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(userId), "1");
}

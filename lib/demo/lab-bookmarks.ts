import { DEMO_STORAGE_KEYS, readDemoStorage, writeDemoStorage } from "./storage";

export function listBookmarkedLabIds(): string[] {
  const value = readDemoStorage<unknown>(DEMO_STORAGE_KEYS.labBookmarks, []);
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
}

export function isLabBookmarked(labId: string): boolean {
  return listBookmarkedLabIds().includes(labId);
}

export function toggleLabBookmark(labId: string): boolean {
  const ids = listBookmarkedLabIds();
  const exists = ids.includes(labId);
  writeDemoStorage(DEMO_STORAGE_KEYS.labBookmarks, exists ? ids.filter((id) => id !== labId) : [...ids, labId]);
  return !exists;
}

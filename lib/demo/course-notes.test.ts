import { beforeEach, describe, expect, it } from "vitest";

import {
  getCourseNotes,
  getLessonNote,
  isCourseBookmarked,
  listBookmarkedCourseIds,
  saveLessonNote,
  toggleCourseBookmark,
} from "@/lib/demo/course-notes";

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

describe("course notes + bookmarks", () => {
  beforeEach(() => {
    values.clear();
  });

  it("stores notes per course/lesson and reads them back", () => {
    saveLessonNote("course-a", "lesson-1", "Remember: TLS 1.3");
    expect(getLessonNote("course-a", "lesson-1")).toBe("Remember: TLS 1.3");
    expect(getCourseNotes("course-a")).toEqual({
      "lesson-1": "Remember: TLS 1.3",
    });
    // Other courses/lessons unaffected.
    expect(getLessonNote("course-a", "lesson-2")).toBe("");
    expect(getLessonNote("course-b", "lesson-1")).toBe("");
  });

  it("deletes the note when saved empty", () => {
    saveLessonNote("course-a", "lesson-1", "   ");
    expect(getLessonNote("course-a", "lesson-1")).toBe("");
    expect(getCourseNotes("course-a")).toEqual({});
  });

  it("toggles bookmarks and keeps them deduplicated", () => {
    expect(isCourseBookmarked("course-a")).toBe(false);
    expect(toggleCourseBookmark("course-a")).toBe(true);
    expect(toggleCourseBookmark("course-a")).toBe(false);
    expect(isCourseBookmarked("course-a")).toBe(false);

    toggleCourseBookmark("course-a");
    toggleCourseBookmark("course-b");
    expect(listBookmarkedCourseIds()).toEqual(["course-a", "course-b"]);
  });
});

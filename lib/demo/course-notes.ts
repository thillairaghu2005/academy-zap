import {
  DEMO_STORAGE_KEYS,
  readDemoStorage,
  writeDemoStorage,
} from "./storage";

/**
 * Richer course UX (Task 4) — per-course notes and bookmarks, persisted in
 * the browser. Notes are keyed by course then lesson; bookmarks are the set
 * of course ids a learner pinned for later.
 */

interface CourseNotesState {
  /** courseId → lessonId → note text */
  notes: Record<string, Record<string, string>>;
  /** course ids the learner bookmarked */
  bookmarks: string[];
}

const DEFAULT_STATE: CourseNotesState = { notes: {}, bookmarks: [] };

function readState(): CourseNotesState {
  const persisted = readDemoStorage<Partial<CourseNotesState> | null>(
    DEMO_STORAGE_KEYS.courseNotes,
    null,
  );
  if (!persisted || typeof persisted !== "object") return DEFAULT_STATE;
  return {
    notes: persisted.notes && typeof persisted.notes === "object" ? persisted.notes : {},
    bookmarks: Array.isArray(persisted.bookmarks) ? persisted.bookmarks : [],
  };
}

function writeState(state: CourseNotesState): void {
  writeDemoStorage(DEMO_STORAGE_KEYS.courseNotes, state);
}

export function getLessonNote(courseId: string, lessonId: string): string {
  const state = readState();
  return state.notes[courseId]?.[lessonId] ?? "";
}

export function saveLessonNote(
  courseId: string,
  lessonId: string,
  note: string,
): void {
  const state = readState();
  const courseNotes = state.notes[courseId] ?? {};
  if (note.trim()) {
    courseNotes[lessonId] = note;
  } else {
    delete courseNotes[lessonId];
  }
  state.notes[courseId] = courseNotes;
  writeState(state);
}

export function getCourseNotes(courseId: string): Record<string, string> {
  const state = readState();
  return state.notes[courseId] ?? {};
}

export function isCourseBookmarked(courseId: string): boolean {
  const state = readState();
  return state.bookmarks.includes(courseId);
}

export function toggleCourseBookmark(courseId: string): boolean {
  const state = readState();
  const exists = state.bookmarks.includes(courseId);
  state.bookmarks = exists
    ? state.bookmarks.filter((id) => id !== courseId)
    : [...state.bookmarks, courseId];
  writeState(state);
  return !exists;
}

export function listBookmarkedCourseIds(): string[] {
  return readState().bookmarks;
}

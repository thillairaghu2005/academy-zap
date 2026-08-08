import type { Enrollment } from "@/lib/contracts/content";
import {
  MOCK_COMPLETED_COURSE_ID,
  MOCK_ENROLLED_COURSE_ID,
  MOCK_FRESH_COURSE_ID,
} from "@/lib/mocks/courses";
import { MOCK_LEARNER } from "@/lib/mocks/users";

/**
 * In-memory mutable store for the frontend demo. State lives per page-load
 * (browser module instance) and resets on refresh unless a feature persists
 * it explicitly.
 */

/** Keyed `${userId}:${courseId}` so one learner can never read another's row. */
export const mockEnrollments = new Map<string, Enrollment>();

/** Keyed `${userId}:${courseId}` → set of completed lesson ids. */
export const mockCompletedLessons = new Map<string, Set<string>>();

// The demo learner's dashboard shows a spread of enrollment states: one in
// progress (resume position), one completed, and one fresh (0%). Progress is
// always derived from the completed-lesson sets below — the `progress_pct`
// fields in these snapshots are just the last demo-state writes.

mockEnrollments.set(`${MOCK_LEARNER.id}:${MOCK_ENROLLED_COURSE_ID}`, {
  course_id: MOCK_ENROLLED_COURSE_ID,
  user_id: MOCK_LEARNER.id,
  status: "active",
  // 3 of 10 lessons complete → derived 30%
  progress_pct: 30,
  last_lesson_id: "a1b2c3d4-0004",
  last_position_seconds: 214,
  enrolled_at: "2026-05-02T09:00:00Z",
  updated_at: "2026-07-30T18:42:00Z",
});

mockEnrollments.set(`${MOCK_LEARNER.id}:${MOCK_COMPLETED_COURSE_ID}`, {
  course_id: MOCK_COMPLETED_COURSE_ID,
  user_id: MOCK_LEARNER.id,
  status: "completed",
  progress_pct: 100,
  last_lesson_id: "f6a7b8c9-0006",
  last_position_seconds: 470,
  enrolled_at: "2026-03-10T09:00:00Z",
  updated_at: "2026-06-14T17:05:00Z",
});

mockEnrollments.set(`${MOCK_LEARNER.id}:${MOCK_FRESH_COURSE_ID}`, {
  course_id: MOCK_FRESH_COURSE_ID,
  user_id: MOCK_LEARNER.id,
  status: "active",
  progress_pct: 0,
  last_lesson_id: null,
  last_position_seconds: 0,
  enrolled_at: "2026-08-01T09:00:00Z",
  updated_at: "2026-08-01T09:00:00Z",
});

// Completed lessons per enrollment — the source of truth for progress.
mockCompletedLessons.set(`${MOCK_LEARNER.id}:${MOCK_ENROLLED_COURSE_ID}`, new Set([
  "a1b2c3d4-0001",
  "a1b2c3d4-0002",
  "a1b2c3d4-0003",
]));

mockCompletedLessons.set(`${MOCK_LEARNER.id}:${MOCK_COMPLETED_COURSE_ID}`, new Set([
  "f6a7b8c9-0001",
  "f6a7b8c9-0002",
  "f6a7b8c9-0003",
  "f6a7b8c9-0004",
  "f6a7b8c9-0005",
  "f6a7b8c9-0006",
]));

mockCompletedLessons.set(`${MOCK_LEARNER.id}:${MOCK_FRESH_COURSE_ID}`, new Set());

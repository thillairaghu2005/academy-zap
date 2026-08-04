import type { Enrollment } from "@/lib/contracts/content";
import { MOCK_ENROLLED_COURSE_ID } from "@/lib/mocks/courses";
import { MOCK_LEARNER } from "@/lib/mocks/users";

/**
 * In-memory mutable store for the mock backend — the stand-in for the
 * Content Engine's Postgres tables. State lives per page-load (browser
 * module instance) and resets on refresh, exactly like any mock backend
 * that isn't persisted. The real swap replaces these reads/writes with
 * fetch calls; nothing in the component layer changes.
 */

export const mockEnrollments = new Map<string, Enrollment>();

mockEnrollments.set(MOCK_ENROLLED_COURSE_ID, {
  course_id: MOCK_ENROLLED_COURSE_ID,
  user_id: MOCK_LEARNER.id,
  status: "active",
  progress_pct: 42,
  last_lesson_id: "a1b2c3d4-0004",
  last_position_seconds: 214,
  enrolled_at: "2026-05-02T09:00:00Z",
  updated_at: "2026-07-30T18:42:00Z",
});

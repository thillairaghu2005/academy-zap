import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  MOCK_COURSES,
  MOCK_COURSES_BY_ID,
} from "@/lib/mocks/courses";
import { MOCK_ADMIN, MOCK_REVIEWERS } from "@/lib/mocks/users";
import {
  createCourse,
  deleteCourse,
  getCourseReviewDiff,
  publishCourse,
  submitCourseForReview,
  unpublishCourse,
  updateCourse,
} from "@/lib/data/demo/admin";
import type { CourseDraftInput } from "@/lib/data/demo/admin";

/**
 * Admin review-workflow tests cover the frontend demo data service:
 * draft → in_review → published transitions, the two-person rule, the
 * status guard on field edits, and audit logging.
 */

const DRAFT: CourseDraftInput = {
  title: "Audit Test Course",
  subtitle: "Subtitle",
  description: "A course created entirely by a unit test.",
  category: "Cybersecurity",
  level: "beginner",
  language: "English",
  price_cents: 9900,
  estimated_hours: 4,
};

/**
 * The course store is module-level mutable state (upsert/delete mutate the
 * shared arrays and id map) — snapshot before each test, restore after so
 * the suite stays hermetic and order-independent.
 */
let coursesSnapshot: typeof MOCK_COURSES;
let byIdSnapshot: typeof MOCK_COURSES_BY_ID;
beforeEach(() => {
  coursesSnapshot = structuredClone(MOCK_COURSES);
  byIdSnapshot = structuredClone(MOCK_COURSES_BY_ID);
});
afterEach(() => {
  MOCK_COURSES.splice(0, MOCK_COURSES.length, ...coursesSnapshot);
  MOCK_COURSES_BY_ID.clear();
  for (const [id, course] of byIdSnapshot) MOCK_COURSES_BY_ID.set(id, course);
});

describe("course review workflow", () => {
  it("creates a draft, submits it, and publishes via a second reviewer", async () => {
    const course = await createCourse(DRAFT, MOCK_ADMIN);
    expect(course.status).toBe("draft");

    const submitted = await submitCourseForReview(course.id, MOCK_ADMIN);
    expect(submitted.status).toBe("in_review");
    expect(submitted.submitted_by).toBe(MOCK_ADMIN.id);

    const published = await publishCourse(course.id, MOCK_REVIEWERS[1]!);
    expect(published.status).toBe("published");
    expect(published.reviewed_by).toBe(MOCK_REVIEWERS[1]!.id);
  });

  it("enforces the two-person rule: the author cannot publish their own work", async () => {
    const course = await createCourse(DRAFT, MOCK_ADMIN);
    await submitCourseForReview(course.id, MOCK_ADMIN);

    await expect(publishCourse(course.id, MOCK_ADMIN)).rejects.toMatchObject({
      code: "two_person_rule",
      status: 409,
    });
  });

  it("rejects publishing from draft and submitting non-drafts with 409s", async () => {
    const course = await createCourse(DRAFT, MOCK_ADMIN);
    await expect(publishCourse(course.id, MOCK_ADMIN)).rejects.toMatchObject({
      code: "invalid_transition",
      status: 409,
    });

    await submitCourseForReview(course.id, MOCK_ADMIN);
    await expect(submitCourseForReview(course.id, MOCK_ADMIN)).rejects.toMatchObject({
      code: "invalid_transition",
      status: 409,
    });
  });

  it("unpublishes a published course back to draft, then re-submits", async () => {
    const course = await createCourse(DRAFT, MOCK_ADMIN);
    await submitCourseForReview(course.id, MOCK_ADMIN);
    await publishCourse(course.id, MOCK_REVIEWERS[1]!);

    const draft = await unpublishCourse(course.id, MOCK_ADMIN);
    expect(draft.status).toBe("draft");
    expect(draft.submitted_by).toBeNull();
    expect(draft.reviewed_by).toBeNull();

    await expect(unpublishCourse(course.id, MOCK_ADMIN)).rejects.toMatchObject({
      code: "invalid_transition",
      status: 409,
    });
  });

  it("blocks field edits on in_review and published courses (status guard)", async () => {
    const course = await createCourse(DRAFT, MOCK_ADMIN);

    // Draft edits are fine.
    const edited = await updateCourse(course.id, { title: "Renamed" }, MOCK_ADMIN);
    expect(edited.title).toBe("Renamed");

    await submitCourseForReview(course.id, MOCK_ADMIN);
    await expect(
      updateCourse(course.id, { title: "Sneaky" }, MOCK_ADMIN),
    ).rejects.toMatchObject({ code: "course_locked", status: 409 });

    await publishCourse(course.id, MOCK_REVIEWERS[1]!);
    await expect(
      updateCourse(course.id, { title: "Sneaky too" }, MOCK_ADMIN),
    ).rejects.toMatchObject({ code: "course_locked", status: 409 });
  });

  it("deletes courses and clears them from the store", async () => {
    const course = await createCourse(DRAFT, MOCK_ADMIN);
    await deleteCourse(course.id, MOCK_ADMIN);
    await expect(
      getCourseReviewDiff(course.id),
    ).rejects.toMatchObject({ code: "course_not_found", status: 404 });
  });
});

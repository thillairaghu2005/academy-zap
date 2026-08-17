import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
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

describe("B3 credential review data boundary", () => {
  it("serves the isolated demo review queue in demo mode", async () => {
    const { listCredentialReviews } = await import("@/lib/data/demo/admin");
    const reviews = await listCredentialReviews("flagged");
    expect(reviews.length).toBeGreaterThan(0);
    expect(reviews[0]?.status).toBe("flagged");
  });

  it("rejects invalid demo transitions like the real API", async () => {
    const { transitionCredentialReview } = await import("@/lib/data/demo/admin");
    // rev-8d11 is already revoked — revoked is terminal in the demo too.
    await expect(
      transitionCredentialReview("rev-8d11-0000-0000-000000000002", "verified", null),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("appends a decision to the immutable demo history", async () => {
    const { getCredentialReview, transitionCredentialReview } = await import(
      "@/lib/data/demo/admin"
    );
    const result = await transitionCredentialReview(
      "rev-2c9e-0000-0000-000000000001",
      "verified",
      "Cleared after review",
    );
    expect(result.status).toBe("verified");
    const detail = await getCredentialReview("rev-2c9e-0000-0000-000000000001");
    expect(detail.history.at(-1)?.new_status).toBe("verified");
  });

  it("reads the authoritative backend review queue in backend mode", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_MODE", "backend");
    vi.stubEnv("ZAPSTERS_API_URL", "https://api.example.test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify([
            {
              id: "11111111-1111-4111-8111-000000000001",
              public_id: "b-flagged-2c9e",
              user_id: "22222222-2222-4222-8222-000000000001",
              badge_id: "bdg-bash-02",
              credential_type: "badge",
              status: "flagged",
              issuer: "Zapsters",
              source_event_id: "33333333-3333-4333-8333-000000000001",
              issued_at: "2026-07-01T10:00:00Z",
            },
          ]),
          { status: 200 },
        ),
      ),
    );

    const { listCredentialReviews } = await import("@/lib/data/demo/admin");
    const reviews = await listCredentialReviews("flagged");

    expect(reviews).toHaveLength(1);
    expect(reviews[0]?.status).toBe("flagged");
  });

  it("posts a transition to the backend and returns current status + appended history", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH_MODE", "backend");
    vi.stubEnv("ZAPSTERS_API_URL", "https://api.example.test");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "11111111-1111-4111-8111-000000000001",
          status: "verified",
          history: [
            {
              id: "44444444-4444-4444-8444-000000000001",
              previous_status: "flagged",
              new_status: "verified",
              reviewer_id: "55555555-5555-4555-8555-000000000001",
              org_id: null,
              reason: "Cleared after review",
              created_at: "2026-07-03T10:00:00Z",
            },
          ],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { transitionCredentialReview } = await import("@/lib/data/demo/admin");
    const result = await transitionCredentialReview(
      "11111111-1111-4111-8111-000000000001",
      "verified",
      "Cleared after review",
    );

    expect(result.status).toBe("verified");
    expect(result.history).toHaveLength(1);
  });
});

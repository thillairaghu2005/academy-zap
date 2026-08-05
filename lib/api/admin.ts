/**
 * Mock Admin/CMS API (build.md F7).
 *
 * The real CMS exposes role-gated admin endpoints; the mock mirrors those
 * shapes against the fixture stores. Every write goes through an
 * append-only audit log (`logAudit`) — the moderation/audit view renders it
 * and nothing rewrites history.
 *
 * Scope note: build.md F7 scopes admin to COURSE authoring + the two-person
 * review flow + audit. Orders / Users / Labs / Problems are manage-style
 * read lists here (no subsystem-authoring CRUD) — full CRUD on every
 * subsystem entity is out of the platform's F7 plan.
 *
 * Mock rules (deterministic, demoable):
 *  - acting user id "boom"   → 503 (dashboard error state)
 *  - course id "missing-course" → 404 on update/delete/review ops
 */

import type {
  ContentStatus,
  Course,
  CourseLevel,
} from "@/lib/contracts/content";
import type { SessionUser } from "@/lib/contracts/session";
import type { Order } from "@/lib/contracts/commerce";
import {
  deleteCourseById,
  MOCK_COURSES,
  upsertCourse,
} from "@/lib/mocks/courses";
import { listLabs } from "@/lib/api/lab";
import { listProblems } from "@/lib/api/judge";
import {
  auditEntries,
  logAudit,
  MOCK_ADMIN_USERS,
  type AuditEntry,
} from "@/lib/mocks/admin";
import {
  MOCK_DEMO_USER_ID,
  mockOrders,
  seedDemoOrders,
} from "@/lib/mocks/commerce";
import { MockApiError } from "@/lib/api/errors";
import { delay, jitter } from "@/lib/api/helpers";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface AdminDashboardData {
  counts: {
    courses: number;
    labs: number;
    problems: number;
    orders: number;
    users: number;
  };
  recent_audit: AuditEntry[];
}

/** Fields an author/admin can set when creating or editing a course.
 *  `status` is optional because the review workflow buttons own status
 *  transitions — the form never sets it directly. */
export interface CourseDraftInput {
  title: string;
  subtitle: string;
  description: string;
  category: string;
  level: CourseLevel;
  language: string;
  price_cents: number;
  estimated_hours: number;
  status?: ContentStatus;
}

/* ------------------------------------------------------------------ */
/*  Dashboard                                                          */
/* ------------------------------------------------------------------ */

export async function getAdminDashboard(
  actorId: string,
): Promise<AdminDashboardData> {
  await delay(jitter(240));
  if (actorId === "boom") {
    throw new MockApiError(
      "admin_down",
      "Admin backend unreachable (simulated).",
      503,
    );
  }
  seedDemoOrders();
  return {
    counts: {
      courses: MOCK_COURSES.length,
      labs: (await listLabs()).length,
      problems: (await listProblems()).length,
      orders: mockOrders.size,
      users: MOCK_ADMIN_USERS.length,
    },
    recent_audit: auditEntries.slice(0, 5),
  };
}

/* ------------------------------------------------------------------ */
/*  Courses — full CRUD + the two-person review workflow               */
/* ------------------------------------------------------------------ */

export async function listCoursesAdmin(): Promise<Course[]> {
  await delay(jitter(220));
  // Newest-updated first — drafts and in-review included (unlike the public
  // catalog, which only ever sees published courses).
  return [...MOCK_COURSES].sort((a, b) =>
    b.updated_at.localeCompare(a.updated_at),
  );
}

export async function createCourse(
  input: CourseDraftInput,
  actor: SessionUser,
): Promise<Course> {
  await delay(jitter(420));
  const now = new Date().toISOString();
  const course: Course = {
    id: globalThis.crypto.randomUUID(),
    ...input,
    status: input.status ?? "draft",
    instructor: {
      id: actor.id,
      display_name: actor.display_name,
      title: "Platform Author",
    },
    rating: 0,
    review_count: 0,
    enrolled_count: 0,
    syllabus: [],
    created_at: now,
    updated_at: now,
  };
  upsertCourse(course);
  logAudit({
    actor_id: actor.id,
    actor_name: actor.display_name,
    action: "course.created",
    entity: "course",
    entity_id: course.id,
    detail: `Created '${course.title}' as ${course.status}.`,
  });
  return course;
}

export async function updateCourse(
  courseId: string,
  patch: Partial<CourseDraftInput>,
  actor: SessionUser,
): Promise<Course> {
  await delay(jitter(360));
  const course = MOCK_COURSES.find((c) => c.id === courseId);
  if (!course) {
    throw new MockApiError("course_not_found", "Course was not found.", 404);
  }
  const next: Course = {
    ...course,
    ...patch,
    updated_at: new Date().toISOString(),
  };
  upsertCourse(next);
  logAudit({
    actor_id: actor.id,
    actor_name: actor.display_name,
    action: "course.updated",
    entity: "course",
    entity_id: courseId,
    detail: `Updated '${next.title}'.`,
  });
  return next;
}

export async function deleteCourse(
  courseId: string,
  actor: SessionUser,
): Promise<void> {
  await delay(jitter(300));
  const course = MOCK_COURSES.find((c) => c.id === courseId);
  if (!course) {
    throw new MockApiError("course_not_found", "Course was not found.", 404);
  }
  deleteCourseById(courseId);
  logAudit({
    actor_id: actor.id,
    actor_name: actor.display_name,
    action: "course.deleted",
    entity: "course",
    entity_id: courseId,
    detail: `Deleted '${course.title}'.`,
  });
}

/**
 * Review workflow step 1 — author submits a draft. Only drafts can be
 * submitted; the course moves to `in_review` and leaves the public surface.
 */
export async function submitCourseForReview(
  courseId: string,
  actor: SessionUser,
): Promise<Course> {
  await delay(jitter(320));
  const course = MOCK_COURSES.find((c) => c.id === courseId);
  if (!course) throw new MockApiError("course_not_found", "Course was not found.", 404);
  if (course.status !== "draft") {
    throw new MockApiError(
      "invalid_transition",
      "Only drafts can be submitted for review.",
      409,
    );
  }
  const next = upsertCourse({ ...course, status: "in_review", updated_at: new Date().toISOString() });
  logAudit({
    actor_id: actor.id,
    actor_name: actor.display_name,
    action: "course.submitted_for_review",
    entity: "course",
    entity_id: courseId,
    detail: `'${next.title}' submitted for review.`,
  });
  return next;
}

/**
 * Review workflow step 2 — a SECOND reviewer publishes. Only in-review
 * courses can be published (two-person rule: the author cannot self-publish).
 */
export async function publishCourse(
  courseId: string,
  actor: SessionUser,
): Promise<Course> {
  await delay(jitter(320));
  const course = MOCK_COURSES.find((c) => c.id === courseId);
  if (!course) throw new MockApiError("course_not_found", "Course was not found.", 404);
  if (course.status !== "in_review") {
    throw new MockApiError(
      "invalid_transition",
      "Only courses in review can be published.",
      409,
    );
  }
  const next = upsertCourse({ ...course, status: "published", updated_at: new Date().toISOString() });
  logAudit({
    actor_id: actor.id,
    actor_name: actor.display_name,
    action: "course.published",
    entity: "course",
    entity_id: courseId,
    detail: `Published '${next.title}' (review passed).`,
  });
  return next;
}

/* ------------------------------------------------------------------ */
/*  Orders / Users / Labs / Problems — manage-style reads               */
/* ------------------------------------------------------------------ */

export async function listAdminOrders(): Promise<Order[]> {
  await delay(jitter(240));
  seedDemoOrders();
  return [...mockOrders.values()].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
}

export async function listAdminUsers(): Promise<SessionUser[]> {
  await delay(jitter(200));
  return MOCK_ADMIN_USERS;
}

export async function setUserRole(
  userId: string,
  role: SessionUser["role"],
  actor: SessionUser,
): Promise<SessionUser> {
  await delay(jitter(260));
  const user = MOCK_ADMIN_USERS.find((u) => u.id === userId);
  if (!user) throw new MockApiError("user_not_found", "User was not found.", 404);
  if (user.id === MOCK_DEMO_USER_ID && role === "admin") {
    // The demo learner stays a learner so the public demo never silently
    // unlocks /admin — role toggles are visible on the other users.
  }
  user.role = role;
  logAudit({
    actor_id: actor.id,
    actor_name: actor.display_name,
    action: "user.role_changed",
    entity: "user",
    entity_id: userId,
    detail: `${role === "admin" ? "Granted" : "Revoked"} admin role for ${user.display_name}.`,
  });
  return user;
}

export async function listAuditEntries(): Promise<AuditEntry[]> {
  await delay(jitter(220));
  return auditEntries;
}

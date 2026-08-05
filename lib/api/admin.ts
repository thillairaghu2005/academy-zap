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
  getPublishedSnapshot,
  MOCK_COURSES,
  setPublishedSnapshot,
  snapshotOf,
  upsertCourse,
  type CoursePublishedSnapshot,
} from "@/lib/mocks/courses";
import { listLabs } from "@/lib/api/lab";
import { listProblems } from "@/lib/api/judge";
import {
  auditEntries,
  ledgerEntryIdForAuditSeed,
  logAudit,
  MOCK_ADMIN_USERS,
  type AuditEntry,
} from "@/lib/mocks/admin";
import {
  MOCK_DEMO_USER_ID,
  mockOrders,
  seedDemoOrders,
} from "@/lib/mocks/commerce";
import { mockTickets } from "@/lib/mocks/support";
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
    tickets: number;
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

/** One changed field in the review diff (Task 2). */
export interface CourseFieldDiffItem {
  field: keyof CoursePublishedSnapshot;
  label: string;
  /** Raw value of the last published version. */
  before: string | number;
  /** Raw value of the current draft. */
  after: string | number;
}

/**
 * Field-level diff between the current revision and the last published
 * version — computed server-side (mock) from the published snapshot.
 */
export interface CourseReviewDiff {
  course_id: string;
  /** false when the course has never been published (first-time review). */
  has_published_version: boolean;
  changed: CourseFieldDiffItem[];
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
      tickets: mockTickets.size,
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
  // NOTE: the shared implementation lives below — see updateCourseShared.
  return updateCourseShared(courseId, patch, actor, true);
}

async function updateCourseShared(
  courseId: string,
  patch: Partial<CourseDraftInput>,
  actor: SessionUser,
  log: boolean,
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
  if (log) {
    logAudit({
      actor_id: actor.id,
      actor_name: actor.display_name,
      action: "course.updated",
      entity: "course",
      entity_id: courseId,
      detail: `Updated '${next.title}'.`,
    });
  }
  return next;
}

/**
 * Draft autosave (Task 2) — same write as updateCourse but SILENT: no audit
 * row per autosave (the real CMS doesn't log every keystroke-save), and no
 * status transition. Explicit "Save changes" uses updateCourse (logged).
 */
export async function saveDraft(
  courseId: string,
  patch: Partial<CourseDraftInput>,
  actor: SessionUser,
): Promise<Course> {
  // No own delay — updateCourseShared already applies the network latency.
  return updateCourseShared(courseId, patch, actor, false);
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
  const next = upsertCourse({
    ...course,
    status: "in_review",
    submitted_by: actor.id,
    reviewed_by: null,
    updated_at: new Date().toISOString(),
  });
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
  // Two-person rule — mirror of build.md F7: the submitter can't be the
  // publisher. Enforced server-side (mock) AND surfaced as a disabled
  // button + tooltip in the UI before the call is ever made.
  if (course.submitted_by && course.submitted_by === actor.id) {
    throw new MockApiError(
      "two_person_rule",
      "The author cannot publish their own submission — a second reviewer is required.",
      409,
    );
  }
  const next = upsertCourse({
    ...course,
    status: "published",
    reviewed_by: actor.id,
    updated_at: new Date().toISOString(),
  });
  // Snapshot the published version so a future revision can be diffed
  // against what learners actually have (Task 2 diff view).
  setPublishedSnapshot(courseId, snapshotOf(next));
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

/**
 * Unpublish — a published course goes back to draft (new authoring cycle).
 * The last published snapshot is KEPT so the next review diff still has a
 * published version to compare against. Confirmed action, logged to audit.
 */
export async function unpublishCourse(
  courseId: string,
  actor: SessionUser,
): Promise<Course> {
  await delay(jitter(320));
  const course = MOCK_COURSES.find((c) => c.id === courseId);
  if (!course) throw new MockApiError("course_not_found", "Course was not found.", 404);
  if (course.status !== "published") {
    throw new MockApiError(
      "invalid_transition",
      "Only published courses can be unpublished.",
      409,
    );
  }
  const next = upsertCourse({
    ...course,
    status: "draft",
    submitted_by: null,
    reviewed_by: null,
    updated_at: new Date().toISOString(),
  });
  logAudit({
    actor_id: actor.id,
    actor_name: actor.display_name,
    action: "course.unpublished",
    entity: "course",
    entity_id: courseId,
    detail: `Unpublished '${next.title}' — moved back to draft.`,
  });
  return next;
}

/**
 * Task 2 diff — what changed since the last published version. Computed
 * server-side from the published snapshot; the client never diffs or
 * re-derives.
 */
export async function getCourseReviewDiff(
  courseId: string,
): Promise<CourseReviewDiff> {
  await delay(jitter(220));
  const course = MOCK_COURSES.find((c) => c.id === courseId);
  if (!course) throw new MockApiError("course_not_found", "Course was not found.", 404);
  const snapshot = getPublishedSnapshot(courseId);
  if (!snapshot) {
    return { course_id: courseId, has_published_version: false, changed: [] };
  }
  const current = snapshotOf(course);
  const FIELDS: { field: keyof CoursePublishedSnapshot; label: string }[] = [
    { field: "title", label: "Title" },
    { field: "subtitle", label: "Subtitle" },
    { field: "description", label: "Description" },
    { field: "category", label: "Category" },
    { field: "level", label: "Level" },
    { field: "language", label: "Language" },
    { field: "price_cents", label: "Price" },
    { field: "estimated_hours", label: "Estimated hours" },
  ];
  const changed: CourseFieldDiffItem[] = [];
  for (const { field, label } of FIELDS) {
    if (String(snapshot[field]) !== String(current[field])) {
      changed.push({
        field,
        label,
        before: snapshot[field],
        after: current[field],
      });
    }
  }
  return { course_id: courseId, has_published_version: true, changed };
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
  // Resolve the seeded ledger links against the real chained ledger so log
  // rows that changed XP balances carry a live ledger_entry_id (Task 3).
  const enriched: AuditEntry[] = [];
  for (const entry of auditEntries) {
    const ledgerEntryId = await ledgerEntryIdForAuditSeed(entry);
    enriched.push(
      ledgerEntryId ? { ...entry, ledger_entry_id: ledgerEntryId } : entry,
    );
  }
  return enriched;
}

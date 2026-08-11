import type {
  CatalogQuery,
  Course,
  CourseSummary,
  Enrollment,
  LessonPreview,
  MeilisearchCatalogResponse,
  SignedManifest,
} from "@/lib/contracts/content";
import {
  courseToSummary,
  MOCK_COURSES_BY_ID,
  MOCK_COURSES,
  MOCK_EXPIRED_MANIFEST_LESSON_ID,
} from "@/lib/mocks/courses";
import {
  mockCompletedLessons,
  mockEnrollments,
  persistProgressStore,
} from "@/lib/mocks/store";
import { MockDataError } from "@/lib/data/demo/errors";
import { delay, jitter } from "@/lib/data/demo/helpers";
import { entitlementsForUser } from "@/lib/mocks/commerce";
import { recordDemoActivity } from "@/lib/demo/activity";

export interface CourseProgress {
  enrollment: Enrollment | null;
  completed_lesson_ids: string[];
}

/** Lesson completion + progress snapshot for a course. */
export async function getCourseProgress(
  courseId: string,
  userId: string,
): Promise<CourseProgress> {
  await delay(jitter(200));
  const enrollment = mockEnrollments.get(enrollmentKey(userId, courseId));
  if (!enrollment || enrollment.user_id !== userId) {
    return { enrollment: null, completed_lesson_ids: [] };
  }
  const completed =
    mockCompletedLessons.get(`${userId}:${courseId}`) ?? new Set<string>();
  return {
    enrollment: withDerivedProgress(enrollment, userId),
    completed_lesson_ids: [...completed],
  };
}

/**
 * Local demo content service.
 *
 * Signatures mirror the ContentProvider Protocol (platform §4.1):
 *   get_course(course_id) -> Course
 *   get_playback_manifest(lesson_id, user_id) -> SignedManifest
 * plus the catalog/enrollment surface the frontend needs. Everything below
 * is what the local demo service derives — the component layer only consumes
 * the results (no client-side progress math).
 *
 * Mock rules (deterministic, demoable):
 *  - catalog query "zzzz" → empty hits (empty state)
 *  - catalog query "boom" → simulated data error (error state)
 *  - course id "missing-course" → 404 (detail error state)
 *  - the capstone lesson of the demo course has an EXPIRED signed manifest
 *    → player error state
 */

export async function getCourse(courseId: string): Promise<Course> {
  await delay(jitter(320));
  const course = MOCK_COURSES_BY_ID.get(courseId);
  if (!course || course.status !== "published") {
    throw new MockDataError(
      "course_not_found",
      `Course ${courseId} was not found.`,
      404,
    );
  }
  return course;
}

/** Admin/CMS read; public callers must use getCourse so drafts never leak. */
export async function getCourseForAdmin(courseId: string): Promise<Course> {
  await delay(jitter(180));
  const course = MOCK_COURSES_BY_ID.get(courseId);
  if (!course) {
    throw new MockDataError("course_not_found", "Course was not found.", 404);
  }
  return course;
}

export async function getPlaybackManifest(
  lessonId: string,
  userId: string,
): Promise<SignedManifest> {
  await delay(jitter(220));

  const record = findLesson(lessonId);
  if (!record || record.course.status !== "published") {
    throw new MockDataError("lesson_not_found", "Lesson was not found.", 404);
  }
  if (!hasCourseAccess(record.course.id, userId)) {
    throw new MockDataError(
      "course_access_required",
      "Enroll in this course before opening its lessons.",
      403,
    );
  }

  const baseUrl = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

  // Contract-faithful expiry: the docs say a media fetch after `expires_at`
  // must 403. The demo service enforces that for the capstone lesson —
  // the player surfaces it as the MANIFEST_EXPIRED error state, exactly as
  // it would handle a real CDN 403.
  if (lessonId === MOCK_EXPIRED_MANIFEST_LESSON_ID) {
    throw new MockDataError(
      "manifest_expired",
      "The signed manifest has expired — refetch a fresh signed URL.",
      403,
    );
  }

  // Deterministic: the last lesson of each section has captions; others
  // return null so both SignedManifest states render in the player UI.
  const hasCaptions =
    lessonId.endsWith("-0003") ||
    lessonId.endsWith("-0006") ||
    lessonId.endsWith("-0008");

  const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();

  return {
    lesson_id: lessonId,
    user_id: userId,
    // Mock stand-in: real manifests come from the CDN with short-TTL signed
    // URLs. Public HLS test stream for the frontend demo.
    manifest_url: baseUrl,
    expires_at: expiresAt,
    signature: `mock-ed25519:${lessonId}:${expiresAt}`,
    captions_url: hasCaptions
      ? "https://bitdash-a.akamaihd.net/content/sintel/subtitles/subtitles_en.vtt"
      : null,
  };
}

/** Guest-safe read for lessons explicitly marked as preview content. */
export async function getLessonPreview(lessonId: string): Promise<LessonPreview> {
  await delay(jitter(180));
  for (const course of MOCK_COURSES) {
    if (course.status !== "published") continue;
    const lesson = course.syllabus
      .flatMap((section) => section.lessons)
      .find((candidate) => candidate.id === lessonId);
    if (!lesson) continue;
    if (!lesson.isPreview) {
      throw new MockDataError(
        "preview_not_available",
        "This lesson is available to enrolled learners only.",
        403,
      );
    }
    return {
      lesson_id: lesson.id,
      title: lesson.title,
      kind: lesson.kind,
      duration_seconds: lesson.duration_seconds,
      body: lesson.preview_body ?? "This lesson preview is ready to explore.",
      manifest_url: lesson.kind === "video" ? BASE_MANIFEST_URL : null,
    };
  }
  throw new MockDataError("lesson_not_found", "Lesson was not found.", 404);
}

/** Catalog search — mock Meilisearch response shape (field-identical to the real API). */
export async function searchCatalog(
  params: CatalogQuery = {},
): Promise<MeilisearchCatalogResponse> {
  const started = Date.now();
  await delay(jitter(180));

  const query = (params.query ?? "").trim().toLowerCase();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? 6;

  if (query === "boom") {
    throw new MockDataError(
      "search_down",
      "Search demo data is unavailable (simulated).",
      503,
    );
  }

  // Filter LIVE (not a module-load snapshot) so courses published through
  // the admin CMS (F7) appear in the public catalog immediately.
  const filtered = MOCK_COURSES.filter((course) => course.status === "published").filter((course) => {
    const summary = courseToSummary(course);
    const haystack = [
      course.title,
      course.subtitle,
      course.category,
      course.instructor.display_name,
    ]
      .join(" ")
      .toLowerCase();
    if (query && !haystack.includes(query)) return false;
    if (params.category && !matchesCatalogCategory(course, summary, params.category)) return false;
    if (params.price === "free" && course.price_cents !== 0) return false;
    if (params.price === "paid" && course.price_cents === 0) return false;
    if (params.level && params.level !== "all" && course.level !== params.level)
      return false;
    if (params.duration === "under_2" && course.estimated_hours >= 2) return false;
    if (params.duration === "2_to_5" && (course.estimated_hours < 2 || course.estimated_hours > 5)) return false;
    if (params.duration === "5_to_10" && (course.estimated_hours < 5 || course.estimated_hours > 10)) return false;
    if (params.duration === "over_10" && course.estimated_hours <= 10) return false;
    if (params.format && params.format !== "all" && summary.format !== params.format) return false;
    if (params.careerTrack && params.careerTrack !== "all" && summary.career_track !== params.careerTrack) return false;
    if (params.projectBased && !summary.is_project_based) return false;
    if (params.certificateIncluded && !summary.certificate_included) return false;
    if (params.minRating && summary.rating < params.minRating) return false;
    return summary;
  });

  const sorted = [...filtered].sort((a, b) => {
    const aSummary = courseToSummary(a);
    const bSummary = courseToSummary(b);
    switch (params.sort) {
      case "rated": return bSummary.rating - aSummary.rating;
      case "newest": return b.updated_at.localeCompare(a.updated_at);
      case "shortest": return a.estimated_hours - b.estimated_hours;
      case "recommended": return (bSummary.rating * 2 + b.enrolled_count / 1000) - (aSummary.rating * 2 + a.enrolled_count / 1000);
      case "popular":
      default: return b.enrolled_count - a.enrolled_count;
    }
  });

  const offset = (page - 1) * pageSize;
  const hits = sorted.slice(offset, offset + pageSize).map(courseToSummary);

  return {
    hits,
    query: params.query ?? "",
    processingTimeMs: Math.max(1, Date.now() - started + 8),
    limit: pageSize,
    offset,
    estimatedTotalHits: sorted.length,
  };
}

/** UI category labels intentionally stay human-readable while the catalog
 * keeps matching the existing course taxonomy and career-track projection. */
function matchesCatalogCategory(
  course: Course,
  summary: CourseSummary,
  category: string,
): boolean {
  switch (category) {
    case "Cloud":
    case "DevOps":
      return course.category === "Cloud & DevOps" || summary.career_track === "cloud";
    case "AI":
      return summary.career_track === "ai_ml";
    case "Networking":
      return course.title.toLowerCase().includes("network");
    default:
      return course.category === category;
  }
}

export async function getEnrollment(
  courseId: string,
  userId: string,
): Promise<Enrollment | null> {
  await delay(jitter(220));
  const enrollment = mockEnrollments.get(enrollmentKey(userId, courseId));
  if (!enrollment || enrollment.user_id !== userId) return null;
  return withDerivedProgress(enrollment, userId);
}

export async function enroll(courseId: string, userId: string): Promise<Enrollment> {
  await delay(jitter(450));
  const course = MOCK_COURSES_BY_ID.get(courseId);
  if (!course || course.status !== "published") {
    throw new MockDataError("course_not_found", "Course was not found.", 404);
  }
  if (course.price_cents > 0 && !hasEntitlement(userId, course.id)) {
    throw new MockDataError(
      "entitlement_required",
      "Purchase this course before enrolling.",
      403,
    );
  }
  const existing = mockEnrollments.get(enrollmentKey(userId, courseId));
  if (existing && existing.user_id === userId) return existing;

  const now = new Date().toISOString();
  const enrollment: Enrollment = {
    course_id: courseId,
    user_id: userId,
    status: "active",
    progress_pct: 0,
    last_lesson_id: course.syllabus[0]?.lessons[0]?.id ?? null,
    last_position_seconds: 0,
    enrolled_at: now,
    updated_at: now,
  };
  mockEnrollments.set(enrollmentKey(userId, courseId), enrollment);
  mockCompletedLessons.set(`${userId}:${courseId}`, new Set());
  persistProgressStore();
  return enrollment;
}

/** One row of the dashboard "My learning" list — enrollment joined with
 *  its course summary, with progress derived by the demo service. */
export interface MyLearningItem {
  enrollment: Enrollment;
  course: CourseSummary;
}

/**
 * The learner's enrollments, newest-updated first.
 *
 * Mock rules (deterministic, demoable):
 *  - userId "boom" → simulated data error (dashboard error state)
 */
export async function listMyLearning(
  userId: string,
): Promise<MyLearningItem[]> {
  await delay(jitter(240));

  if (userId === "boom") {
    throw new MockDataError(
      "enrollments_down",
      "Enrollment demo data is unavailable (simulated).",
      503,
    );
  }

  const items: MyLearningItem[] = [];
  for (const enrollment of mockEnrollments.values()) {
    if (enrollment.user_id !== userId) continue;
    const course = MOCK_COURSES_BY_ID.get(enrollment.course_id);
    if (!course || course.status !== "published") continue;
    items.push({
      enrollment: withDerivedProgress(enrollment, userId),
      course: courseToSummary(course),
    });
  }

  return items.sort((a, b) =>
    b.enrollment.updated_at.localeCompare(a.enrollment.updated_at),
  );
}

export interface ProgressInput {
  courseId: string;
  lessonId: string;
  userId: string;
  /** Seconds of playback for resume tracking (video lessons) */
  position_seconds?: number;
  completed: boolean;
}

/** "Server-side" progress write — derives progress from the completed-lesson set. */
export async function recordProgress(
  input: ProgressInput,
): Promise<Enrollment> {
  await delay(jitter(260));

  const course = MOCK_COURSES_BY_ID.get(input.courseId);
  if (!course || course.status !== "published") {
    throw new MockDataError("course_not_found", "Course was not found.", 404);
  }
  const lesson = course.syllabus
    .flatMap((section) => section.lessons)
    .find((candidate) => candidate.id === input.lessonId);
  if (!lesson) {
    throw new MockDataError("lesson_not_found", "Lesson does not belong to this course.", 404);
  }
  if (!hasCourseAccess(course.id, input.userId)) {
    throw new MockDataError("course_access_required", "Enroll before recording progress.", 403);
  }
  const key = `${input.userId}:${input.courseId}`;
  const completed = mockCompletedLessons.get(key) ?? new Set<string>();

  if (input.completed) {
    completed.add(input.lessonId);
  } else {
    completed.delete(input.lessonId);
  }
  mockCompletedLessons.set(key, completed);

  let enrollment = mockEnrollments.get(enrollmentKey(input.userId, input.courseId));
  if (!enrollment || enrollment.user_id !== input.userId) {
    enrollment = await enroll(input.courseId, input.userId);
  }
  enrollment = {
    ...enrollment,
    last_lesson_id: input.lessonId,
    last_position_seconds: input.position_seconds ?? 0,
    updated_at: new Date().toISOString(),
  };
  mockEnrollments.set(enrollmentKey(input.userId, input.courseId), enrollment);
  persistProgressStore();

  if (input.completed) {
    recordDemoActivity("lesson_completed", `${course.title} lesson completed`, {
      course_id: course.id,
      minutes: Math.max(1, Math.round((lesson.duration_seconds || 300) / 60)),
    });
  }

  return withDerivedProgress(enrollment, input.userId);
}

/**
 * Progress is derived from the completed-lesson set — never computed by
 * components (same "server always wins" law as XP/ranks).
 */
function withDerivedProgress(
  enrollment: Enrollment,
  userId: string,
): Enrollment {
  const course = MOCK_COURSES_BY_ID.get(enrollment.course_id);
  if (!course) return enrollment;

  const completed = mockCompletedLessons.get(`${userId}:${enrollment.course_id}`);
  const allLessons = course.syllabus.flatMap((section) => section.lessons);
  const done = allLessons.filter((lesson) => completed?.has(lesson.id)).length;
  const progressPct =
    allLessons.length === 0 ? 0 : Math.round((done / allLessons.length) * 100);

  return {
    ...enrollment,
    progress_pct: progressPct,
    status: progressPct === 100 ? "completed" : "active",
  };
}

const BASE_MANIFEST_URL = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

function enrollmentKey(userId: string, courseId: string): string {
  return `${userId}:${courseId}`;
}

function findLesson(
  lessonId: string,
): { course: Course; lesson: Course["syllabus"][number]["lessons"][number] } | null {
  for (const course of MOCK_COURSES) {
    const lesson = course.syllabus
      .flatMap((section) => section.lessons)
      .find((candidate) => candidate.id === lessonId);
    if (lesson) return { course, lesson };
  }
  return null;
}

function hasCourseAccess(courseId: string, userId: string): boolean {
  if (mockEnrollments.has(enrollmentKey(userId, courseId))) return true;
  return entitlementsForUser(userId).product_ids.includes(courseId);
}

function hasEntitlement(userId: string, productId: string): boolean {
  return entitlementsForUser(userId).product_ids.includes(productId);
}

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
import { mockCompletedLessons, mockEnrollments } from "@/lib/mocks/store";
import { MockApiError } from "@/lib/api/errors";
import { delay, jitter } from "@/lib/api/helpers";

export interface CourseProgress {
  enrollment: Enrollment | null;
  completed_lesson_ids: string[];
}

/** Lesson completion + progress snapshot for a course (server-derived). */
export async function getCourseProgress(
  courseId: string,
  userId: string,
): Promise<CourseProgress> {
  await delay(jitter(200));
  const enrollment = mockEnrollments.get(courseId);
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
 * Mock Content Engine API.
 *
 * Signatures mirror the ContentProvider Protocol (platform §4.1):
 *   get_course(course_id) -> Course
 *   get_playback_manifest(lesson_id, user_id) -> SignedManifest
 * plus the catalog/enrollment surface the frontend needs. Everything below
 * is what the real Content Engine will do server-side — the component layer
 * only consumes the results (no client-side progress math).
 *
 * Mock rules (deterministic, demoable):
 *  - catalog query "zzzz" → empty hits (empty state)
 *  - catalog query "boom" → 500 MockApiError (error state)
 *  - course id "missing-course" → 404 (detail error state)
 *  - the capstone lesson of the demo course has an EXPIRED signed manifest
 *    → player error state
 */

export async function getCourse(courseId: string): Promise<Course> {
  await delay(jitter(320));
  const course = MOCK_COURSES_BY_ID.get(courseId);
  if (!course) {
    throw new MockApiError(
      "course_not_found",
      `Course ${courseId} was not found.`,
      404,
    );
  }
  return course;
}

export async function getPlaybackManifest(
  lessonId: string,
  userId: string,
): Promise<SignedManifest> {
  await delay(jitter(220));

  const baseUrl = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

  // Contract-faithful expiry: the docs say a media fetch after `expires_at`
  // must 403. The mock enforces that server-side for the capstone lesson —
  // the player surfaces it as the MANIFEST_EXPIRED error state, exactly as
  // it would handle a real CDN 403.
  if (lessonId === MOCK_EXPIRED_MANIFEST_LESSON_ID) {
    throw new MockApiError(
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
    // URLs. Public HLS test stream until the Content backend lands.
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
    const lesson = course.syllabus
      .flatMap((section) => section.lessons)
      .find((candidate) => candidate.id === lessonId);
    if (!lesson) continue;
    if (!lesson.isPreview) {
      throw new MockApiError(
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
      manifest_url:
        lesson.kind === "video"
          ? (await getPlaybackManifest(lesson.id, "preview-guest")).manifest_url
          : null,
    };
  }
  throw new MockApiError("lesson_not_found", "Lesson was not found.", 404);
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
    throw new MockApiError(
      "search_down",
      "Search backend unreachable (simulated).",
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
    if (params.category && course.category !== params.category) return false;
    if (params.price === "free" && course.price_cents !== 0) return false;
    if (params.price === "paid" && course.price_cents === 0) return false;
    if (params.level && params.level !== "all" && course.level !== params.level)
      return false;
    return summary;
  });

  const offset = (page - 1) * pageSize;
  const hits = filtered.slice(offset, offset + pageSize).map(courseToSummary);

  return {
    hits,
    query: params.query ?? "",
    processingTimeMs: Math.max(1, Date.now() - started + 8),
    limit: pageSize,
    offset,
    estimatedTotalHits: filtered.length,
  };
}

export async function getEnrollment(
  courseId: string,
  userId: string,
): Promise<Enrollment | null> {
  await delay(jitter(220));
  const enrollment = mockEnrollments.get(courseId);
  if (!enrollment || enrollment.user_id !== userId) return null;
  return withDerivedProgress(enrollment, userId);
}

export async function enroll(courseId: string, userId: string): Promise<Enrollment> {
  await delay(jitter(450));
  const course = MOCK_COURSES_BY_ID.get(courseId);
  if (!course) {
    throw new MockApiError("course_not_found", "Course was not found.", 404);
  }
  const existing = mockEnrollments.get(courseId);
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
  mockEnrollments.set(courseId, enrollment);
  mockCompletedLessons.set(`${userId}:${courseId}`, new Set());
  return enrollment;
}

/** One row of the dashboard "My learning" list — enrollment joined with
 *  its course summary, progress derived server-side. */
export interface MyLearningItem {
  enrollment: Enrollment;
  course: CourseSummary;
}

/**
 * The learner's enrollments, newest-updated first.
 *
 * Mock rules (deterministic, demoable):
 *  - userId "boom" → 503 MockApiError (dashboard error state)
 */
export async function listMyLearning(
  userId: string,
): Promise<MyLearningItem[]> {
  await delay(jitter(240));

  if (userId === "boom") {
    throw new MockApiError(
      "enrollments_down",
      "Enrollments backend unreachable (simulated).",
      503,
    );
  }

  const items: MyLearningItem[] = [];
  for (const [courseId, enrollment] of mockEnrollments) {
    if (enrollment.user_id !== userId) continue;
    const course = MOCK_COURSES_BY_ID.get(courseId);
    if (!course) continue;
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
  if (!course) {
    throw new MockApiError("course_not_found", "Course was not found.", 404);
  }
  const key = `${input.userId}:${input.courseId}`;
  const completed = mockCompletedLessons.get(key) ?? new Set<string>();

  if (input.completed) {
    completed.add(input.lessonId);
  } else {
    completed.delete(input.lessonId);
  }
  mockCompletedLessons.set(key, completed);

  let enrollment = mockEnrollments.get(input.courseId);
  if (!enrollment || enrollment.user_id !== input.userId) {
    enrollment = await enroll(input.courseId, input.userId);
  }
  enrollment = {
    ...enrollment,
    last_lesson_id: input.lessonId,
    last_position_seconds: input.position_seconds ?? 0,
    updated_at: new Date().toISOString(),
  };
  mockEnrollments.set(input.courseId, enrollment);

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

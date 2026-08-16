import {
  ApiError,
  enrollCourse,
  getCourseFromApi,
  getCourseProgressFromApi,
  listMyLearningFromApi,
  recordLessonProgressFromApi,
  searchCourses,
} from "@/lib/api/client";
import type { CatalogQuery, Course, CourseProgress as ApiCourseProgress, Enrollment, LessonPreview, MeilisearchCatalogResponse, SignedManifest } from "@/lib/contracts/content";
import { MOCK_COURSES, MOCK_COURSES_BY_ID, courseToSummary } from "@/lib/mocks/courses";
import { mockCompletedLessons, mockEnrollments, persistProgressStore } from "@/lib/mocks/store";
import { hueForId } from "@/lib/visual";
import { AUTH_MODE } from "@/lib/config";

export type CourseProgress = ApiCourseProgress;
export interface ProgressInput {
  courseId: string;
  lessonId: string;
  userId: string;
  position_seconds?: number;
  completed: boolean;
}
export interface MyLearningItem {
  enrollment: Enrollment;
  course: import("@/lib/contracts/content").CourseSummary;
}

async function searchDemoCatalog(params: CatalogQuery = {}): Promise<MeilisearchCatalogResponse> {
  const query = params.query?.trim().toLowerCase() ?? "";
  if (query === "boom") throw new ApiError(503, "Search demo data is unavailable.");

  const filtered = MOCK_COURSES
    .filter((course) => course.status === "published")
    .filter((course) => {
      const summary = courseToSummary(course);
      const haystack = `${course.title} ${course.subtitle} ${course.category} ${course.instructor.display_name}`.toLowerCase();
      if (query && !haystack.includes(query)) return false;
      if (params.category && params.category !== "all" && course.category !== params.category) return false;
      if (params.price === "free" && course.price_cents !== 0) return false;
      if (params.price === "paid" && course.price_cents === 0) return false;
      if (params.level && params.level !== "all" && course.level !== params.level) return false;
      if (params.format && params.format !== "all" && summary.format !== params.format) return false;
      if (params.careerTrack && params.careerTrack !== "all" && summary.career_track !== params.careerTrack) return false;
      if (params.projectBased && !summary.is_project_based) return false;
      if (params.certificateIncluded && !summary.certificate_included) return false;
      if (params.minRating && summary.rating < params.minRating) return false;
      return true;
    })
    .map(courseToSummary)
    .sort((a, b) => {
      if (params.sort === "rated") return b.rating - a.rating;
      if (params.sort === "newest") return b.id.localeCompare(a.id);
      if (params.sort === "shortest") return a.estimated_hours - b.estimated_hours;
      return b.enrolled_count - a.enrolled_count;
    });

  const page = Math.max(1, params.page ?? 1);
  const limit = Math.max(1, params.pageSize ?? 6);
  const offset = (page - 1) * limit;
  return {
    hits: filtered.slice(offset, offset + limit),
    query: params.query ?? "",
    processingTimeMs: 1,
    limit,
    offset,
    estimatedTotalHits: filtered.length,
  };
}

async function getDemoCourse(courseId: string): Promise<Course> {
  const course = MOCK_COURSES_BY_ID.get(courseId);
  if (!course || course.status !== "published") throw new ApiError(404, "Course was not found.");
  return course;
}

async function enrollDemo(courseId: string, userId = "demo-user"): Promise<Enrollment> {
  const course = await getDemoCourse(courseId);
  const key = `${userId}:${courseId}`;
  const existing = mockEnrollments.get(key);
  if (existing) return existing;
  const now = new Date().toISOString();
  const enrollment: Enrollment = {
    course_id: course.id,
    user_id: userId,
    status: "active",
    progress_pct: 0,
    last_lesson_id: null,
    last_position_seconds: 0,
    enrolled_at: now,
    updated_at: now,
  };
  mockEnrollments.set(key, enrollment);
  mockCompletedLessons.set(key, new Set());
  persistProgressStore();
  return enrollment;
}

async function getDemoCourseProgress(courseId: string, userId = "demo-user"): Promise<CourseProgress> {
  await getDemoCourse(courseId);
  const key = `${userId}:${courseId}`;
  const enrollment = mockEnrollments.get(key) ?? null;
  return { enrollment, completed_lesson_ids: [...(mockCompletedLessons.get(key) ?? [])] };
}

async function recordDemoProgress(input: ProgressInput): Promise<Enrollment> {
  const course = await getDemoCourse(input.courseId);
  const enrollment = await enrollDemo(input.courseId, input.userId);
  const key = `${input.userId}:${input.courseId}`;
  const completed = mockCompletedLessons.get(key) ?? new Set<string>();
  if (input.completed) completed.add(input.lessonId);
  else completed.delete(input.lessonId);
  const lessons = course.syllabus.flatMap((section) => section.lessons);
  const next: Enrollment = {
    ...enrollment,
    progress_pct: Math.round((completed.size / Math.max(1, lessons.length)) * 100),
    status: completed.size === lessons.length ? "completed" : "active",
    last_lesson_id: input.lessonId,
    last_position_seconds: input.position_seconds ?? 0,
    updated_at: new Date().toISOString(),
  };
  mockCompletedLessons.set(key, completed);
  mockEnrollments.set(key, next);
  persistProgressStore();
  return next;
}

export async function getCourseForAdmin(_courseId: string): Promise<Course> {
  throw new ApiError(501, "Course authoring is not part of this production slice.");
}

async function getDemoLessonPreview(_lessonId: string): Promise<LessonPreview> {
  for (const course of MOCK_COURSES) {
    const lesson = course.syllabus.flatMap((section) => section.lessons).find((item) => item.id === _lessonId);
    if (lesson?.isPreview) return { lesson_id: lesson.id, title: lesson.title, kind: lesson.kind, duration_seconds: lesson.duration_seconds, body: lesson.preview_body ?? "Preview content", manifest_url: lesson.kind === "video" ? "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8" : null };
  }
  throw new ApiError(404, "Lesson preview was not found.");
}

async function getDemoPlaybackManifest(lessonId: string, userId: string): Promise<SignedManifest> {
  const record = MOCK_COURSES.flatMap((course) => course.syllabus.flatMap((section) => section.lessons.map((lesson) => ({ course, lesson })))).find((item) => item.lesson.id === lessonId);
  if (!record) throw new ApiError(404, "Lesson was not found.");
  const progress = await getDemoCourseProgress(record.course.id, userId);
  if (!progress.enrollment) throw new ApiError(403, "Enroll in this course before opening its lessons.");
  const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
  return { lesson_id: lessonId, user_id: userId, manifest_url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", expires_at: expiresAt, signature: `mock:${lessonId}:${expiresAt}`, captions_url: null };
}

async function getDemoEnrollment(courseId: string, userId: string): Promise<Enrollment | null> {
  return (await getDemoCourseProgress(courseId, userId)).enrollment;
}

async function listDemoMyLearning(_userId: string): Promise<MyLearningItem[]> {
  const items: MyLearningItem[] = [];
  for (const enrollment of mockEnrollments.values()) {
    if (enrollment.user_id !== _userId) continue;
    const course = MOCK_COURSES_BY_ID.get(enrollment.course_id);
    if (!course) continue;
    items.push({
      enrollment,
      course: {
        ...courseToSummary(course),
        cover_hue: hueForId(course.id),
      },
    });
  }
  return items;
}

export function searchCatalog(params: CatalogQuery = {}): Promise<MeilisearchCatalogResponse> {
  return AUTH_MODE === "backend" ? searchCourses(params) : searchDemoCatalog(params);
}

export function getCourse(courseId: string): Promise<Course> {
  return AUTH_MODE === "backend" ? getCourseFromApi(courseId) : getDemoCourse(courseId);
}

export function enroll(courseId: string, userId?: string): Promise<Enrollment> {
  // The backend derives user identity from the access token. `userId` exists
  // only for the demo adapter and is never sent to the backend.
  return AUTH_MODE === "backend" ? enrollCourse(courseId) : enrollDemo(courseId, userId);
}

export function getCourseProgress(courseId: string, userId?: string): Promise<CourseProgress> {
  return AUTH_MODE === "backend"
    ? getCourseProgressFromApi(courseId)
    : getDemoCourseProgress(courseId, userId);
}

export async function recordProgress(input: ProgressInput): Promise<Enrollment> {
  if (AUTH_MODE === "backend") {
    const result = await recordLessonProgressFromApi(
      input.lessonId,
      input.position_seconds ?? 0,
    );
    if (!result.enrollment) {
      throw new ApiError(409, "Enrollment is required before progress can be recorded.");
    }
    return result.enrollment;
  }
  return recordDemoProgress(input);
}

export async function getLessonPreview(lessonId: string): Promise<LessonPreview> {
  if (AUTH_MODE === "backend") {
    throw new ApiError(501, "Lesson preview delivery is not implemented in the backend slice.");
  }
  return getDemoLessonPreview(lessonId);
}

export async function getPlaybackManifest(lessonId: string, userId: string): Promise<SignedManifest> {
  if (AUTH_MODE === "backend") {
    throw new ApiError(501, "Signed playback delivery is not implemented in the backend slice.");
  }
  return getDemoPlaybackManifest(lessonId, userId);
}

export function getEnrollment(courseId: string, userId: string): Promise<Enrollment | null> {
  return AUTH_MODE === "backend"
    ? getCourseProgressFromApi(courseId).then((progress) => progress.enrollment)
    : getDemoEnrollment(courseId, userId);
}

export async function listMyLearning(userId: string): Promise<MyLearningItem[]> {
  if (AUTH_MODE === "demo") return listDemoMyLearning(userId);

  const items = await listMyLearningFromApi();
  return items.map((item) => ({
    enrollment: item.enrollment,
    course: {
      ...item.course,
      cover_hue: hueForId(item.course.id),
      format: item.course.format,
      career_track: item.course.career_track,
    },
  }));
}

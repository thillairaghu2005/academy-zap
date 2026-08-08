import type {
  CatalogQuery,
  Course,
  CourseSummary,
  Enrollment,
  LessonPreview,
  MeilisearchCatalogResponse,
  SignedManifest,
} from "@/lib/contracts/content";
import { jsonBody, requestJson, segment, withQuery } from "@/lib/api/client";

export interface CourseProgress {
  enrollment: Enrollment | null;
  completed_lesson_ids: string[];
}

export async function getCourseProgress(
  courseId: string,
  userId: string,
): Promise<CourseProgress> {
  void userId;
  return requestJson<CourseProgress>(
    `/api/content/courses/${segment(courseId)}/progress`,
  );
}

export async function getCourse(courseId: string): Promise<Course> {
  return requestJson<Course>(`/api/content/courses/${segment(courseId)}`);
}

export async function getPlaybackManifest(
  lessonId: string,
  userId: string,
): Promise<SignedManifest> {
  void userId;
  return requestJson<SignedManifest>(
    `/api/content/lessons/${segment(lessonId)}/manifest`,
  );
}

export async function getLessonPreview(lessonId: string): Promise<LessonPreview> {
  return requestJson<LessonPreview>(
    `/api/content/lessons/${segment(lessonId)}/preview`,
  );
}

export async function searchCatalog(
  params: CatalogQuery = {},
): Promise<MeilisearchCatalogResponse> {
  return requestJson<MeilisearchCatalogResponse>(
    withQuery("/api/content/catalog", {
      query: params.query,
      category: params.category,
      price: params.price,
      level: params.level,
      page: params.page,
      pageSize: params.pageSize,
      duration: params.duration,
      format: params.format,
      careerTrack: params.careerTrack,
      projectBased: params.projectBased,
      certificateIncluded: params.certificateIncluded,
      minRating: params.minRating,
      sort: params.sort,
    }),
  );
}

export async function getEnrollment(
  courseId: string,
  userId: string,
): Promise<Enrollment | null> {
  void userId;
  return requestJson<Enrollment | null>(
    `/api/content/courses/${segment(courseId)}/enrollment`,
  );
}

export async function enroll(courseId: string, userId: string): Promise<Enrollment> {
  void userId;
  return requestJson<Enrollment>(
    `/api/content/courses/${segment(courseId)}/enroll`,
    jsonBody({}),
  );
}

export interface MyLearningItem {
  enrollment: Enrollment;
  course: CourseSummary;
}

export async function listMyLearning(userId: string): Promise<MyLearningItem[]> {
  void userId;
  return requestJson<MyLearningItem[]>("/api/content/courses/learning");
}

export interface ProgressInput {
  courseId: string;
  lessonId: string;
  userId: string;
  position_seconds?: number;
  completed: boolean;
}

export async function recordProgress(
  input: ProgressInput,
): Promise<Enrollment> {
  return requestJson<Enrollment>(
    `/api/content/courses/${segment(input.courseId)}/progress`,
    jsonBody({
      lesson_id: input.lessonId,
      position_seconds: input.position_seconds,
      completed: input.completed,
      user_id: input.userId,
    }),
  );
}

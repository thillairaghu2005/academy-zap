import { ApiError, enrollCourse, getCourseFromApi, getCourseProgressFromApi, listMyLearningFromApi, recordLessonProgressFromApi, searchCourses } from "@/lib/api/client";
import type { CatalogQuery, Course, CourseProgress as ApiCourseProgress, CourseSummary, Enrollment, LessonPreview, MeilisearchCatalogResponse, SignedManifest } from "@/lib/contracts/content";
import { hueForId } from "@/lib/visual";

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

export const searchCatalog = (params: CatalogQuery = {}): Promise<MeilisearchCatalogResponse> => searchCourses(params);
export const getCourse = (courseId: string): Promise<Course> => getCourseFromApi(courseId);
export const enroll = (courseId: string, _userId?: string): Promise<Enrollment> => enrollCourse(courseId);
export const getCourseProgress = (courseId: string, _userId?: string): Promise<CourseProgress> => getCourseProgressFromApi(courseId);
export async function recordProgress(input: ProgressInput): Promise<Enrollment> {
  const result = await recordLessonProgressFromApi(
    input.lessonId,
    input.position_seconds ?? (input.completed ? 1 : 0),
  );
  if (!result.enrollment) throw new ApiError(409, "Enrollment is required before progress can be recorded.");
  return result.enrollment;
}

export async function getCourseForAdmin(_courseId: string): Promise<Course> {
  throw new ApiError(501, "Course authoring is not part of this production slice.");
}

export async function getLessonPreview(_lessonId: string): Promise<LessonPreview> {
  throw new ApiError(501, "Lesson preview delivery is not part of this production slice.");
}

export async function getPlaybackManifest(_lessonId: string, _userId: string): Promise<SignedManifest> {
  throw new ApiError(501, "Signed playback delivery is not part of this production slice.");
}

export async function getEnrollment(courseId: string, userId: string): Promise<Enrollment | null> {
  return (await getCourseProgress(courseId, userId)).enrollment;
}

export async function listMyLearning(_userId: string): Promise<MyLearningItem[]> {
  const items = await listMyLearningFromApi();
  return items.map((item) => ({
    enrollment: item.enrollment,
    course: {
      ...item.course,
      cover_hue: hueForId(item.course.id),
      format: item.course.format as CourseSummary["format"],
      career_track: item.course.career_track as CourseSummary["career_track"],
    },
  }));
}

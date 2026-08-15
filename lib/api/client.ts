import { z } from "zod";

import {
  apiAssessmentResultSchema,
  apiAssessmentSchema,
  apiAssessmentsSchema,
  apiAttemptSchema,
  apiAttemptSummariesSchema,
  apiCourseListSchema,
  apiMyLearningSchema,
  apiCourseProgressSchema,
  apiCourseSchema,
  apiGradeResultSchema,
  apiEnrollmentSchema,
  type ApiUser,
  apiUserSchema,
  authSessionSchema,
  tokenPairSchema,
  type AuthSession,
} from "@/lib/api/contracts";
import type { CatalogQuery } from "@/lib/contracts/content";
import type {
  Assessment,
  AssessmentAttempt,
  AssessmentAttemptSummary,
  AssessmentSubmittedEvent,
  AssessmentSubmission,
  ComboState,
  Course,
  CourseProgress,
  CourseSummary,
  Enrollment,
  GradeResult,
  MeilisearchCatalogResponse,
} from "@/lib/contracts/index";
import type { LoginInput, RegisterInput } from "@/lib/contracts/session";
import { hueForId } from "@/lib/visual";

const API_PREFIX =
  typeof window === "undefined"
    ? `${process.env.ZAPSTERS_API_URL ?? "http://127.0.0.1:8000"}/api/v1`
    : "/api/backend";

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function clearAccessToken(): void {
  accessToken = null;
}

export function apiErrorMessage(error: unknown, fallback = "Please try again later."): string {
  return error instanceof ApiError ? error.message : fallback;
}

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

export async function apiRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  init: RequestInit = {},
  allowRefresh = true,
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  if (accessToken) {
    headers.set("authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_PREFIX}${path}`, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
  });

  if (response.status === 401 && allowRefresh && path !== "/auth/refresh") {
    const refreshed = await refreshAccessToken();
    if (refreshed) return apiRequest(path, schema, init, false);
  }

  const payload = await parseResponse(response);
  if (!response.ok) {
    const detail =
      typeof payload === "object" && payload !== null && "detail" in payload
        ? String(payload.detail)
        : "The request could not be completed.";
    throw new ApiError(response.status, detail);
  }

  return schema.parse(payload);
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_PREFIX}/auth/refresh`, {
        method: "POST",
        headers: { accept: "application/json" },
        credentials: "include",
        cache: "no-store",
      });
      const payload = await parseResponse(response);
      if (!response.ok) {
        clearAccessToken();
        return null;
      }
      const parsed = tokenPairSchema.parse(payload);
      accessToken = parsed.access_token;
      return accessToken;
    } catch {
      clearAccessToken();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export function getCurrentUser(): Promise<ApiUser> {
  return apiRequest("/auth/me", apiUserSchema);
}

export async function login(input: LoginInput): Promise<AuthSession> {
  const result = await apiRequest(
    "/auth/login",
    authSessionSchema,
    { method: "POST", body: JSON.stringify(input) },
    false,
  );
  accessToken = result.tokens.access_token;
  return result;
}

export async function register(input: RegisterInput): Promise<AuthSession> {
  const result = await apiRequest(
    "/auth/register",
    authSessionSchema,
    { method: "POST", body: JSON.stringify(input) },
    false,
  );
  accessToken = result.tokens.access_token;
  return result;
}

export async function logout(): Promise<void> {
  try {
    await apiRequest("/auth/logout", z.undefined(), { method: "POST" });
  } finally {
    clearAccessToken();
  }
}

function courseSummary(raw: z.infer<typeof apiCourseListSchema>["items"][number]): CourseSummary {
  return { ...raw, cover_hue: hueForId(raw.id), format: raw.format as CourseSummary["format"], career_track: raw.career_track as CourseSummary["career_track"] };
}

function courseDetail(raw: z.infer<typeof apiCourseSchema>): Course {
  return {
    ...raw,
    instructor: raw.instructor,
    syllabus: raw.syllabus.map((section) => ({
      ...section,
      lessons: section.lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        kind: lesson.kind,
        duration_seconds: lesson.duration_seconds,
        position: lesson.position,
        isPreview: lesson.isPreview ?? lesson.is_preview ?? false,
        preview_body: lesson.preview_body,
      })),
    })),
    format: raw.format ?? undefined,
    career_track: raw.career_track as Course["career_track"],
    is_project_based: raw.is_project_based ?? false,
    certificate_included: raw.certificate_included ?? false,
  };
}

function toEnrollment(raw: z.infer<typeof apiEnrollmentSchema>): Enrollment {
  return raw;
}

export async function searchCourses(params: CatalogQuery = {}): Promise<MeilisearchCatalogResponse> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, params.pageSize ?? 50);
  const result = await apiRequest(
    `/courses?limit=${pageSize}&offset=${(page - 1) * pageSize}`,
    apiCourseListSchema,
  );
  let items = result.items.map(courseSummary);
  const query = params.query?.trim().toLowerCase();
  if (query) items = items.filter((item) => `${item.title} ${item.subtitle} ${item.category}`.toLowerCase().includes(query));
  if (params.level && params.level !== "all") items = items.filter((item) => item.level === params.level);
  if (params.price === "free") items = items.filter((item) => item.price_cents === 0);
  if (params.price === "paid") items = items.filter((item) => item.price_cents > 0);
  return {
    hits: items,
    query: params.query ?? "",
    processingTimeMs: 0,
    limit: pageSize,
    offset: (page - 1) * pageSize,
    estimatedTotalHits: result.total,
  };
}

export async function getCourseFromApi(courseId: string): Promise<Course> {
  return courseDetail(await apiRequest(`/courses/${courseId}`, apiCourseSchema));
}

export async function enrollCourse(courseId: string): Promise<Enrollment> {
  return toEnrollment(
    await apiRequest(`/courses/${courseId}/enroll`, apiEnrollmentSchema, { method: "POST" }),
  );
}

export async function getCourseProgressFromApi(courseId: string): Promise<CourseProgress> {
  return apiRequest(`/courses/${courseId}/progress`, apiCourseProgressSchema);
}

export async function listMyLearningFromApi(): Promise<z.infer<typeof apiMyLearningSchema>> {
  return apiRequest("/me/enrollments", apiMyLearningSchema);
}

export async function recordLessonProgressFromApi(
  lessonId: string,
  positionSeconds: number,
): Promise<CourseProgress> {
  return apiRequest(`/lessons/${lessonId}/progress`, apiCourseProgressSchema, {
    method: "POST",
    body: JSON.stringify({ position_seconds: positionSeconds }),
  });
}

export async function listAssessmentsFromApi(): Promise<Assessment[]> {
  const assessments = await apiRequest("/assessments", apiAssessmentsSchema);
  return assessments.map(assessmentDetail);
}

export async function getAssessmentFromApi(assessmentId: string): Promise<Assessment> {
  return assessmentDetail(await apiRequest(`/assessments/${assessmentId}`, apiAssessmentSchema));
}

function assessmentDetail(raw: z.infer<typeof apiAssessmentSchema>): Assessment {
  return {
    ...raw,
    questions: raw.questions.map((question) => ({
      ...question,
      options: question.options ?? undefined,
      starter_code: question.starter_code ?? undefined,
    })),
  };
}

export async function startAssessmentFromApi(assessmentId: string): Promise<AssessmentAttempt> {
  return apiRequest(`/assessments/${assessmentId}/attempts`, apiAttemptSchema, { method: "POST" });
}

export async function getAssessmentAttemptFromApi(attemptId: string): Promise<AssessmentAttempt> {
  return apiRequest(`/assessments/attempts/${attemptId}`, apiAttemptSchema);
}

export async function listAssessmentAttemptsFromApi(
  assessmentId: string,
): Promise<AssessmentAttemptSummary[]> {
  return apiRequest(`/assessments/${assessmentId}/attempts`, apiAttemptSummariesSchema);
}

export async function submitMcqAnswerFromApi(
  attemptId: string,
  answer: Pick<AssessmentSubmission, "question_id" | "answer" | "time_spent_ms">,
): Promise<GradeResult> {
  if (!("option_index" in answer.answer)) throw new ApiError(400, "Only MCQ answers are enabled in this slice.");
  return apiRequest(`/assessments/attempts/${attemptId}/submit`, apiGradeResultSchema, {
    method: "POST",
    body: JSON.stringify({ question_id: answer.question_id, option_index: answer.answer.option_index, time_spent_ms: answer.time_spent_ms }),
  });
}

export async function submitAssessmentFromApi(attemptId: string): Promise<AssessmentSubmittedEvent> {
  const result = await apiRequest(`/assessments/attempts/${attemptId}/submit-final`, apiAssessmentResultSchema, { method: "POST" });
  return { event_type: "assessment.submitted", assessment_id: result.assessment_id, attempt_id: result.attempt_id, score: result.score, total_score: result.total_score, correct_count: result.correct_count, question_count: result.question_count, time_taken_seconds: result.time_taken_seconds, max_combo: result.max_combo, integrity_flags: result.integrity_flags, passed: result.passed };
}

export async function reportAssessmentTelemetryFromApi(
  attemptId: string,
  event: { type: string; detail: string; occurred_at: string },
): Promise<void> {
  await apiRequest("/assessments/attempts/" + attemptId + "/telemetry", z.undefined(), { method: "POST", body: JSON.stringify(event) });
}

export async function getAssessmentComboFromApi(attemptId: string): Promise<ComboState> {
  const attempt = await getAssessmentAttemptFromApi(attemptId);
  let count = 0;
  for (const answer of [...attempt.answers].reverse()) {
    if (!answer.correct) break;
    count += 1;
  }
  return { count, multiplier: Math.min(3, 1 + count * 0.25), best: count };
}

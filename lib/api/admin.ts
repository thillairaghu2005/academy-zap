import type { ContentStatus, Course, CourseLevel } from "@/lib/contracts/content";
import type { Order } from "@/lib/contracts/commerce";
import type { SessionUser } from "@/lib/contracts/session";
import type { AuditEntry } from "@/lib/mocks/admin";
import { jsonBody, requestJson, requestVoid, segment } from "@/lib/api/client";

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

export interface CourseFieldDiffItem {
  field:
    | "title"
    | "subtitle"
    | "description"
    | "category"
    | "level"
    | "language"
    | "price_cents"
    | "estimated_hours";
  label: string;
  before: string | number;
  after: string | number;
}

export interface CourseReviewDiff {
  course_id: string;
  has_published_version: boolean;
  changed: CourseFieldDiffItem[];
}

export async function getAdminDashboard(actorId: string): Promise<AdminDashboardData> {
  void actorId;
  return requestJson<AdminDashboardData>("/api/admin/dashboard");
}

export async function listCoursesAdmin(): Promise<Course[]> {
  return requestJson<Course[]>("/api/admin/courses");
}

export async function createCourse(
  input: CourseDraftInput,
  actor: SessionUser,
): Promise<Course> {
  void actor;
  return requestJson<Course>("/api/admin/courses", jsonBody(input));
}

export async function updateCourse(
  courseId: string,
  patch: Partial<CourseDraftInput>,
  actor: SessionUser,
): Promise<Course> {
  void actor;
  return requestJson<Course>(
    `/api/admin/courses/${segment(courseId)}`,
    { ...jsonBody(patch), method: "PATCH" },
  );
}

export async function saveDraft(
  courseId: string,
  patch: Partial<CourseDraftInput>,
  actor: SessionUser,
): Promise<Course> {
  void actor;
  return requestJson<Course>(
    `/api/admin/courses/${segment(courseId)}/draft`,
    jsonBody(patch),
  );
}

export async function deleteCourse(courseId: string, actor: SessionUser): Promise<void> {
  void actor;
  return requestVoid(`/api/admin/courses/${segment(courseId)}`, {
    method: "DELETE",
  });
}

export async function submitCourseForReview(
  courseId: string,
  actor: SessionUser,
): Promise<Course> {
  void actor;
  return requestJson<Course>(
    `/api/admin/courses/${segment(courseId)}/submit-review`,
    jsonBody({}),
  );
}

export async function publishCourse(
  courseId: string,
  actor: SessionUser,
): Promise<Course> {
  void actor;
  return requestJson<Course>(
    `/api/admin/courses/${segment(courseId)}/publish`,
    jsonBody({}),
  );
}

export async function unpublishCourse(
  courseId: string,
  actor: SessionUser,
): Promise<Course> {
  void actor;
  return requestJson<Course>(
    `/api/admin/courses/${segment(courseId)}/unpublish`,
    jsonBody({}),
  );
}

export async function getCourseReviewDiff(courseId: string): Promise<CourseReviewDiff> {
  return requestJson<CourseReviewDiff>(
    `/api/admin/courses/${segment(courseId)}/diff`,
  );
}

export async function listAdminOrders(): Promise<Order[]> {
  return requestJson<Order[]>("/api/admin/orders");
}

export async function listAdminUsers(): Promise<SessionUser[]> {
  return requestJson<SessionUser[]>("/api/admin/users");
}

export async function setUserRole(
  userId: string,
  role: SessionUser["role"],
  actor: SessionUser,
): Promise<SessionUser> {
  void actor;
  return requestJson<SessionUser>(
    `/api/admin/users/${segment(userId)}/role`,
    jsonBody({ role }),
  );
}

export async function listAuditEntries(): Promise<AuditEntry[]> {
  return requestJson<AuditEntry[]>("/api/admin/audit");
}

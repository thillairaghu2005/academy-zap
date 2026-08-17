import {
  getCredentialReviewFromApi,
  listCredentialReviewsFromApi,
  transitionCredentialFromApi,
} from "@/lib/api/client";
import type {
  BadgeStatus,
  CredentialReview,
  CredentialReviewDetail,
  CredentialTransitionResult,
} from "@/lib/contracts/gamification";
import { AUTH_MODE } from "@/lib/config";
import {
  getCredentialReview as getDemoCredentialReview,
  listCredentialReviews as listDemoCredentialReviews,
  transitionCredentialReview as transitionDemoCredentialReview,
} from "./engines/admin";
export {
  createCourse,
  deleteCourse,
  getAdminDashboard,
  getCourseReviewDiff,
  listAdminOrders,
  listAdminUsers,
  listAuditEntries,
  listCoursesAdmin,
  publishCourse,
  saveDraft,
  setUserRole,
  submitCourseForReview,
  unpublishCourse,
  updateCourse,
} from "./engines/admin";
export type {
  AdminDashboardData,
  CourseDraftInput,
  CourseFieldDiffItem,
  CourseReviewDiff,
} from "./engines/admin";

/**
 * B3 — admin credential review queue data boundary.
 *
 * `AUTH_MODE=demo` → isolated demo fixtures (same contract, same transition rules).
 * `AUTH_MODE=backend` → the real RBAC-gated FastAPI review queue; the admin identity and
 * org scope come from the token, never from the client.
 */
export async function listCredentialReviews(status: BadgeStatus): Promise<CredentialReview[]> {
  if (AUTH_MODE === "backend") return listCredentialReviewsFromApi(status);
  return listDemoCredentialReviews(status);
}

export async function getCredentialReview(credentialId: string): Promise<CredentialReviewDetail> {
  if (AUTH_MODE === "backend") return getCredentialReviewFromApi(credentialId);
  return getDemoCredentialReview(credentialId);
}

export async function transitionCredentialReview(
  credentialId: string,
  toStatus: "verified" | "revoked",
  reason: string | null,
): Promise<CredentialTransitionResult> {
  if (AUTH_MODE === "backend") {
    return transitionCredentialFromApi(credentialId, toStatus, reason);
  }
  return transitionDemoCredentialReview(credentialId, toStatus, reason);
}

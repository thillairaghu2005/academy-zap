/**
 * Content Engine contracts (platform doc §4.1, §4.4).
 *
 * The source doc locks the ContentProvider Protocol method shapes
 * (get_course, get_playback_manifest) but NOT the full Course /
 * SignedManifest / Enrollment field lists — those come from the `courses`,
 * `lessons`, `enrollments` table references. Field choices here are
 * reasonable decisions, logged in the assumption register (index.ts).
 */

export type CourseLevel = "beginner" | "intermediate" | "advanced";
export type LessonKind = "video" | "article";
export type CourseFormat = "video" | "interactive" | "lab" | "project" | "judge";
export type CareerTrack = "cyber_security" | "web_development" | "ai_ml" | "cloud" | "data_science" | "game_dev" | "interview_prep";
export type DurationFilter = "under_2" | "2_to_5" | "5_to_10" | "over_10";
export type CourseSort = "popular" | "rated" | "newest" | "recommended" | "shortest";
/**
 * §4.4 — courses are versioned like code: draft vs published.
 * F7 (Admin/CMS) adds `in_review` for the submit-for-review →
 * second-reviewer-publish workflow (build.md F7).
 */
export type ContentStatus = "draft" | "in_review" | "published";
export type EnrollmentStatus = "active" | "completed";

export interface CourseInstructor {
  id: string;
  display_name: string;
  title: string;
}

export interface CourseLesson {
  id: string;
  title: string;
  kind: LessonKind;
  /** Seconds of video; 0 for articles */
  duration_seconds: number;
  position: number;
  /** Guest-accessible lesson preview, served by the Content Engine. */
  isPreview: boolean;
  /** Mock stand-in for the authored lesson body. */
  preview_body?: string | null;
}

export interface LessonPreview {
  lesson_id: string;
  title: string;
  kind: LessonKind;
  duration_seconds: number;
  body: string;
  manifest_url: string | null;
}

/** Content Engine review projection (build.md F1 course reviews). */
export interface Review {
  id: string;
  course_id: string;
  author: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  rating: number;
  date: string;
  comment: string;
  helpful_count: number;
}

export interface ReviewPage {
  course_id: string;
  offset: number;
  total: number;
  reviews: Review[];
  has_more: boolean;
}

export interface CourseSection {
  id: string;
  title: string;
  position: number;
  lessons: CourseLesson[];
}

export interface Course {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  level: CourseLevel;
  language: string;
  /** §4.4 draft vs published */
  status: ContentStatus;
  /**
   * F7 review workflow — who submitted the current revision for review.
   * Drives the two-person rule (publisher must differ from the submitter).
   * Null until a draft is submitted. Provisional, logged in the register.
   */
  submitted_by?: string | null;
  /** F7 review workflow — who published the last version (second reviewer). */
  reviewed_by?: string | null;
  instructor: CourseInstructor;
  rating: number;
  review_count: number;
  /** 0 = free */
  price_cents: number;
  enrolled_count: number;
  estimated_hours: number;
  syllabus: CourseSection[];
  created_at: string;
  updated_at: string;
  format?: CourseFormat;
  career_track?: CareerTrack;
  is_project_based?: boolean;
  certificate_included?: boolean;
}

/** Lightweight card shape for catalog hits */
export interface CourseSummary {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  level: CourseLevel;
  rating: number;
  review_count: number;
  price_cents: number;
  enrolled_count: number;
  estimated_hours: number;
  instructor_name: string;
  language: string;
  /** Seed for the gradient cover art (mock stand-in for poster art) */
  cover_hue: number;
  format: CourseFormat;
  career_track: CareerTrack;
  is_project_based: boolean;
  certificate_included: boolean;
}

/**
 * SignedManifest — signed, short-TTL HLS URL (platform §2.3/§4.1).
 * In mock mode `signature` is a deterministic stand-in; the real backend
 * signs with a server-held key and enforces expiry (a fetch after
 * `expires_at` must 403).
 */
export interface SignedManifest {
  lesson_id: string;
  user_id: string;
  manifest_url: string;
  expires_at: string;
  signature: string;
  /** WebVTT captions URL, null when the lesson has none */
  captions_url: string | null;
}

export interface Enrollment {
  course_id: string;
  user_id: string;
  status: EnrollmentStatus;
  /** 0-100 across all lessons */
  progress_pct: number;
  /** Resume position */
  last_lesson_id: string | null;
  last_position_seconds: number;
  enrolled_at: string;
  updated_at: string;
}

/* ------------------------------------------------------------------ */
/*  Catalog search — mock Meilisearch response shape                    */
/*  (mirrors the real Meilisearch JSON API field names so the later     */
/*  swap to the self-hosted Meilisearch instance is field-identical)    */
/* ------------------------------------------------------------------ */

export interface CatalogFacet {
  category: string;
  count: number;
}

export interface MeilisearchCatalogResponse {
  hits: CourseSummary[];
  query: string;
  processingTimeMs: number;
  limit: number;
  offset: number;
  estimatedTotalHits: number;
}

export interface CatalogQuery {
  query?: string;
  category?: string;
  price?: "free" | "paid" | "all";
  level?: CourseLevel | "all";
  page?: number;
  pageSize?: number;
  duration?: DurationFilter;
  format?: CourseFormat | "all";
  careerTrack?: CareerTrack | "all";
  projectBased?: boolean;
  certificateIncluded?: boolean;
  minRating?: number;
  sort?: CourseSort;
}

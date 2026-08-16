import { z } from "zod";

export const apiUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  display_name: z.string().min(1),
  role: z.enum(["user", "instructor", "org_admin", "platform_ops"]),
  org_id: z.string().uuid().nullable(),
  is_active: z.boolean(),
  created_at: z.string(),
});

export const tokenPairSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.literal("bearer"),
});

export const authSessionSchema = z.object({
  user: apiUserSchema,
  tokens: tokenPairSchema,
});

const apiCourseFormatSchema = z.enum(["video", "interactive", "lab", "project", "judge"]);
const apiCareerTrackSchema = z.enum([
  "cyber_security",
  "web_development",
  "ai_ml",
  "cloud",
  "data_science",
  "game_dev",
  "interview_prep",
]);

const apiLessonSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  kind: z.enum(["video", "article"]),
  duration_seconds: z.number(),
  position: z.number(),
  isPreview: z.boolean().optional(),
  is_preview: z.boolean().optional(),
  preview_body: z.string().nullable().optional(),
});

const apiSectionSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  position: z.number(),
  lessons: z.array(apiLessonSchema),
});

export const apiCourseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  subtitle: z.string(),
  description: z.string(),
  category: z.string(),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  language: z.string(),
  status: z.enum(["draft", "in_review", "published"]),
  submitted_by: z.string().uuid().nullable().optional(),
  reviewed_by: z.string().uuid().nullable().optional(),
  instructor: z.object({ id: z.string().uuid(), display_name: z.string(), title: z.string() }),
  rating: z.number(),
  review_count: z.number(),
  price_cents: z.number(),
  enrolled_count: z.number(),
  estimated_hours: z.number(),
  syllabus: z.array(apiSectionSchema),
  created_at: z.string(),
  updated_at: z.string(),
  format: apiCourseFormatSchema.nullable().optional(),
  career_track: apiCareerTrackSchema.nullable().optional(),
  is_project_based: z.boolean().optional(),
  certificate_included: z.boolean().optional(),
});

export const apiCourseListSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      title: z.string(),
      subtitle: z.string(),
      category: z.string(),
      level: z.enum(["beginner", "intermediate", "advanced"]),
      rating: z.number(),
      review_count: z.number(),
      price_cents: z.number(),
      enrolled_count: z.number(),
      estimated_hours: z.number(),
      total_lessons: z.number(),
      instructor_name: z.string(),
      language: z.string(),
      format: apiCourseFormatSchema,
      career_track: apiCareerTrackSchema,
      is_project_based: z.boolean(),
      certificate_included: z.boolean(),
    }),
  ),
  total: z.number(),
});

export const apiEnrollmentSchema = z.object({
  course_id: z.string().uuid(),
  user_id: z.string().uuid(),
  status: z.enum(["active", "completed"]),
  progress_pct: z.number(),
  last_lesson_id: z.string().uuid().nullable(),
  last_position_seconds: z.number(),
  enrolled_at: z.string(),
  updated_at: z.string(),
});

export const apiLessonContentSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  kind: z.enum(["video", "article"]),
  duration_seconds: z.number(),
  position: z.number(),
  is_preview: z.boolean(),
  /** Article body — `null` for video lessons (playback is a signed manifest). */
  body: z.string().nullable(),
});

export const apiCourseProgressSchema = z.object({
  enrollment: apiEnrollmentSchema.nullable(),
  completed_lesson_ids: z.array(z.string().uuid()),
});
export const apiMyLearningSchema = z.array(
  z.object({ enrollment: apiEnrollmentSchema, course: apiCourseListSchema.shape.items.element }),
);

const apiQuestionSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["mcq", "short_answer", "code"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  prompt: z.string(),
  options: z.array(z.string()).nullable().optional(),
  starter_code: z.string().nullable().optional(),
});

export const apiAssessmentSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  category: z.string(),
  description: z.string(),
  version: z.number(),
  estimated_minutes: z.number(),
  attempts_allowed: z.number(),
  passing_percent: z.number(),
  questions: z.array(apiQuestionSchema),
});

export const apiAssessmentsSchema = z.array(apiAssessmentSchema);
export const apiAttemptSchema = z.object({
  attempt_id: z.string().uuid(),
  assessment_id: z.string().uuid(),
  user_id: z.string().uuid(),
  status: z.enum(["in_progress", "submitted", "expired", "abandoned"]),
  attempt_number: z.number(),
  started_at: z.string(),
  expires_at: z.string(),
  answers: z.array(
    z.object({
      question_id: z.string().uuid(),
      correct: z.boolean(),
      score: z.number(),
      submitted_at: z.string(),
    }),
  ),
  score: z.number(),
  integrity_flags: z.array(z.string()),
  submitted_at: z.string().nullable(),
  total_score: z.number(),
  passed: z.boolean(),
});
export const apiAttemptSummariesSchema = z.array(
  z.object({
    attempt_id: z.string().uuid(),
    attempt_number: z.number(),
    status: z.enum(["in_progress", "submitted", "expired", "abandoned"]),
    score: z.number(),
    passed: z.boolean(),
    correct_count: z.number(),
    question_count: z.number(),
    max_combo: z.number(),
    submitted_at: z.string().nullable(),
  }),
);
export const apiGradeResultSchema = z.object({
  attempt_id: z.string().uuid(),
  question_id: z.string().uuid(),
  correct: z.boolean(),
  score: z.number(),
  feedback: z.string(),
  combo: z.object({ count: z.number(), multiplier: z.number(), best: z.number() }),
});
export const apiAssessmentResultSchema = z.object({
  attempt_id: z.string().uuid(),
  assessment_id: z.string().uuid(),
  score: z.number(),
  total_score: z.number(),
  correct_count: z.number(),
  question_count: z.number(),
  time_taken_seconds: z.number(),
  max_combo: z.number(),
  integrity_flags: z.array(z.string()),
  passed: z.boolean(),
});

const apiRankStateSchema = z.object({
  user_id: z.string().uuid(),
  level: z.number(),
  rank_name: z.string(),
  prestige_tier: z.number(),
  completion_xp: z.number(),
  mastery_xp: z.number(),
  rank_progress_pct: z.number(),
  percentile_global: z.number(),
  percentile_cohort: z.number().nullable(),
  specialization_tag: z.string().nullable(),
});

const apiStreakStateSchema = z.object({
  user_id: z.string().uuid(),
  current_streak_days: z.number(),
  longest_streak_days: z.number(),
  freeze_tokens_available: z.number(),
  momentum_multiplier: z.number(),
  last_active_date: z.string(),
  status: z.enum(["active", "grace_period", "broken", "frozen"]),
});

const apiLeagueStandingSchema = z.object({
  user_id: z.string().uuid(),
  season_id: z.string().uuid(),
  league_tier: z.enum(["bronze", "silver", "gold", "platinum", "obsidian"]),
  rank_in_league: z.number(),
  xp_this_season: z.number(),
  promotion_zone: z.boolean(),
  relegation_zone: z.boolean(),
});

const apiGuildRollupSchema = z.object({
  guild_id: z.string().uuid(),
  member_count: z.number(),
  combined_xp_this_week: z.number(),
  guild_rank_global: z.number(),
});

/** §5.3 ProgressContext — the backend's authoritative progression state (GET /me/progress). */
export const apiProgressContextSchema = z.object({
  context_version: z.number(),
  user_id: z.string().uuid(),
  computed_at: z.string(),
  rank: apiRankStateSchema,
  streak: apiStreakStateSchema,
  league: apiLeagueStandingSchema.nullable(),
  guild: apiGuildRollupSchema.nullable(),
  unresolved_flags: z.array(z.string()),
  freeze_status: z.enum(["live", "frozen_pending_review"]),
});

export type ApiUser = z.infer<typeof apiUserSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;

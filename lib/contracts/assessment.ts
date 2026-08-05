/**
 * Assessment Engine contracts (platform doc §2.6, §4.1; gamification doc
 * §7.6 combo/integrity).
 *
 * Locked by the docs:
 *  - AssessmentEngine Protocol (§4.1): submit_answer(submission:
 *    AssessmentSubmission) -> GradeResult.
 *  - Grading is DETERMINISTIC, never AI (§2.6): exact/fuzzy-match rules for
 *    MCQ/short-answer; code questions DELEGATE to the Judge Engine ("an
 *    assessment code question IS a judge submission with a course/assessment
 *    context attached — same engine, one grading truth").
 *  - Anti-cheat: tab-visibility change events, paste-event logging, timing
 *    telemetry — feeds the same Integrity Gate as gamification
 *    (gamification/integrity/gate.py).
 *  - Question bank: versioned, namespaced per course, difficulty-tagged
 *    (feeds the gamification "Clutch bonus" static difficulty field).
 *  - Event: `assessment.submitted` on the bus.
 *  - Combo: client shows a PREVIEW combo meter (SSE-driven in prod); the
 *    server is the only thing that can turn it into real XP (§7.6 — "the
 *    client trusted itself" gap is closed).
 *
 * NOT locked by the docs (reasonable decisions, logged in index.ts):
 *  - full Assessment/Question/Attempt field lists (the `assessments` /
 *    `questions` / `assessment_submissions` tables are referenced, not
 *    schematized).
 *  - AssessmentSubmittedEvent field list (only the event_type literal is
 *    pinned) — mirrors JudgeSubmissionGradedEvent / LabSessionCompletedEvent
 *    conventions.
 *  - ComboState shape (count/multiplier/best) — a reasonable interpretation
 *    of the gamification doc's combo counter + multiplier language.
 */

export type QuestionType = "mcq" | "short_answer" | "code";

/** Difficulty-tagged per §2.6 (feeds the Clutch bonus static field). */
export type QuestionDifficulty = "easy" | "medium" | "hard";

export type AttemptStatus =
  | "in_progress"
  | "submitted"
  | "expired"
  | "abandoned";

export interface AssessmentQuestion {
  id: string;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  prompt: string;
  /** MCQ options (mcq only). */
  options?: string[];
  /** Short-answer accepted patterns, fuzzy-matched server-side. */
  accepted_answers?: string[];
  /** Code-question starter code (code only — rendered in Monaco). */
  starter_code?: string;
  /** Deterministic reference for code grading (mock judge delegation). */
  reference_solution?: string;
}

export interface Assessment {
  id: string;
  slug: string;
  title: string;
  category: string;
  description: string;
  /** Versioned question bank, namespaced per course (§2.6). */
  version: number;
  estimated_minutes: number;
  attempts_allowed: number;
  passing_percent: number;
  questions: AssessmentQuestion[];
}

/**
 * The submission shape the AssessmentEngine Protocol grades. `answer` is a
 * discriminated union by question type:
 *  - mcq          → { option_index }
 *  - short_answer → { text }
 *  - code         → { source_code }
 */
export interface AssessmentSubmission {
  attempt_id: string;
  question_id: string;
  user_id: string;
  type: QuestionType;
  answer:
    | { option_index: number }
    | { text: string }
    | { source_code: string };
  /** Client-reported time spent; the server may discount it (timing telemetry). */
  time_spent_ms: number;
}

/** The Protocol's return — deterministic grading + server combo view. */
export interface GradeResult {
  attempt_id: string;
  question_id: string;
  correct: boolean;
  /** Points awarded for this question (0 on wrong). */
  score: number;
  /** Deterministic feedback shown after grading (never AI). */
  feedback: string;
  /** Server-derived combo AFTER this answer (count/multiplier for the meter). */
  combo: ComboState;
}

/** Server-derived combo view — the client only PREVIEWS it (§7.6). */
export interface ComboState {
  count: number;
  multiplier: number;
  best: number;
}

export interface AttemptAnswer {
  question_id: string;
  correct: boolean;
  score: number;
  submitted_at: string;
}

export interface AssessmentAttempt {
  attempt_id: string;
  assessment_id: string;
  user_id: string;
  status: AttemptStatus;
  attempt_number: number;
  started_at: string;
  expires_at: string;
  answers: AttemptAnswer[];
  /** Total points accumulated so far (server-derived). */
  score: number;
  /** Anti-cheat flags captured this attempt (tab-switch, paste). */
  integrity_flags: string[];
  submitted_at: string | null;
}

/** Compact attempt row for the detail-page attempts tracker. */
export interface AssessmentAttemptSummary {
  attempt_id: string;
  attempt_number: number;
  status: AttemptStatus;
  score: number;
  /** Pass/fail is derived server-side against the assessment's threshold. */
  passed: boolean;
  correct_count: number;
  question_count: number;
  /** Best combo run achieved (server-derived via the attempt's answers). */
  max_combo: number;
  submitted_at: string | null;
}

/** Mirrors the `assessment.submitted` bus event. */
export interface AssessmentSubmittedEvent {
  event_type: "assessment.submitted";
  assessment_id: string;
  attempt_id: string;
  score: number;
  total_score: number;
  correct_count: number;
  question_count: number;
  time_taken_seconds: number;
  max_combo: number;
  integrity_flags: string[];
}

/** Anti-cheat telemetry (build.md F4) — captured now, Integrity Gate later. */
export type TelemetryType = "tab_visibility" | "paste" | "focus_blur";

export interface TelemetryEvent {
  attempt_id: string;
  type: TelemetryType;
  detail: string;
  occurred_at: string;
}

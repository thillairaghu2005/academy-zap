import type {
  Assessment,
  AssessmentAttempt,
  AssessmentSubmission,
  AssessmentSubmittedEvent,
  AssessmentAttemptSummary,
  ComboState,
  GradeResult,
  TelemetryEvent,
} from "@/lib/contracts/assessment";
import {
  bestCombo,
  comboFor,
  enforceAttemptTimeout,
  gradeAnswerServerSide,
  MOCK_ASSESSMENTS,
  MOCK_ASSESSMENTS_BY_ID,
  MOCK_BOOM_ASSESSMENT_ID,
  mockAttempts,
  persistAttempts,
  pointsFor,
} from "@/lib/mocks/assessment";
import { MockDataError } from "@/lib/data/demo/errors";
import { delay, jitter } from "@/lib/data/demo/helpers";
import { recordDemoActivity } from "@/lib/demo/activity";
import { trackDemoEvent } from "@/lib/demo/analytics";

/**
 * Local demo assessment service.
 *
 * Signatures mirror the AssessmentEngine Protocol (platform §4.1):
 *   submit_answer(submission: AssessmentSubmission) -> GradeResult
 *
 * Grading is deterministic in the local service (§2.6): MCQ exact match, short
 * answer fuzzy match, code questions DELEGATE to the Judge Engine mock. The
 * combo meter is derived by the service and only PREVIEWED by the client — the
 * browser can never convert its own meter into XP (gamification §7.6).
 *
 * Mock rules (deterministic, demoable):
 *  - assessment id "missing-assessment" → 404 (detail error state)
 *  - assessment id "boom"               → 503 on start (start error state)
 */

export async function listAssessments(): Promise<Assessment[]> {
  await delay(jitter(260));
  return MOCK_ASSESSMENTS.map(publicAssessment);
}

export async function getAssessment(
  assessmentId: string,
): Promise<Assessment> {
  await delay(jitter(220));
  const assessment = MOCK_ASSESSMENTS_BY_ID.get(assessmentId);
  if (!assessment) {
    throw new MockDataError(
      "assessment_not_found",
      `Assessment ${assessmentId} was not found.`,
      404,
    );
  }
  return publicAssessment(assessment);
}

/** Starts an attempt — the mock's stand-in for attempt-table row creation. */
export async function startAttempt(
  assessmentId: string,
  userId: string,
  attemptNumber: number,
): Promise<AssessmentAttempt> {
  await delay(jitter(240));
  if (assessmentId === MOCK_BOOM_ASSESSMENT_ID) {
    throw new MockDataError(
      "assessment_down",
      "Assessment demo data is unavailable (simulated).",
      503,
    );
  }
  const assessment = MOCK_ASSESSMENTS_BY_ID.get(assessmentId);
  if (!assessment) {
    throw new MockDataError("assessment_not_found", "Assessment was not found.", 404);
  }
  if (!userId) {
    throw new MockDataError("demo_session_required", "Sign in to start an assessment.", 401);
  }
  const usedAttempts = [...mockAttempts.values()].filter(
    (attempt) => attempt.assessment_id === assessmentId && attempt.user_id === userId,
  ).length;
  if (usedAttempts >= assessment.attempts_allowed) {
    throw new MockDataError(
      "attempts_exhausted",
      "You have used all attempts for this assessment.",
      409,
    );
  }

  const attemptId = `att-${crypto.randomUUID()}`;
  const now = new Date();
  const attempt: AssessmentAttempt = {
    attempt_id: attemptId,
    assessment_id: assessment.id,
    user_id: userId,
    status: "in_progress",
    attempt_number: attemptNumber,
    started_at: now.toISOString(),
    expires_at: new Date(
      now.getTime() + assessment.estimated_minutes * 60_000,
    ).toISOString(),
    answers: [],
    score: 0,
    integrity_flags: [],
    submitted_at: null,
  };
  mockAttempts.set(attemptId, attempt);
  persistAttempts();
  return attempt;
}

/** Attempt read — enforces the timer in the demo service. */
export async function getAttempt(
  attemptId: string,
  userId?: string,
): Promise<AssessmentAttempt> {
  await delay(jitter(180));
  const attempt = mockAttempts.get(attemptId);
  if (!attempt) {
    throw new MockDataError(
      "attempt_not_found",
      "Assessment attempt was not found.",
      404,
    );
  }
  assertAttemptOwner(attempt, userId);
  enforceAttemptTimeout(attempt);
  return attempt;
}

/** Deterministic grading in the demo service. */
export async function submitAnswer(
  submission: AssessmentSubmission,
  userId?: string,
): Promise<GradeResult> {
  await delay(jitter(200));
  const attempt = mockAttempts.get(submission.attempt_id);
  if (!attempt) {
    throw new MockDataError(
      "attempt_not_found",
      "Assessment attempt was not found.",
      404,
    );
  }
  assertAttemptOwner(attempt, userId);
  enforceAttemptTimeout(attempt);
  if (attempt.status !== "in_progress") {
    throw new MockDataError(
      "attempt_closed",
      "This attempt is no longer in progress.",
      409,
    );
  }
  if (attempt.answers.some((answer) => answer.question_id === submission.question_id)) {
    throw new MockDataError(
      "duplicate_answer",
      "This question has already been answered.",
      409,
    );
  }
  const assessment = MOCK_ASSESSMENTS_BY_ID.get(attempt.assessment_id);
  const question = assessment?.questions.find(
    (candidate) => candidate.id === submission.question_id,
  );
  if (!question || question.type !== submission.type) {
    throw new MockDataError("question_not_found", "Question was not found.", 404);
  }
  return publicGradeResult(gradeAnswerServerSide(submission));
}

/** Server-derived combo view — the client PREVIEWS this only (§7.6). */
export async function getComboState(
  attemptId: string,
  userId?: string,
): Promise<ComboState> {
  await delay(jitter(120));
  const attempt = mockAttempts.get(attemptId);
  if (!attempt) {
    throw new MockDataError("attempt_not_found", "Attempt was not found.", 404);
  }
  assertAttemptOwner(attempt, userId);
  return comboFor(attempt);
}

/**
 * Combo curve — the server-owned multiplier table (1 + 0.25·count, capped
 * at ×3.0) used by the detail-page teaser. Server-derived so the displayed
 * curve can never drift from the formula the grader applies.
 */
export async function getComboCurve(): Promise<
  { count: number; multiplier: number }[]
> {
  await delay(jitter(120));
  const steps = Array.from({ length: 9 }, (_, i) => i);
  return steps.map((count) => ({
    count,
    multiplier: Math.min(3, 1 + count * 0.25),
  }));
}

/**
 * Attempt history for an assessment + user (mock table read). Used by the
 * detail-page attempts tracker: shows used/remaining and the last result.
 */
export async function listAttemptsForAssessment(
  assessmentId: string,
  userId: string,
): Promise<AssessmentAttemptSummary[]> {
  await delay(jitter(200));
  const assessment = MOCK_ASSESSMENTS_BY_ID.get(assessmentId);
  const questionCount = assessment?.questions.length ?? 0;
  const totalScore =
    assessment?.questions.reduce((sum, q) => sum + pointsFor(q.difficulty), 0) ??
    0;
  const attempts: AssessmentAttemptSummary[] = [];
  for (const attempt of mockAttempts.values()) {
    if (attempt.assessment_id !== assessmentId) continue;
    if (attempt.user_id !== userId) continue;
    attempts.push({
      attempt_id: attempt.attempt_id,
      attempt_number: attempt.attempt_number,
      status: attempt.status,
      score: attempt.score,
      passed:
        attempt.status === "submitted" &&
        totalScore > 0 &&
        (attempt.score / totalScore) * 100 >= (assessment?.passing_percent ?? 100),
      correct_count: attempt.answers.filter((a) => a.correct).length,
      question_count: questionCount,
      max_combo: bestCombo(attempt),
      submitted_at: attempt.submitted_at,
    });
  }
  return attempts.sort((a, b) => b.attempt_number - a.attempt_number);
}

/**
 * Final submission — emits the `assessment.submitted` event shape. Only
 * allowed when every question has an answer.
 */
export async function submitAssessment(
  attemptId: string,
  userId?: string,
): Promise<AssessmentSubmittedEvent> {
  await delay(jitter(220));
  const attempt = mockAttempts.get(attemptId);
  if (!attempt) {
    throw new MockDataError(
      "attempt_not_found",
      "Assessment attempt was not found.",
      404,
    );
  }
  assertAttemptOwner(attempt, userId);
  enforceAttemptTimeout(attempt);
  if (attempt.status !== "in_progress") {
    throw new MockDataError(
      "attempt_closed",
      "This attempt is already closed.",
      409,
    );
  }
  const assessment = MOCK_ASSESSMENTS_BY_ID.get(attempt.assessment_id);
  if (!assessment) {
    throw new MockDataError("assessment_not_found", "Assessment not found.", 404);
  }
  if (attempt.answers.length < assessment.questions.length) {
    throw new MockDataError(
      "questions_pending",
      "Answer every question before submitting.",
      409,
    );
  }

  const now = new Date();
  attempt.status = "submitted";
  attempt.submitted_at = now.toISOString();
  persistAttempts();
  recordDemoActivity("assessment_submitted", `${assessment.title} submitted`, {
    assessment_id: attempt.assessment_id,
    score: attempt.score,
  });
  trackDemoEvent("assessment_submitted", {
    assessment_id: attempt.assessment_id,
    score: attempt.score,
  });
  return {
    event_type: "assessment.submitted",
    assessment_id: attempt.assessment_id,
    attempt_id: attempt.attempt_id,
    score: attempt.score,
    total_score: assessment.questions.reduce(
      (sum, q) => sum + pointsFor(q.difficulty),
      0,
    ),
    correct_count: attempt.answers.filter((a) => a.correct).length,
    question_count: assessment.questions.length,
    time_taken_seconds: Math.max(
      0,
      Math.round(
        (now.getTime() - new Date(attempt.started_at).getTime()) / 1000,
      ),
    ),
    max_combo: bestCombo(attempt),
    integrity_flags: attempt.integrity_flags,
  };
}

/**
 * Anti-cheat telemetry (build.md F4): captured now, sent to the Integrity
 * Gate in a future integration. In demo mode it appends to the attempt's
 * integrity flags and logs to console.
 */
export async function reportTelemetry(
  event: TelemetryEvent,
  userId?: string,
): Promise<void> {
  await delay(jitter(80));
  const attempt = mockAttempts.get(event.attempt_id);
  if (attempt) assertAttemptOwner(attempt, userId);
  if (attempt) {
    const flag = `${event.type}@${event.occurred_at}`;
    if (!attempt.integrity_flags.includes(flag)) {
      attempt.integrity_flags.push(flag);
      persistAttempts();
    }
  }
  console.info("[integrity-telemetry]", event);
}

function publicAssessment(assessment: Assessment): Assessment {
  return {
    ...assessment,
    questions: assessment.questions.map((question) => {
      const {
        accepted_answers: _acceptedAnswers,
        reference_solution: _referenceSolution,
        ...safeQuestion
      } = question;
      return safeQuestion;
    }),
  };
}

function publicGradeResult(result: GradeResult): GradeResult {
  return {
    ...result,
    feedback: result.correct
      ? "Correct — your answer passed the server check."
      : "Incorrect — review the lesson material and try the next question.",
  };
}

function assertAttemptOwner(
  attempt: AssessmentAttempt,
  userId: string | undefined,
): void {
  if (userId && attempt.user_id !== userId) {
    throw new MockDataError(
      "attempt_not_found",
      "Assessment attempt was not found.",
      404,
    );
  }
}

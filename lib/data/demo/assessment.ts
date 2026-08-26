import {
  getAssessmentAttemptFromApi,
  getAssessmentComboFromApi,
  getAssessmentFromApi,
  listAssessmentAttemptsFromApi,
  listAssessmentsFromApi,
  reportAssessmentTelemetryFromApi,
  startAssessmentFromApi,
  submitAssessmentFromApi,
  submitMcqAnswerFromApi,
  ApiError,
} from "@/lib/api/client";
import type {
  Assessment,
  AssessmentAttempt,
  AssessmentAttemptSummary,
  AssessmentSubmission,
  AssessmentSubmittedEvent,
  ComboState,
  GradeResult,
  TelemetryEvent,
} from "@/lib/contracts/assessment";
import { AUTH_MODE } from "@/lib/config";
import { trackDemoEvent } from "@/lib/demo/analytics";
import {
  MOCK_ASSESSMENTS,
  MOCK_ASSESSMENTS_BY_ID,
  MOCK_BOOM_ASSESSMENT_ID,
  MOCK_MISSING_ASSESSMENT_ID,
  bestCombo,
  comboFor,
  enforceAttemptTimeout,
  gradeAnswerServerSide,
  mockAttempts,
  persistAttempts,
  pointsFor,
} from "@/lib/mocks/assessment";

/* ------------------------------------------------------------------ */
/*  Assessment data boundary (slice 03 §12/§13).                       */
/*                                                                     */
/*  `AUTH_MODE=demo`  → isolated demo fixtures + localStorage attempt  */
/*                      store, graded deterministically by the demo    */
/*                      service (never fake HTTP).                     */
/*  `AUTH_MODE=backend` → the same shapes from the FastAPI Assessment  */
/*                      Engine; the backend is the only grader.        */
/* ------------------------------------------------------------------ */

/* ------------------------------ demo ------------------------------ */

async function listDemoAssessments(): Promise<Assessment[]> {
  return MOCK_ASSESSMENTS;
}

async function getDemoAssessment(assessmentId: string): Promise<Assessment> {
  if (assessmentId === MOCK_MISSING_ASSESSMENT_ID) {
    throw new ApiError(404, "Assessment not found.");
  }
  const assessment = MOCK_ASSESSMENTS_BY_ID.get(assessmentId);
  if (!assessment) throw new ApiError(404, "Assessment not found.");
  return assessment;
}

async function startDemoAttempt(
  assessmentId: string,
  userId: string,
  _attemptNumber: number,
): Promise<AssessmentAttempt> {
  if (assessmentId === MOCK_BOOM_ASSESSMENT_ID) {
    throw new ApiError(503, "The assessment engine is temporarily unavailable.");
  }
  const assessment = MOCK_ASSESSMENTS_BY_ID.get(assessmentId);
  if (!assessment) throw new ApiError(404, "Assessment not found.");
  const existing = [...mockAttempts.values()].filter(
    (attempt) => attempt.assessment_id === assessmentId && attempt.user_id === userId,
  );
  if (existing.length >= assessment.attempts_allowed) {
    throw new ApiError(409, "You have used all attempts for this assessment.");
  }
  const attempt: AssessmentAttempt = {
    attempt_id: crypto.randomUUID(),
    assessment_id: assessmentId,
    user_id: userId,
    status: "in_progress",
    attempt_number: existing.length + 1,
    started_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + assessment.estimated_minutes * 60_000).toISOString(),
    answers: [],
    score: 0,
    integrity_flags: [],
    submitted_at: null,
    total_score: assessment.questions.reduce((sum, q) => sum + pointsFor(q.difficulty), 0),
    passed: false,
  };
  mockAttempts.set(attempt.attempt_id, attempt);
  persistAttempts();
  return attempt;
}

async function getDemoAttempt(attemptId: string, _userId?: string): Promise<AssessmentAttempt> {
  const attempt = mockAttempts.get(attemptId);
  if (!attempt) throw new ApiError(404, "Assessment attempt not found.");
  enforceAttemptTimeout(attempt);
  return attempt;
}

async function getDemoComboState(attemptId: string, _userId?: string): Promise<ComboState> {
  const attempt = mockAttempts.get(attemptId);
  if (!attempt) throw new ApiError(404, "Assessment attempt not found.");
  return comboFor(attempt);
}

async function listDemoAttemptsForAssessment(
  assessmentId: string,
  userId: string,
): Promise<AssessmentAttemptSummary[]> {
  const assessment = MOCK_ASSESSMENTS_BY_ID.get(assessmentId);
  if (!assessment) throw new ApiError(404, "Assessment not found.");
  const rows = [...mockAttempts.values()]
    .filter((attempt) => attempt.assessment_id === assessmentId && attempt.user_id === userId)
    .sort((a, b) => b.attempt_number - a.attempt_number);
  const totalScore = assessment.questions.reduce((sum, q) => sum + pointsFor(q.difficulty), 0);
  return rows.map((attempt) => ({
    attempt_id: attempt.attempt_id,
    attempt_number: attempt.attempt_number,
    status: attempt.status,
    score: attempt.score,
    passed:
      attempt.status === "submitted" &&
      totalScore > 0 &&
      (attempt.score / totalScore) * 100 >= assessment.passing_percent,
    correct_count: attempt.answers.filter((answer) => answer.correct).length,
    question_count: assessment.questions.length,
    max_combo: bestCombo(attempt),
    submitted_at: attempt.submitted_at,
  }));
}

async function submitDemoAnswer(
  submission: AssessmentSubmission,
  _userId?: string,
): Promise<GradeResult> {
  return gradeAnswerServerSide(submission);
}

async function submitDemoAssessment(
  attemptId: string,
  _userId?: string,
): Promise<AssessmentSubmittedEvent> {
  const attempt = mockAttempts.get(attemptId);
  if (!attempt) throw new ApiError(404, "Assessment attempt not found.");
  if (attempt.status !== "in_progress") {
    throw new ApiError(409, "This assessment attempt is no longer in progress.");
  }
  const assessment = MOCK_ASSESSMENTS_BY_ID.get(attempt.assessment_id);
  if (!assessment) throw new ApiError(404, "Assessment not found.");
  if (attempt.answers.length < assessment.questions.length) {
    throw new ApiError(409, "Answer every question before submitting.");
  }
  attempt.status = "submitted";
  attempt.submitted_at = new Date().toISOString();
  persistAttempts();
  const totalScore = assessment.questions.reduce((sum, q) => sum + pointsFor(q.difficulty), 0);
  const scorePct = totalScore > 0 ? (attempt.score / totalScore) * 100 : 0;
  if (AUTH_MODE === "demo") {
    // Mirrors the judge/lab engines so the admin analytics summary's
    // assessment-submission count reflects real learner activity.
    trackDemoEvent("assessment_submitted", {
      assessment_id: assessment.id,
      passed: scorePct >= assessment.passing_percent,
    });
  }
  return {
    event_type: "assessment.submitted",
    assessment_id: assessment.id,
    attempt_id: attempt.attempt_id,
    score: attempt.score,
    total_score: totalScore,
    correct_count: attempt.answers.filter((answer) => answer.correct).length,
    question_count: assessment.questions.length,
    time_taken_seconds: Math.max(
      0,
      Math.round(
        (new Date(attempt.submitted_at).getTime() - new Date(attempt.started_at).getTime()) /
          1000,
      ),
    ),
    max_combo: bestCombo(attempt),
    integrity_flags: attempt.integrity_flags,
    passed: scorePct >= assessment.passing_percent,
  };
}

async function reportDemoTelemetry(event: TelemetryEvent, _userId?: string): Promise<void> {
  const attempt = mockAttempts.get(event.attempt_id);
  if (!attempt) throw new ApiError(404, "Assessment attempt not found.");
  const flag = `${event.type}@${event.occurred_at}`;
  if (!attempt.integrity_flags.includes(flag)) {
    attempt.integrity_flags = [...attempt.integrity_flags, flag];
    persistAttempts();
  }
}

/* ----------------------------- boundary --------------------------- */

export const listAssessments = (): Promise<Assessment[]> =>
  AUTH_MODE === "backend" ? listAssessmentsFromApi() : listDemoAssessments();

export const getAssessment = (assessmentId: string): Promise<Assessment> =>
  AUTH_MODE === "backend" ? getAssessmentFromApi(assessmentId) : getDemoAssessment(assessmentId);

export const startAttempt = (
  assessmentId: string,
  userId: string,
  attemptNumber: number,
): Promise<AssessmentAttempt> =>
  AUTH_MODE === "backend"
    ? startAssessmentFromApi(assessmentId)
    : startDemoAttempt(assessmentId, userId, attemptNumber);

export const getAttempt = (attemptId: string, userId?: string): Promise<AssessmentAttempt> =>
  AUTH_MODE === "backend" ? getAssessmentAttemptFromApi(attemptId) : getDemoAttempt(attemptId, userId);

export const getComboState = (attemptId: string, userId?: string): Promise<ComboState> =>
  AUTH_MODE === "backend"
    ? getAssessmentComboFromApi(attemptId)
    : getDemoComboState(attemptId, userId);

export const listAttemptsForAssessment = (
  assessmentId: string,
  userId: string,
): Promise<AssessmentAttemptSummary[]> =>
  AUTH_MODE === "backend"
    ? listAssessmentAttemptsFromApi(assessmentId)
    : listDemoAttemptsForAssessment(assessmentId, userId);

export const submitAnswer = (
  submission: AssessmentSubmission,
  userId?: string,
): Promise<GradeResult> =>
  AUTH_MODE === "backend"
    ? submitMcqAnswerFromApi(submission.attempt_id, submission)
    : submitDemoAnswer(submission, userId);

export const submitAssessment = (
  attemptId: string,
  userId?: string,
): Promise<AssessmentSubmittedEvent> =>
  AUTH_MODE === "backend"
    ? submitAssessmentFromApi(attemptId)
    : submitDemoAssessment(attemptId, userId);

export const reportTelemetry = (event: TelemetryEvent, userId?: string): Promise<void> =>
  AUTH_MODE === "backend"
    ? reportAssessmentTelemetryFromApi(event.attempt_id, event)
    : reportDemoTelemetry(event, userId);

export const getComboCurve = async (): Promise<{ count: number; multiplier: number }[]> =>
  Array.from({ length: 9 }, (_, count) => ({ count, multiplier: Math.min(3, 1 + count * 0.25) }));

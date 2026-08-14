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

export const listAssessments = (): Promise<Assessment[]> => listAssessmentsFromApi();
export const getAssessment = (assessmentId: string): Promise<Assessment> => getAssessmentFromApi(assessmentId);
export const startAttempt = (
  assessmentId: string,
  _userId: string,
  _attemptNumber: number,
): Promise<AssessmentAttempt> => startAssessmentFromApi(assessmentId);
export const getAttempt = (attemptId: string, _userId?: string): Promise<AssessmentAttempt> => getAssessmentAttemptFromApi(attemptId);
export const getComboState = (attemptId: string, _userId?: string): Promise<ComboState> => getAssessmentComboFromApi(attemptId);
export const listAttemptsForAssessment = (
  assessmentId: string,
  _userId: string,
): Promise<AssessmentAttemptSummary[]> => listAssessmentAttemptsFromApi(assessmentId);
export const submitAnswer = (
  submission: AssessmentSubmission,
  _userId?: string,
): Promise<GradeResult> => submitMcqAnswerFromApi(submission.attempt_id, submission);
export const submitAssessment = (
  attemptId: string,
  _userId?: string,
): Promise<AssessmentSubmittedEvent> => submitAssessmentFromApi(attemptId);
export const reportTelemetry = (
  event: TelemetryEvent,
  _userId?: string,
): Promise<void> => reportAssessmentTelemetryFromApi(event.attempt_id, event);
export const getComboCurve = async (): Promise<{ count: number; multiplier: number }[]> =>
  Array.from({ length: 9 }, (_, count) => ({ count, multiplier: Math.min(3, 1 + count * 0.25) }));

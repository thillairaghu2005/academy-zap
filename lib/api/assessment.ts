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
import { jsonBody, requestJson, segment } from "@/lib/api/client";

export async function listAssessments(): Promise<Assessment[]> {
  return requestJson<Assessment[]>("/api/assessments");
}

export async function getAssessment(assessmentId: string): Promise<Assessment> {
  return requestJson<Assessment>(`/api/assessments/${segment(assessmentId)}`);
}

export async function startAttempt(
  assessmentId: string,
  userId: string,
  attemptNumber: number,
): Promise<AssessmentAttempt> {
  void userId;
  return requestJson<AssessmentAttempt>(
    `/api/assessments/${segment(assessmentId)}/attempts`,
    jsonBody({ attempt_number: attemptNumber }),
  );
}

export async function getAttempt(attemptId: string): Promise<AssessmentAttempt> {
  return requestJson<AssessmentAttempt>(
    `/api/assessments/attempts/${segment(attemptId)}`,
  );
}

export async function submitAnswer(
  submission: AssessmentSubmission,
): Promise<GradeResult> {
  return requestJson<GradeResult>(
    `/api/assessments/attempts/${segment(submission.attempt_id)}/answers`,
    jsonBody(submission),
  );
}

export async function getComboState(attemptId: string): Promise<ComboState> {
  return requestJson<ComboState>(
    `/api/assessments/attempts/${segment(attemptId)}/combo`,
  );
}

export async function getComboCurve(): Promise<
  { count: number; multiplier: number }[]
> {
  return requestJson<{ count: number; multiplier: number }[]>(
    "/api/assessments/combo-curve",
  );
}

export async function listAttemptsForAssessment(
  assessmentId: string,
  userId: string,
): Promise<AssessmentAttemptSummary[]> {
  void userId;
  return requestJson<AssessmentAttemptSummary[]>(
    `/api/assessments/${segment(assessmentId)}/attempts`,
  );
}

export async function submitAssessment(
  attemptId: string,
): Promise<AssessmentSubmittedEvent> {
  return requestJson<AssessmentSubmittedEvent>(
    `/api/assessments/attempts/${segment(attemptId)}/submit`,
    jsonBody({}),
  );
}

export async function reportTelemetry(event: TelemetryEvent): Promise<void> {
  await requestJson<null>(
    `/api/assessments/attempts/${segment(event.attempt_id)}/telemetry`,
    jsonBody(event),
  );
}

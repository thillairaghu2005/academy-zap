import type {
  CodeSubmission,
  JudgeResult,
  Problem,
  SubmissionAccepted,
} from "@/lib/contracts/judge";
import { jsonBody, requestJson, segment } from "@/lib/api/client";

export async function listProblems(): Promise<Problem[]> {
  return requestJson<Problem[]>("/api/judge/problems");
}

export async function listSolvedProblemIds(userId: string): Promise<string[]> {
  void userId;
  return requestJson<string[]>("/api/judge/solved");
}

export async function getProblem(problemId: string): Promise<Problem> {
  return requestJson<Problem>(`/api/judge/problems/${segment(problemId)}`);
}

export async function submit(
  submission: CodeSubmission,
): Promise<SubmissionAccepted> {
  return requestJson<SubmissionAccepted>(
    "/api/judge/submissions",
    jsonBody(submission),
  );
}

export async function getResult(
  submissionId: string,
): Promise<JudgeResult | null> {
  return requestJson<JudgeResult | null>(
    `/api/judge/submissions/${segment(submissionId)}`,
  );
}

export async function listSubmissions(
  problemId: string,
  userId: string,
): Promise<JudgeResult[]> {
  void userId;
  return requestJson<JudgeResult[]>(
    `/api/judge/problems/${segment(problemId)}/submissions`,
  );
}

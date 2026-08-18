import type {
  CodeSubmission,
  JudgeResult,
  Problem,
  SubmissionAccepted,
} from "@/lib/contracts/judge";
import { apiRequest } from "@/lib/api/client";
import { z } from "zod";

export const API_PREFIX =
  typeof window === "undefined"
    ? `${process.env.ZAPSTERS_API_URL ?? "http://127.0.0.1:8000"}/api/v1`
    : `${process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000"}/api/v1`;

export async function listProblems(): Promise<Problem[]> {
  return await apiRequest<Problem[]>("/judge/problems", z.any(), { method: "GET" });
}

export async function listSolvedProblemIds(userId: string): Promise<string[]> {
  return [];
}

export async function getProblem(problemId: string): Promise<Problem> {
  return await apiRequest<Problem>(`/judge/problems/${problemId}`, z.any(), { method: "GET" });
}

export async function submit(
  submission: CodeSubmission,
): Promise<SubmissionAccepted> {
  return await apiRequest<SubmissionAccepted>("/judge/submit", z.any(), {
    method: "POST",
    body: JSON.stringify(submission),
  });
}

export async function getResult(
  submissionId: string,
  userId?: string,
): Promise<JudgeResult | null> {
  try {
    const data = await apiRequest<JudgeResult>(`/judge/submissions/${submissionId}`, z.any(), { method: "GET" });
    return data;
  } catch (err: any) {
    if (err.status === 404) {
      return null;
    }
    throw err;
  }
}

export async function listSubmissions(
  problemId: string,
  userId: string,
): Promise<JudgeResult[]> {
  // The backend might not have this endpoint implemented yet. We'll return an empty array for now.
  return [];
}

// Subscribe to SSE
export function subscribeToJudgeResult(
  submissionId: string,
  onResult: () => void,
): () => void {
  const url = `${API_PREFIX}/judge/submissions/${submissionId}/stream`;
  const es = new EventSource(url, { withCredentials: true });
  
  es.addEventListener("result_ready", () => {
    onResult();
    es.close();
  });
  
  es.addEventListener("error", () => {
    es.close(); // Stop on error
  });
  
  return () => {
    es.close();
  };
}

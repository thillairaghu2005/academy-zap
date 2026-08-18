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

export async function listSolvedProblemIds(_userId: string): Promise<string[]> {
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
  _userId?: string,
): Promise<JudgeResult | null> {
  try {
    const data = await apiRequest<JudgeResult>(`/judge/submissions/${submissionId}`, z.any(), { method: "GET" });
    return data;
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "status" in err &&
      (err as { status?: unknown }).status === 404
    ) {
      return null;
    }
    throw err;
  }
}

export async function listSubmissions(
  _problemId: string,
  _userId: string,
): Promise<JudgeResult[]> {
  // The backend might not have this endpoint implemented yet. We'll return an empty array for now.
  return [];
}

// Subscribe to SSE (F-7): EventSource cannot set an Authorization header, so the
// authenticated API client first exchanges the access token for a short-lived SINGLE-USE
// ticket bound to the submission owner, then opens the stream with the ticket in the URL.
// The ticket is consumed on first use, never reused, and never the access token itself.
export async function subscribeToJudgeResult(
  submissionId: string,
  onResult: () => void,
): Promise<() => void> {
  const ticketResponse = await apiRequest<{ ticket: string }>(
    `/judge/submissions/${submissionId}/ticket`,
    z.any(),
    { method: "POST" },
  );

  const url = `${API_PREFIX}/judge/submissions/${submissionId}/stream?ticket=${encodeURIComponent(ticketResponse.ticket)}`;
  const es = new EventSource(url);

  es.addEventListener("result_ready", () => {
    onResult();
    es.close();
  });

  es.addEventListener("error", () => {
    // Auth failures (replayed/expired ticket) surface here — the caller's TanStack Query
    // polling remains authoritative and simply continues.
    es.close();
  });

  return () => {
    es.close();
  };
}

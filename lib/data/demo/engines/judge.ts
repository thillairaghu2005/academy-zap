import type {
  CodeSubmission,
  JudgeResult,
  Problem,
  SubmissionAccepted,
} from "@/lib/contracts/judge";
import {
  gradeSubmission,
  MOCK_BOOM_PROBLEM_ID,
  MOCK_PROBLEMS,
  MOCK_PROBLEMS_BY_ID,
  mockSubmissions,
  seedSubmissionHistory,
} from "@/lib/mocks/judge";
import { MockDataError } from "@/lib/data/demo/errors";
import { delay, jitter } from "@/lib/data/demo/helpers";
import { recordDemoActivity } from "@/lib/demo/activity";
import { trackDemoEvent } from "@/lib/demo/analytics";

/**
 * Local demo judge service.
 *
 * Signatures mirror the JudgeEngine Protocol (platform §4.1) exactly:
 *   submit(submission: CodeSubmission) -> SubmissionAccepted   # 202, never inline
 *   get_result(submission_id) -> JudgeResult | None            # polled or SSE-pushed
 *
 * The real flow (§5) is: 202 + submission_id → Redis queue → sandboxed run →
 * deterministic grading → result. The mock reproduces the SHAPE (submit
 * returns immediately; getResult returns null until the scripted grader has
 * "finished") without a sandbox. Every verdict literal is reachable through
 * deterministic source markers (see gradeSubmission in lib/mocks/judge.ts).
 *
 * Mock rules (deterministic, demoable):
 *  - problem id "missing-problem" → 404 (detail error state)
 *  - problem id "boom" → 503 on submit (submit error state)
 */

let seeded = false;
function ensureSeeded() {
  if (!seeded) {
    seedSubmissionHistory();
    seeded = true;
  }
}

export async function listProblems(): Promise<Problem[]> {
  await delay(jitter(280));
  ensureSeeded();
  return MOCK_PROBLEMS.map(publicProblem);
}

/** Server-owned solved projection used by the Judge catalog filter. */
export async function listSolvedProblemIds(userId: string): Promise<string[]> {
  await delay(jitter(120));
  if (!userId) return [];
  ensureSeeded();
  return [...mockSubmissions.values()]
    .filter((submission) => submission.user_id === userId && submission.verdict === "accepted")
    .map((submission) => submission.problem_id);
}

export async function getProblem(problemId: string): Promise<Problem> {
  await delay(jitter(240));
  const problem = MOCK_PROBLEMS_BY_ID.get(problemId);
  if (!problem) {
    throw new MockDataError(
      "problem_not_found",
      `Problem ${problemId} was not found.`,
      404,
    );
  }
  return publicProblem(problem);
}

/** Queues a submission — 202 semantics, NEVER graded inline (§5.3). */
export async function submit(
  submission: CodeSubmission,
): Promise<SubmissionAccepted> {
  await delay(jitter(260));
  ensureSeeded();

  if (submission.problem_id === MOCK_BOOM_PROBLEM_ID) {
    throw new MockDataError(
      "judge_down",
      "Judge queue unreachable (simulated).",
      503,
    );
  }
  if (!MOCK_PROBLEMS_BY_ID.has(submission.problem_id)) {
    throw new MockDataError("problem_not_found", "Problem was not found.", 404);
  }

  const submissionId = `sub-${crypto.randomUUID()}`;
  const receivedAt = new Date().toISOString();

  mockSubmissions.set(submissionId, {
    submission: {
      submission_id: submissionId,
      status: "queued",
      received_at: receivedAt,
    },
    problem_id: submission.problem_id,
    user_id: submission.user_id,
    language: submission.language,
    source_code: submission.source_code,
    verdict: null,
    runtime_ms: null,
    memory_kb: null,
    test_cases_passed: null,
    test_cases_total: null,
    stdout: null,
    stderr: null,
    compile_output: null,
    cases: null,
    graded_at: null,
  });

  // Scripted worker: mark graded after ~1.2-2.2s (the mock's "sandbox run").
  // Source containing "queue_hang" simulates a stuck queue: the grade lands
  // after 25s — past the client's 15s timeout — which is the demo path for
  // the queue-hang card and its resume-polling recovery. All other sources
  // grade quickly, exactly like the real judge.
  const hang = submission.source_code.includes("queue_hang");
  const readyAt = Date.now() + (hang ? 25_000 : 1200 + Math.floor(Math.random() * 1000));
  setTimeout(() => {
    const stored = mockSubmissions.get(submissionId);
    if (!stored) return;
    const graded = gradeSubmission(
      submission.source_code,
      MOCK_PROBLEMS_BY_ID.get(submission.problem_id),
    );
    stored.verdict = graded.verdict;
    stored.runtime_ms = graded.runtime_ms;
    stored.memory_kb = graded.memory_kb;
    stored.test_cases_passed = graded.test_cases_passed;
    stored.test_cases_total = graded.test_cases_total;
    stored.stdout = graded.stdout;
    stored.stderr = graded.stderr;
    stored.compile_output = graded.compile_output;
    stored.cases = graded.cases;
    stored.graded_at = new Date().toISOString();
    recordDemoActivity("judge_submitted", `${graded.verdict} on a judge problem`, {
      problem_id: stored.problem_id,
      verdict: graded.verdict ?? "",
    });
    trackDemoEvent("judge_submitted", {
      problem_id: stored.problem_id,
      verdict: graded.verdict ?? "",
    });
  }, readyAt - Date.now());

  return {
    submission_id: submissionId,
    status: "queued",
    received_at: receivedAt,
  };
}

/** Polls a submission — returns null while queued, the result once graded. */
export async function getResult(
  submissionId: string,
  userId?: string,
): Promise<JudgeResult | null> {
  await delay(jitter(160));
  ensureSeeded();
  const stored = mockSubmissions.get(submissionId);
  if (!stored) {
    throw new MockDataError("submission_not_found", "Submission was not found.", 404);
  }
  if (userId && stored.user_id !== userId) {
    throw new MockDataError("submission_not_found", "Submission was not found.", 404);
  }
  if (stored.verdict === null || stored.graded_at === null) {
    return null;
  }
  return {
    submission_id: stored.submission.submission_id,
    problem_id: stored.problem_id,
    verdict: stored.verdict,
    runtime_ms: stored.runtime_ms ?? 0,
    memory_kb: stored.memory_kb ?? 0,
    test_cases_passed: stored.test_cases_passed ?? 0,
    test_cases_total: stored.test_cases_total ?? 0,
    stdout: stored.stdout ?? "",
    stderr: stored.stderr,
    compile_output: stored.compile_output,
    cases: stored.cases ?? undefined,
    graded_at: stored.graded_at,
  };
}

/** Submission history for a problem (newest first). */
export async function listSubmissions(
  problemId: string,
  userId: string,
): Promise<JudgeResult[]> {
  await delay(jitter(220));
  ensureSeeded();
  const results: JudgeResult[] = [];
  for (const stored of mockSubmissions.values()) {
    if (stored.problem_id !== problemId) continue;
    // Seed rows are a demo-only fixture. They are never exposed to another
    // authenticated identity.
    if (stored.user_id !== userId && userId !== "demo-user-001") continue;
    if (stored.verdict === null) continue;
    results.push({
      submission_id: stored.submission.submission_id,
      problem_id: stored.problem_id,
      verdict: stored.verdict,
      runtime_ms: stored.runtime_ms ?? 0,
      memory_kb: stored.memory_kb ?? 0,
      test_cases_passed: stored.test_cases_passed ?? 0,
      test_cases_total: stored.test_cases_total ?? 0,
      stdout: stored.stdout ?? "",
      stderr: stored.stderr,
      compile_output: stored.compile_output,
      cases: stored.cases ?? undefined,
      graded_at: stored.graded_at ?? stored.submission.received_at,
    });
  }
  return results.sort((a, b) =>
    b.graded_at.localeCompare(a.graded_at),
  );
}

function publicProblem(problem: Problem): Problem {
  const { expected_solution: _expectedSolution, ...safeProblem } = problem;
  return safeProblem;
}

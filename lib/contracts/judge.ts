/**
 * Judge Engine contracts (platform doc §2.4, §4.1, §4.3, §5).
 *
 * Locked by the docs:
 *  - JudgeEngine Protocol (§4.1): submit(CodeSubmission) -> SubmissionAccepted
 *    (202 + submission_id, never inline), get_result(submission_id) -> JudgeResult | None
 *    (polled or SSE-pushed).
 *  - JudgeSubmissionGradedEvent (§4.3): the verdict literal + runtime_ms,
 *    memory_kb, test_cases_passed, test_cases_total. Transcribed verbatim.
 *  - Execution flow (§5): queue → sandboxed run → deterministic grading. The
 *    mock mirrors the shape (202 first, result later), never the sandbox.
 *
 * NOT locked by the docs (reasonable decisions, logged in index.ts):
 *  - full `Problem` / `CodeSubmission` field lists (the `problems` /
 *    `submissions` / `test_cases` tables are referenced, not schematized).
 *  - `JudgeResult` carries the raw stdout/stderr (the doc's "never discard
 *    raw" law implies it) plus optional per-case evidence for rich judge UIs.
 */

/** Verdict literals — verbatim from the event schema (§4.3). Do not rename. */
export type Verdict =
  | "accepted"
  | "wrong_answer"
  | "time_limit_exceeded"
  | "runtime_error"
  | "compile_error";

export type ProblemDifficulty = "easy" | "medium" | "hard";

/** Judge engine Phase-1 language slice (build.md F2) — Python only. */
export type JudgeLanguage = "python";

export type SubmissionStatus = "queued" | "graded";

export interface CodeSubmission {
  problem_id: string;
  user_id: string;
  language: JudgeLanguage;
  source_code: string;
}

/** 202 envelope — the request is queued, never executed inline (§5.3). */
export interface SubmissionAccepted {
  submission_id: string;
  status: SubmissionStatus;
  received_at: string;
}

/** Graded result — mirrors JudgeSubmissionGradedEvent + raw output (§4.3, §5.6). */
export interface JudgeResult {
  submission_id: string;
  problem_id: string;
  verdict: Verdict;
  runtime_ms: number;
  memory_kb: number;
  test_cases_passed: number;
  test_cases_total: number;
  /** Raw stdout from the (mock) sandbox run — "never discard raw" law. */
  stdout: string;
  /** Raw stderr, non-null when a case failed / an error was raised. */
  stderr: string | null;
  /** Compiler diagnostics for compile_error verdicts. */
  compile_output: string | null;
  /**
   * Per-case evidence when the judge backend exposes it. Production rollout
   * still needs the grader/API to populate this optional field.
   */
  cases?: Array<{
    index: number;
    status: Verdict;
    hidden: boolean;
    runtime_ms: number;
    memory_kb: number;
    input?: string;
    expected?: string;
    received?: string;
  }>;
  graded_at: string;
}

export interface SampleCase {
  input: string;
  output: string;
  explanation?: string;
}

export interface Problem {
  id: string;
  slug: string;
  title: string;
  difficulty: ProblemDifficulty;
  /** Server-derived catalog signal, not computed from UI interaction. */
  estimated_minutes: number;
  /** Historical accepted-submission percentage from the Judge projection. */
  success_rate_pct: number;
  /** Topic tags, e.g. ["arrays", "two-pointers"] */
  topics: string[];
  /** Authored problem content in Markdown, including optional math notation. */
  statement: string;
  constraints: string[];
  starter_code: string;
  sample_cases: SampleCase[];
  /** Hidden test-case count (the graded total). */
  hidden_test_count: number;
  time_limit_ms: number;
  memory_limit_kb: number;
  /** Deterministic "expected" solution (mock grading reference, not shipped to the judge). */
  expected_solution?: string;
}

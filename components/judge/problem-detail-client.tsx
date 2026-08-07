"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Check,
  Clock,
  Copy,
  Gauge,
  History,
  MessageCircle,
  ShieldQuestion,
  Terminal,
  WandSparkles,
} from "lucide-react";

import type { Problem } from "@/lib/contracts/judge";
import {
  getProblem,
  getResult,
  listSubmissions,
  submit,
} from "@/lib/api/judge";
import { DEMO_MODE } from "@/lib/config";
import { useSession } from "@/components/providers/session-provider";
import { IDE, type IDEExecution } from "@/components/ide/IDE";
import { createIDEFile } from "@/hooks/useFiles";
import {
  VerdictBadge,
} from "@/components/judge/verdict-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageContainer } from "@/components/shared/page-container";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { CodeEditorSkeleton, SkeletonLines } from "@/components/shared/skeletons";
import { cn } from "@/lib/utils";
import { TrustBadge } from "@/components/shared/trust-badge";

/* ------------------------------------------------------------------ */
/*  Judge — problem detail + submit flow (F2)                          */
/*                                                                     */
/*  The flow mirrors the real Judge Engine exactly:                    */
/*    submit() → SubmissionAccepted (202 + submission_id, never inline) */
/*    → poll getResult(submission_id) until it returns a JudgeResult    */
/*    → render the verdict (literal verbatim via VerdictBadge).         */
/*                                                                     */
/*  All five verdict states are reachable with deterministic source     */
/*  markers (see the hint card); the starter code passes cleanly.       */
/* ------------------------------------------------------------------ */

const POLL_INTERVAL_MS = 1100;
const QUEUE_TIMEOUT_S = 15;

function timeAgo(iso: string): string {
  const seconds = Math.max(
    0,
    Math.round((Date.now() - new Date(iso).getTime()) / 1000),
  );
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      onClick={() => {
        void navigator.clipboard?.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
      className="flex items-center gap-1 rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-caption text-muted-foreground transition-colors hover:text-foreground"
      aria-label="Copy to clipboard"
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

/** Statement column — the left half of the split view. */
function StatementPanel({ problem }: { problem: Problem }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-h1">
            {problem.title}
          </h1>
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-caption font-semibold uppercase tracking-wide",
              problem.difficulty === "easy" &&
                "border-border bg-muted/40 text-black",
              problem.difficulty === "medium" &&
                "border-border bg-muted-foreground/20 text-black",
              problem.difficulty === "hard" &&
                "border-black bg-black text-white",
            )}
          >
            {problem.difficulty}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {problem.topics.map((topic) => (
              <Badge key={topic} variant="outline" className="text-caption">
              {topic}
            </Badge>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <TrustBadge kind="security" label="Secure sandbox" detail="Submissions run in an isolated, network-denied judge environment." />
          <TrustBadge kind="verified" label="Deterministic grading" detail="Verdicts come from reproducible test cases, not an AI score." />
          <TrustBadge kind="security" label="Anti-plagiarism review" detail="Similarity checks can flag solutions for review without changing deterministic verdicts." />
        </div>
      </div>

      <div className="flex flex-wrap gap-4 border-y border-border py-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Clock className="size-3.5" />
          Time limit:{" "}
          <span className="font-medium text-foreground">
            {problem.time_limit_ms}ms
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <Gauge className="size-3.5" />
          Memory limit:{" "}
          <span className="font-medium text-foreground">
            {(problem.memory_limit_kb / 1024).toFixed(0)}MB
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <Terminal className="size-3.5" />
          Hidden tests:{" "}
          <span className="font-medium text-foreground">
            {problem.hidden_test_count}
          </span>
        </span>
      </div>

      <div className="prose-sm max-w-none">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {problem.statement}
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-display text-h3">Constraints</h3>
        <ul className="flex flex-col gap-1.5">
          {problem.constraints.map((constraint) => (
            <li
              key={constraint}
              className="flex items-start gap-2 text-sm text-muted-foreground"
            >
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-foreground/60" />
              <code className="text-[13px]">{constraint}</code>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-display text-h3">
          Sample cases
        </h3>
        <div className="flex flex-col gap-3">
          {problem.sample_cases.map((sample, i) => (
            <Card
              key={i}
              className="overflow-hidden border-border/70 shadow-none"
            >
              <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-1.5">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Example {i + 1}
                </span>
                <CopyButton text={`${sample.input}\n→ ${sample.output}`} />
              </div>
              <div className="flex flex-col gap-2 px-3 py-2.5">
                <div className="flex flex-col gap-1">
                  <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
                    Input
                  </span>
                  <pre className="overflow-x-auto rounded-md bg-secondary/60 px-2.5 py-1.5 font-mono text-[12.5px] leading-relaxed">
                    {sample.input}
                  </pre>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
                    Output
                  </span>
                  <pre className="overflow-x-auto rounded-md bg-secondary/60 px-2.5 py-1.5 font-mono text-[12.5px] leading-relaxed">
                    {sample.output}
                  </pre>
                </div>
                {sample.explanation ? (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {sample.explanation}
                  </p>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

/** History — past graded submissions for this problem (mock table read). */
function SubmissionHistory({
  problemId,
  userId,
}: {
  problemId: string;
  userId: string;
}) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["judge-history", problemId],
    queryFn: () => listSubmissions(problemId, userId),
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <History className="size-4 text-muted-foreground" />
        <h2 className="font-display text-small font-semibold">
          Submission history
        </h2>
        {data && data.length > 0 ? (
          <span className="text-xs text-muted-foreground">
            ({data.length})
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-border bg-card p-4">
          <SkeletonLines count={2} />
        </div>
      ) : isError ? (
        <ErrorState
          title="History unavailable"
          message="Could not load the submission history for this problem."
          code="HISTORY_ERR"
          onRetry={() => refetch()}
        />
      ) : !data || data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 px-4 py-6 text-center text-sm text-muted-foreground">
          No submissions yet — your verdicts will appear here.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {data.map((r) => (
            <div
              key={r.submission_id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3.5 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <VerdictBadge verdict={r.verdict} />
                <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
                  {r.submission_id}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-3 font-mono text-[11px] text-muted-foreground">
                <span>
                  {r.test_cases_passed}/{r.test_cases_total}
                </span>
                <span>{r.runtime_ms}ms</span>
                <span className="hidden sm:inline">
                  {timeAgo(r.graded_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProblemDetailClient({ problemId }: { problemId: string }) {
  const { user } = useSession();
  const userId = user?.id;
  const router = useRouter();
  const queryClient = useQueryClient();

  // 1. Problem fetch — 404 (missing-problem) renders a distinct state.
  const problemQuery = useQuery({
    queryKey: ["judge-problem", problemId],
    queryFn: () => getProblem(problemId),
  });

  // 2. Editor state — null means "show starter code"; edits override it.
  const [code, setCode] = React.useState<string | null>(null);
  const [resetKey, setResetKey] = React.useState(0);
  const editorValue = code ?? problemQuery.data?.starter_code ?? "";
  const resetCode = React.useCallback(() => {
    setCode(null);
    setResetKey((current) => current + 1);
  }, []);
  const ideFiles = React.useMemo(
    () => problemQuery.data ? [createIDEFile("solution.py", problemQuery.data.starter_code)] : [],
    [problemQuery.data],
  );
  const handleIDEContentChange = React.useCallback((content: string, file: { path: string } | undefined) => {
    if (file?.path === "solution.py") setCode(content);
  }, []);

  // 3. Submit flow — 202 → poll → verdict (exactly the real shape).
  const [submissionId, setSubmissionId] = React.useState<string | null>(null);
  const [elapsed, setElapsed] = React.useState(0);
  const [timedOut, setTimedOut] = React.useState(false);

  const submitMutation = useMutation({
    mutationFn: (source: string) =>
      submit({
        problem_id: problemId,
        user_id: userId ?? "demo-user",
        language: "python",
        source_code: source,
      }),
    onSuccess: (accepted) => {
      setSubmissionId(accepted.submission_id);
      setElapsed(0);
      setTimedOut(false);
    },
  });

  const resultQuery = useQuery({
    queryKey: ["judge-result", submissionId],
    queryFn: () => getResult(submissionId ?? ""),
    enabled: !!submissionId && !timedOut,
    refetchInterval: (query) => (query.state.data ? false : POLL_INTERVAL_MS),
    retry: false,
  });

  // Elapsed counter + queue-hang guard while the mock "queue" is grading.
  // Both state writes happen inside the interval callback (an external
  // system), never synchronously in the effect body.
  React.useEffect(() => {
    if (!submissionId || resultQuery.data || resultQuery.isError || timedOut)
      return;
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const seconds = Math.round((Date.now() - startedAt) / 1000);
      setElapsed(seconds);
      if (seconds >= QUEUE_TIMEOUT_S) {
        setTimedOut(true);
        window.clearInterval(timer);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [submissionId, resultQuery.data, resultQuery.isError, timedOut]);

  // Once graded, refresh the history list.
  React.useEffect(() => {
    if (resultQuery.data) {
      void queryClient.invalidateQueries({
        queryKey: ["judge-history", problemId],
      });
    }
  }, [resultQuery.data, queryClient, problemId]);

  const judging =
    !!submissionId &&
    !resultQuery.data &&
    !resultQuery.isError &&
    !timedOut;

  const ideExecution = React.useMemo<IDEExecution>(() => {
    if (submitMutation.isPending || judging) return { status: "running", detail: `${submissionId ? "Polling the judge queue" : "Sending your solution"} · ${elapsed}s` };
    if (timedOut) return { status: "runtime_error", detail: `Judge queue timed out after ${QUEUE_TIMEOUT_S}s` };
    if (resultQuery.data) {
      const result = resultQuery.data;
      const status = result.verdict === "accepted" ? "accepted" : result.verdict === "wrong_answer" ? "wrong_answer" : result.verdict === "compile_error" ? "compile_error" : "runtime_error";
      return { status, passed: result.test_cases_passed, total: result.test_cases_total, runtimeMs: result.runtime_ms, memoryMb: result.memory_kb / 1024, xp: status === "accepted" ? 80 : 0, detail: status === "accepted" ? "Deterministic checks complete" : "Open the failing case for a hint" };
    }
    if (submitMutation.isError || resultQuery.isError) return { status: "runtime_error", detail: "The judge could not finish this attempt" };
    return { status: "idle" };
  }, [elapsed, judging, resultQuery.data, resultQuery.isError, submitMutation.isError, submitMutation.isPending, submissionId, timedOut]);

  const canSubmit =
    !submitMutation.isPending &&
    !judging &&
    !problemQuery.isLoading &&
    !problemQuery.isError;

  const handleSubmit = () => {
    if (!userId) {
      router.push(`/login?next=/judge/${problemId}`);
      return;
    }
    if (!canSubmit) return;
    submitMutation.mutate(editorValue);
  };

  /* ---------- Loading ---------- */
  if (problemQuery.isLoading) {
    return (
      <PageContainer>
        <div className="flex flex-col gap-4">
          <SkeletonLines count={2} className="max-w-xl" />
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <SkeletonLines count={5} />
              <SkeletonLines count={3} />
            </div>
            <Card className="h-[520px] overflow-hidden p-0">
              <CodeEditorSkeleton />
            </Card>
          </div>
        </div>
      </PageContainer>
    );
  }

  /* ---------- Error ---------- */
  if (problemQuery.isError || !problemQuery.data) {
    const err = problemQuery.error;
    const is404 =
      err instanceof Error && "status" in err && (err as { status: number }).status === 404;
    return (
      <PageContainer>
        {is404 ? (
          <EmptyState
            icon={ShieldQuestion}
            title="Problem not found"
            description={`No problem exists with the id "${problemId}". It may have been removed or the URL is wrong.`}
          />
        ) : (
          <ErrorState
            title="Problem unavailable"
            message={
              err instanceof Error
                ? err.message
                : "The judge backend is not responding."
            }
            code="JUDGE_ERR"
            onRetry={() => problemQuery.refetch()}
          />
        )}
      </PageContainer>
    );
  }

  const problem = problemQuery.data;

  return (
    <PageContainer>
      <div className="flex flex-col gap-8">
        {/* Challenge context stays available below the focused workspace. */}
        <div className="order-2 flex max-w-4xl flex-col gap-6">
          <StatementPanel problem={problem} />

          <Card className="border-border bg-muted/40">
            <div className="flex items-start gap-3 p-4">
              <MessageCircle className="mt-0.5 size-4 shrink-0 text-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Stuck? Talk to a mentor</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Get a second pair of eyes on your approach before you submit.
                </p>
                <Button variant="link" size="sm" className="mt-2 h-auto px-0" asChild>
                  <Link href="/mentors">Browse mentors</Link>
                </Button>
              </div>
            </div>
          </Card>

          {/* Verdict demo markers — demo scaffolding, gated (never renders in
              a production-shaped build). */}
          {DEMO_MODE ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <WandSparkles className="size-3.5 text-foreground" />
                Verdict demo markers
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Markers, in precedence order:{" "}
                <code className="rounded bg-muted px-1">compile_error</code> →
                compile error ·{" "}
                <code className="rounded bg-muted px-1">sleep(</code> → time
                limit exceeded ·{" "}
                <code className="rounded bg-muted px-1">raise </code> → runtime
                error ·{" "}
                <code className="rounded bg-muted px-1">wrong_answer</code> →
                wrong answer ·{" "}
                <code className="rounded bg-muted px-1">queue_hang</code> →
                queue timeout. The starter code passes cleanly.
              </p>
            </div>
          ) : null}

          <SubmissionHistory problemId={problemId} userId={userId ?? "demo-user"} />
        </div>

        {/* The workspace gets the full content width so all five surfaces remain usable together. */}
        <div className="order-1 flex min-w-0 flex-col gap-4">
          <IDE
            initialFiles={ideFiles}
            storageKey={`ide:judge:${problemId}`}
            problemTitle={problem.title}
            resetKey={resetKey}
            resetContent={problem.starter_code}
            onActiveContentChange={handleIDEContentChange}
            onReset={resetCode}
            execution={ideExecution}
            primaryAction={{
              label: submitMutation.isPending ? "Submitting…" : userId ? "Submit" : "Sign in to submit",
              onClick: handleSubmit,
              disabled: !canSubmit,
            }}
          />

        </div>
      </div>
    </PageContainer>
  );
}

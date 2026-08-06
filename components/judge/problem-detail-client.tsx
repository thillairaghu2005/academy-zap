"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Gauge,
  GitCommitHorizontal,
  History,
  LoaderCircle,
  RotateCcw,
  Send,
  ShieldQuestion,
  Terminal,
  TriangleAlert,
  WandSparkles,
} from "lucide-react";

import type {
  JudgeResult,
  Problem,
  Verdict,
} from "@/lib/contracts/judge";
import {
  getProblem,
  getResult,
  listSubmissions,
  submit,
} from "@/lib/api/judge";
import { DEMO_MODE } from "@/lib/config";
import { useSession } from "@/components/providers/session-provider";
import { EditorShell } from "@/components/judge/editor-shell";
import {
  VerdictBadge,
  verdictLabel,
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

const VERDICT_TONE: Record<
  Verdict,
  { ring: string; icon: typeof CheckCircle2 }
> = {
  accepted: { ring: "border-verdict-accepted/40", icon: CheckCircle2 },
  wrong_answer: { ring: "border-verdict-wrong-answer/40", icon: TriangleAlert },
  time_limit_exceeded: {
    ring: "border-verdict-time-limit-exceeded/40",
    icon: TriangleAlert,
  },
  runtime_error: {
    ring: "border-verdict-runtime-error/40",
    icon: TriangleAlert,
  },
  compile_error: {
    ring: "border-verdict-compile-error/40",
    icon: TriangleAlert,
  },
};

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
                "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
              problem.difficulty === "medium" &&
                "border-amber-500/40 bg-amber-500/10 text-amber-700",
              problem.difficulty === "hard" &&
                "border-rose-500/40 bg-rose-500/10 text-rose-700",
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
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary/60" />
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

/** Verdict panel — rendered once a JudgeResult lands. */
function ResultPanel({ result }: { result: JudgeResult }) {
  const tone = VERDICT_TONE[result.verdict];
  const Icon = tone.icon;
  const passed = result.test_cases_passed;
  const total = result.test_cases_total;
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card p-4",
        tone.ring,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Icon
            className={cn(
              "size-5",
              result.verdict === "accepted"
                ? "text-verdict-accepted"
                : "text-verdict-wrong-answer",
            )}
          />
          <VerdictBadge verdict={result.verdict} />
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">
          {timeAgo(result.graded_at)}
        </span>
      </div>

      {/* Test-case progress */}
      <div>
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Test cases</span>
          <span className="font-mono font-medium">
            {passed} / {total} passed
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={cn(
              "h-full rounded-full",
              result.verdict === "accepted"
                ? "bg-verdict-accepted"
                : "bg-verdict-wrong-answer",
            )}
          />
        </div>
      </div>

      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Clock className="size-3.5" />
          <span className="font-mono">{result.runtime_ms}ms</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Gauge className="size-3.5" />
          <span className="font-mono">{(result.memory_kb / 1024).toFixed(1)}MB</span>
        </span>
      </div>

      {/* Raw output blocks — the "never discard raw" law */}
      {result.stdout ? (
        <OutputBlock label="stdout" text={result.stdout} tone="muted" />
      ) : null}
      {result.stderr ? (
        <OutputBlock label="stderr" text={result.stderr} tone="destructive" />
      ) : null}
      {result.compile_output ? (
        <OutputBlock
          label="compile output"
          text={result.compile_output}
          tone="warning"
        />
      ) : null}
    </motion.div>
  );
}

function OutputBlock({
  label,
  text,
  tone,
}: {
  label: string;
  text: string;
  tone: "muted" | "destructive" | "warning";
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <pre
        className={cn(
          "overflow-x-auto rounded-md border px-3 py-2 font-mono text-[12px] leading-relaxed",
          tone === "muted" &&
            "border-border bg-secondary/40 text-foreground/80",
          tone === "destructive" &&
            "border-destructive/25 bg-destructive/5 text-destructive",
          tone === "warning" &&
            "border-verdict-wrong-answer/25 bg-verdict-wrong-answer/5 text-verdict-wrong-answer",
        )}
      >
        {text}
      </pre>
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
  const editorValue = code ?? problemQuery.data?.starter_code ?? "";
  const resetCode = () => setCode(null);

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
      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* Left: statement */}
        <div className="order-2 flex flex-col gap-6 lg:order-1">
          <StatementPanel problem={problem} />

          {/* Verdict demo markers — demo scaffolding, gated (never renders in
              a production-shaped build). */}
          {DEMO_MODE ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <WandSparkles className="size-3.5 text-primary" />
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

        {/* Right: editor + verdict panel */}
        <div className="order-1 flex flex-col gap-4 lg:order-2 lg:sticky lg:top-20">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  <Terminal className="size-3.5 text-muted-foreground" />
                  solution.py
                </span>
                <Badge variant="secondary" className="text-caption">
                  Python 3
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 px-2 text-xs"
                onClick={resetCode}
                disabled={submitMutation.isPending || judging}
              >
                <RotateCcw className="size-3.5" />
                Reset
              </Button>
            </div>
            <div className="h-[420px]">
              <EditorShell
                value={editorValue}
                onChange={setCode}
                language="python"
              />
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/40 px-4 py-3">
              <p className="hidden text-caption text-muted-foreground sm:block">
                {code !== null
                  ? `${code.split("\n").length} lines edited`
                  : "Editing starter code"}
              </p>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="min-w-32 gap-2"
              >
                {submitMutation.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                {submitMutation.isPending
                  ? "Submitting…"
                  : userId
                    ? "Submit"
                    : "Sign in to submit"}
              </Button>
            </div>
          </Card>

          {/* Status / verdict area */}
          <div className="flex min-h-40 flex-col">
            <AnimatePresence mode="wait">
              {submitMutation.isError ? (
                <motion.div
                  key="submit-error"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <ErrorState
                    title="Submission failed"
                    message={
                      submitMutation.error instanceof Error
                        ? submitMutation.error.message
                        : "The judge queue rejected the submission."
                    }
                    code="SUBMIT_ERR"
                    onRetry={handleSubmit}
                  />
                </motion.div>
              ) : resultQuery.data ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <ResultPanel result={resultQuery.data} />
                  <p className="mt-2 text-center font-mono text-[11px] text-muted-foreground">
                    {verdictLabel(resultQuery.data.verdict)} ·{" "}
                    {resultQuery.data.submission_id}
                  </p>
                </motion.div>
              ) : resultQuery.isError ? (
                <motion.div
                  key="result-error"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <ErrorState
                    title="Result unavailable"
                    message="Could not fetch the grading result for this submission."
                    code="RESULT_ERR"
                    onRetry={() => resultQuery.refetch()}
                  />
                </motion.div>
              ) : timedOut ? (
                <motion.div
                  key="timeout"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <Card className="flex flex-col items-center gap-2 border-destructive/25 bg-destructive/5 p-6 text-center">
                    <TriangleAlert className="size-5 text-destructive" />
                    <p className="text-sm font-semibold">Judge queue timed out</p>
                    <p className="max-w-sm text-xs text-muted-foreground">
                      The submission spent over {QUEUE_TIMEOUT_S}s in the queue
                      without a result — a simulated hang (add{" "}
                      <code className="rounded bg-muted px-1">queue_hang</code>{" "}
                      to the source to demo it). The grade may still be coming;
                      resume polling to keep waiting on this same submission.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        setTimedOut(false);
                        setElapsed(0);
                      }}
                    >
                      <GitCommitHorizontal className="size-3.5" />
                      Resume polling
                    </Button>
                  </Card>
                </motion.div>
              ) : judging ? (
                <motion.div
                  key="judging"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <Card className="flex flex-col items-center gap-3 p-6 text-center">
                    <LoaderCircle className="size-6 animate-spin text-primary" />
                    <div>
                      <p className="text-sm font-semibold">Judging…</p>
                      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        {submissionId} · {elapsed}s in queue
                      </p>
                    </div>
                    <div className="flex h-1 w-40 gap-1">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <motion.span
                          key={i}
                          className="h-full flex-1 rounded-full bg-primary/70"
                          animate={{ opacity: [0.25, 1, 0.25] }}
                          transition={{
                            duration: 1.1,
                            repeat: Infinity,
                            delay: i * 0.12,
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      202 accepted — polling the mock queue for a result…
                    </p>
                  </Card>
                </motion.div>
              ) : !userId ? (
                <motion.div
                  key="sign-in"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <Card className="flex items-center gap-3 border-dashed p-4 text-sm text-muted-foreground">
                    <ShieldQuestion className="size-4 shrink-0" />
                    <span>
                      Sign in to submit — submissions and history are
                      attributed to your account.
                    </span>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <Card className="flex items-center gap-3 border-dashed p-4 text-sm text-muted-foreground">
                    <Send className="size-4 shrink-0 text-primary" />
                    <span>
                      Ready to judge. Submit your solution — the mock queue
                      returns a{" "}
                      <code className="rounded bg-muted px-1">
                        SubmissionAccepted
                      </code>{" "}
                      (202) first, then a{" "}
                      <code className="rounded bg-muted px-1">JudgeResult</code>{" "}
                      when grading finishes.
                    </span>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { History, MessageCircle, ShieldQuestion, WandSparkles } from "lucide-react";

import type { Problem, Verdict } from "@/lib/contracts/judge";
import { getProblem, getResult, listSubmissions, submit } from "@/lib/api/judge";
import { DEMO_MODE } from "@/lib/config";
import { useSession } from "@/components/providers/session-provider";
import { IDE, type IDEExecution } from "@/components/ide/IDE";
import { createIDEFile } from "@/hooks/useFiles";
import { VerdictBadge } from "@/components/judge/verdict-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageContainer } from "@/components/shared/page-container";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { CodeEditorSkeleton, SkeletonLines } from "@/components/shared/skeletons";

const POLL_INTERVAL_MS = 1100;
const QUEUE_TIMEOUT_S = 15;

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** History stays page content, below the focused coding workspace. */
function SubmissionHistory({ problemId, userId }: { problemId: string; userId: string }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["judge-history", problemId],
    queryFn: () => listSubmissions(problemId, userId),
  });

  return (
    <section className="flex flex-col gap-3" aria-labelledby="submission-history-title">
      <div className="flex items-center gap-2">
        <History className="size-4 text-muted-foreground" />
        <h2 id="submission-history-title" className="font-display text-small font-semibold">Submission history</h2>
        {data && data.length > 0 ? <span className="text-xs text-muted-foreground">({data.length})</span> : null}
      </div>
      {isLoading ? (
        <div className="rounded-xl border border-border bg-card p-4"><SkeletonLines count={2} /></div>
      ) : isError ? (
        <ErrorState title="History unavailable" message="Could not load the submission history for this problem." code="HISTORY_ERR" onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 px-4 py-6 text-center text-sm text-muted-foreground">No submissions yet — your verdicts will appear here.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {data.map((result) => (
            <div key={result.submission_id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3.5 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5"><VerdictBadge verdict={result.verdict} /><span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">{result.submission_id}</span></div>
              <div className="flex shrink-0 items-center gap-3 font-mono text-[11px] text-muted-foreground"><span>{result.test_cases_passed}/{result.test_cases_total}</span><span>{result.runtime_ms}ms</span><span className="hidden sm:inline">{timeAgo(result.graded_at)}</span></div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function ProblemDetailClient({
  problemId,
  initialProblem,
}: {
  problemId: string;
  initialProblem?: Problem;
}) {
  const { user } = useSession();
  const userId = user?.id;
  const router = useRouter();
  const queryClient = useQueryClient();
  const problemQuery = useQuery({ queryKey: ["judge-problem", problemId], queryFn: () => getProblem(problemId), initialData: initialProblem });
  const [code, setCode] = React.useState<string | null>(null);
  const [resetKey, setResetKey] = React.useState(0);
  const editorValue = code ?? problemQuery.data?.starter_code ?? "";
  const resetCode = React.useCallback(() => { setCode(null); setResetKey((current) => current + 1); }, []);
  const ideFiles = React.useMemo(() => problemQuery.data ? [createIDEFile("solution.py", problemQuery.data.starter_code)] : [], [problemQuery.data]);
  const handleIDEContentChange = React.useCallback((content: string, file: { path: string } | undefined) => { if (file?.path === "solution.py") setCode(content); }, []);

  const [submissionId, setSubmissionId] = React.useState<string | null>(null);
  const [elapsed, setElapsed] = React.useState(0);
  const [timedOut, setTimedOut] = React.useState(false);
  const submitMutation = useMutation({
    mutationFn: (source: string) => submit({ problem_id: problemId, user_id: userId ?? "demo-user", language: "python", source_code: source }),
    onSuccess: (accepted) => { setSubmissionId(accepted.submission_id); setElapsed(0); setTimedOut(false); },
  });
  const resultQuery = useQuery({
    queryKey: ["judge-result", submissionId],
    queryFn: () => getResult(submissionId ?? ""),
    enabled: !!submissionId && !timedOut,
    refetchInterval: (query) => query.state.data ? false : POLL_INTERVAL_MS,
    retry: false,
  });

  React.useEffect(() => {
    if (!submissionId || resultQuery.data || resultQuery.isError || timedOut) return;
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const seconds = Math.round((Date.now() - startedAt) / 1000);
      setElapsed(seconds);
      if (seconds >= QUEUE_TIMEOUT_S) { setTimedOut(true); window.clearInterval(timer); }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [submissionId, resultQuery.data, resultQuery.isError, timedOut]);

  React.useEffect(() => {
    if (resultQuery.data) void queryClient.invalidateQueries({ queryKey: ["judge-history", problemId] });
  }, [resultQuery.data, queryClient, problemId]);

  const judging = !!submissionId && !resultQuery.data && !resultQuery.isError && !timedOut;
  const ideExecution = React.useMemo<IDEExecution>(() => {
    if (submitMutation.isPending) return { status: "running", detail: `Queued for submission · ${elapsed}s` };
    if (judging) return { status: "running", detail: `${elapsed < 2 ? "Running sandbox" : "Grading cases"} · ${elapsed}s` };
    if (timedOut) return { status: "runtime_error", detail: `Judge queue timed out after ${QUEUE_TIMEOUT_S}s` };
    if (resultQuery.data) {
      const result = resultQuery.data;
      const details: Record<Verdict, string> = {
        accepted: "Deterministic checks complete",
        wrong_answer: "Review the failing case for the first divergence",
        time_limit_exceeded: "The solution exceeded the time limit",
        runtime_error: "The sandbox stopped on a runtime error",
        compile_error: "The judge returned compiler diagnostics",
      };
      return { status: result.verdict, passed: result.test_cases_passed, total: result.test_cases_total, runtimeMs: result.runtime_ms, memoryMb: result.memory_kb / 1024, detail: details[result.verdict], result };
    }
    if (submitMutation.isError || resultQuery.isError) return { status: "runtime_error", detail: "The judge could not finish this attempt" };
    return { status: "idle" };
  }, [elapsed, judging, resultQuery.data, resultQuery.isError, submitMutation.isError, submitMutation.isPending, timedOut]);

  const canSubmit = !submitMutation.isPending && !judging && !problemQuery.isLoading && !problemQuery.isError;
  const handleSubmit = () => {
    if (!userId) { router.push(`/login?next=/judge/${problemId}`); return; }
    if (canSubmit) submitMutation.mutate(editorValue);
  };

  if (problemQuery.isLoading) {
    return <PageContainer><div className="flex flex-col gap-4"><SkeletonLines count={2} className="max-w-xl" /><div className="grid gap-6 lg:grid-cols-2"><div className="flex flex-col gap-4"><SkeletonLines count={5} /><SkeletonLines count={3} /></div><Card className="h-[520px] overflow-hidden p-0"><CodeEditorSkeleton /></Card></div></div></PageContainer>;
  }

  if (problemQuery.isError || !problemQuery.data) {
    const error = problemQuery.error;
    const is404 = error instanceof Error && "status" in error && (error as { status: number }).status === 404;
    return <PageContainer>{is404 ? <EmptyState icon={ShieldQuestion} title="Problem not found" description={`No problem exists with the id "${problemId}". It may have been removed or the URL is wrong.`} /> : <ErrorState title="Problem unavailable" message={error instanceof Error ? error.message : "The judge backend is not responding."} code="JUDGE_ERR" onRetry={() => problemQuery.refetch()} />}</PageContainer>;
  }

  const problem = problemQuery.data;
  return (
    <PageContainer>
      <div className="flex flex-col gap-8">
        <IDE initialFiles={ideFiles} storageKey={`ide:judge:${problemId}`} problem={problem} problemTitle={problem.title} resetKey={resetKey} resetContent={problem.starter_code} onActiveContentChange={handleIDEContentChange} onReset={resetCode} execution={ideExecution} primaryAction={{ label: submitMutation.isPending ? "Submitting..." : userId ? "Submit" : "Sign in to submit", onClick: handleSubmit, disabled: !canSubmit }} />
        <div className="flex flex-col gap-6">
          <Card className="border-border bg-muted/40"><div className="flex items-start gap-3 p-4"><MessageCircle className="mt-0.5 size-4 shrink-0 text-foreground" /><div className="min-w-0 flex-1"><p className="text-sm font-semibold">Stuck? Talk to a mentor</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Get a second pair of eyes on your approach before you submit.</p><Button variant="link" size="sm" className="mt-2 h-auto px-0" asChild><Link href="/mentors">Browse mentors</Link></Button></div></div></Card>
          {DEMO_MODE ? <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3"><p className="flex items-center gap-1.5 text-xs font-semibold text-foreground"><WandSparkles className="size-3.5" />Verdict demo markers</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Markers, in precedence order: <code className="rounded bg-muted px-1">compile_error</code> → compile error · <code className="rounded bg-muted px-1">sleep(</code> → time limit exceeded · <code className="rounded bg-muted px-1">raise </code> → runtime error · <code className="rounded bg-muted px-1">wrong_answer</code> → wrong answer · <code className="rounded bg-muted px-1">queue_hang</code> → queue timeout.</p></div> : null}
          <SubmissionHistory problemId={problemId} userId={userId ?? "demo-user"} />
        </div>
      </div>
    </PageContainer>
  );
}

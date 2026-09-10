"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Trophy, Clock, Zap, Target } from "lucide-react";

import type { JudgeLanguage, Problem, Verdict } from "@/lib/contracts/judge";
import { getProblem, getResult, submit } from "@/lib/data/judge-facade";
import { JUDGE_LANGUAGE_CONFIG, isJudgeLanguage } from "@/lib/judge-language-config";
import { useSession } from "@/components/providers/session-provider";
import { IDE, type IDEExecution } from "@/components/ide/IDE";
import { createIDEFile } from "@/hooks/useFiles";
import { ComboMeter } from "@/components/assessments/combo-meter";
import { PageContainer } from "@/components/shared/page-container";
import { Card } from "@/components/ui/card";
import { CodeEditorSkeleton, SkeletonLines } from "@/components/shared/skeletons";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";

const POLL_INTERVAL_MS = 1100;
const QUEUE_TIMEOUT_S = 15;
const CONTEST_DURATION_S = 3600; // 1 hour

export function ContestClient({
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
  
  // Time remaining
  const [timeLeft, setTimeLeft] = React.useState(CONTEST_DURATION_S);
  React.useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);
  
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const problemQuery = useQuery({ queryKey: ["judge-problem", problemId], queryFn: () => getProblem(problemId), initialData: initialProblem });
  const codeRef = React.useRef(initialProblem?.starter_code ?? "");
  const languageRef = React.useRef<JudgeLanguage>("python");
  const [resetKey, setResetKey] = React.useState(0);
  const resetCode = React.useCallback(() => { setResetKey((current) => current + 1); }, []);
  const ideFiles = React.useMemo(() => problemQuery.data ? [createIDEFile(JUDGE_LANGUAGE_CONFIG.python.filename, problemQuery.data.starter_code)] : [], [problemQuery.data]);
  const handleIDEContentChange = React.useCallback((content: string, file: { path: string; language?: string } | undefined) => {
    codeRef.current = content;
    if (isJudgeLanguage(file?.language)) languageRef.current = file.language;
  }, []);

  const [submissionId, setSubmissionId] = React.useState<string | null>(null);
  const [elapsed, setElapsed] = React.useState(0);
  const [timedOut, setTimedOut] = React.useState(false);
  
  // Mock combos
  const [combo, setCombo] = React.useState(1);
  const [comboMultiplier, setComboMultiplier] = React.useState(1.0);

  const submitMutation = useMutation({
    mutationFn: ({ source, language }: { source: string; language: JudgeLanguage }) => submit({ problem_id: problemId, user_id: userId ?? "demo-user", language, source_code: source }),
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
    if (resultQuery.data?.verdict === "accepted") {
      setCombo(prev => Math.min(prev + 1, 5));
      setComboMultiplier(prev => Math.min(prev + 0.2, 2.0));
    } else if (resultQuery.data) {
      setCombo(1);
      setComboMultiplier(1.0);
    }
  }, [resultQuery.data]);

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

  const canSubmit = !submitMutation.isPending && !judging && !problemQuery.isLoading && !problemQuery.isError && timeLeft > 0;
  const handleSubmit = () => {
    if (!userId) { router.push(`/login?next=/judge/contests/${problemId}`); return; }
    if (canSubmit) submitMutation.mutate({ source: codeRef.current, language: languageRef.current });
  };

  if (problemQuery.isLoading) {
    return <PageContainer><div className="flex flex-col gap-4"><SkeletonLines count={2} className="max-w-xl" /><div className="grid gap-6 lg:grid-cols-2"><div className="flex flex-col gap-4"><SkeletonLines count={5} /><SkeletonLines count={3} /></div><Card className="h-[520px] overflow-hidden p-0"><CodeEditorSkeleton /></Card></div></div></PageContainer>;
  }

  if (problemQuery.isError || !problemQuery.data) {
    return <PageContainer><ErrorState title="Problem unavailable" message="The judge demo data is unavailable." code="JUDGE_ERR" onRetry={() => problemQuery.refetch()} /></PageContainer>;
  }

  const problem = problemQuery.data;
  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display font-semibold">Weekly Contest 42</h2>
              <p className="text-xs text-muted-foreground">3 Problems • Ends in {formatTime(timeLeft)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <ComboMeter combo={combo} multiplier={comboMultiplier} size="sm" />
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5 text-xl font-mono font-bold">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className={timeLeft < 60 ? "text-destructive" : ""}>{formatTime(timeLeft)}</span>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Remaining</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">
          <div className="flex flex-col gap-6">
            <IDE 
              initialFiles={ideFiles} 
              storageKey={`ide:contest:${problemId}`} 
              problem={problem} 
              problemTitle={problem.title} 
              resetKey={resetKey} 
              resetContent={problem.starter_code} 
              onActiveContentChange={handleIDEContentChange} 
              onReset={resetCode} 
              execution={ideExecution} 
              primaryAction={{ 
                label: timeLeft <= 0 ? "Time's Up" : submitMutation.isPending ? "Submitting..." : userId ? "Submit" : "Sign in to submit", 
                onClick: handleSubmit, 
                disabled: !canSubmit 
              }} 
            />
          </div>

          <div className="flex flex-col gap-4">
            <Card className="flex flex-col p-4 border-border bg-card">
              <h3 className="font-display text-sm font-semibold mb-4">Live Leaderboard</h3>
              <div className="flex flex-col gap-3">
                {[
                  { rank: 1, name: "tourist", score: 100, time: "12m 4s" },
                  { rank: 2, name: "benq", score: 100, time: "14m 22s" },
                  { rank: 3, name: "jiangly", score: 100, time: "15m 01s" },
                  { rank: 4, name: "ksun48", score: 100, time: "15m 45s" },
                  { rank: 5, name: "radewoosh", score: 100, time: "16m 12s" },
                ].map((user) => (
                  <div key={user.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-4 text-right text-xs font-mono text-muted-foreground">{user.rank}</span>
                      <span className="text-sm font-medium">{user.name}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-semibold">{user.score} pt</span>
                      <span className="text-[10px] text-muted-foreground">{user.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

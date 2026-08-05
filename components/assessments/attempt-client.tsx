"use client";

import * as React from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Code2,
  Flag,
  ListChecks,
  LoaderCircle,
  Lock,
  PenLine,
  RotateCcw,
  Send,
  ShieldAlert,
  TimerReset,
  XCircle,
} from "lucide-react";

import type {
  Assessment,
  GradeResult,
  TelemetryType,
} from "@/lib/contracts/assessment";
import {
  getAssessment,
  getAttempt,
  getComboState,
  reportTelemetry,
  submitAnswer,
  submitAssessment,
} from "@/lib/api/assessment";
import { useSession } from "@/components/providers/session-provider";
import { EditorShell } from "@/components/judge/editor-shell";
import { ComboMeter } from "@/components/assessments/combo-meter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { PageContainer } from "@/components/shared/page-container";
import { ErrorState } from "@/components/shared/error-state";
import { SkeletonLines } from "@/components/shared/skeletons";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Assessment attempt — the live F4 surface.                          */
/*                                                                     */
/*  Flow: one question at a time → submitAnswer() (deterministic       */
/*  server grading) → GradeResult feedback + combo tick → next.        */
/*  Final submit → assessment.submitted event shape.                   */
/*                                                                     */
/*  Anti-cheat: tab-visibility + paste events captured on mount and    */
/*  pushed to reportTelemetry() (console-logged in mock; Integrity     */
/*  Gate later). Timer expiry is enforced server-side in getAttempt.   */
/* ------------------------------------------------------------------ */

const COMBO_POLL_MS = 2000;

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0:00";
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function QuestionTypeBadge({ type }: { type: Assessment["questions"][number]["type"] }) {
  const meta =
    type === "mcq"
      ? { label: "Multiple choice", icon: ListChecks }
      : type === "short_answer"
        ? { label: "Short answer", icon: PenLine }
        : { label: "Coding question", icon: Code2 };
  return (
    <Badge variant="outline" className="gap-1 text-[10px]">
      <meta.icon className="size-3" />
      {meta.label}
    </Badge>
  );
}

/* ---------- Summary screen (assessment.submitted) ---------- */

function AttemptSummary({
  event,
  passed,
}: {
  event: {
    score: number;
    total_score: number;
    correct_count: number;
    question_count: number;
    time_taken_seconds: number;
    max_combo: number;
    integrity_flags: string[];
  };
  passed: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex max-w-lg flex-col items-center gap-5 py-10 text-center"
    >
      <div
        className={cn(
          "grid size-16 place-items-center rounded-2xl border",
          passed
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
            : "border-amber-500/40 bg-amber-500/10 text-amber-500",
        )}
      >
        {passed ? <CheckCircle2 className="size-8" /> : <RotateCcw className="size-8" />}
      </div>
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight">
          {passed ? "Assessment passed" : "Keep at it"}
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {passed
            ? "Your result has been recorded — the assessment.submitted event is on its way to the gamification engine."
            : "You didn't hit the passing threshold this attempt. Review the feedback and try again."}
        </p>
      </div>

      <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
        <SummaryStat label="Score" value={`${event.score}/${event.total_score}`} />
        <SummaryStat label="Correct" value={`${event.correct_count}/${event.question_count}`} />
        <SummaryStat label="Time" value={`${Math.floor(event.time_taken_seconds / 60)}m ${event.time_taken_seconds % 60}s`} />
        <SummaryStat label="Max combo" value={`${event.max_combo}×`} />
        <SummaryStat label="Flags" value={String(event.integrity_flags.length)} />
        <SummaryStat label="Status" value={passed ? "passed" : "attempted"} />
      </div>

      {event.integrity_flags.length > 0 ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldAlert className="size-3.5 text-amber-500" />
          {event.integrity_flags.length} anti-cheat{" "}
          {event.integrity_flags.length === 1 ? "event" : "events"} captured this
          attempt (reviewed by the Integrity Gate in prod).
        </p>
      ) : null}

      <Button asChild>
        <Link href="/assessments">Back to assessments</Link>
      </Button>
    </motion.div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card px-3 py-2.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="font-mono text-sm font-medium">{value}</span>
    </div>
  );
}

/* ---------- Attempt ---------- */

export function AssessmentAttemptClient({
  assessmentId,
  attemptId,
}: {
  assessmentId: string;
  attemptId: string;
}) {
  const { user } = useSession();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();

  const refreshAttempt = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["attempt", attemptId] });
  }, [queryClient, attemptId]);

  // Light polling while the attempt is live — keeps the answered counter and
  // expiry state in sync with the server (same pattern as the lab client).
  const attemptQuery = useQuery({
    queryKey: ["attempt", attemptId],
    queryFn: () => getAttempt(attemptId),
    refetchInterval: (query) =>
      query.state.data?.status === "in_progress" ? 8000 : false,
  });
  const attempt = attemptQuery.data;

  const assessmentQuery = useQuery({
    queryKey: ["assessment", attempt?.assessment_id ?? assessmentId],
    queryFn: () => getAssessment(attempt?.assessment_id ?? assessmentId),
    enabled: !!attempt,
  });
  const assessment = assessmentQuery.data;

  // Timer tick — Date.now() must not run during render (purity rule). The
  // tick also refreshes the attempt when the countdown crosses zero so the
  // server-side expiry transition surfaces as the "Time's up" state.
  const [nowMs, setNowMs] = React.useState(() => Date.now());
  React.useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Question index + answer state.
  const [index, setIndex] = React.useState(0);
  const [draft, setDraft] = React.useState<
    | { type: "mcq"; option_index: number }
    | { type: "short_answer"; text: string }
    | { type: "code"; source_code: string }
    | null
  >(null);
  const [lastResult, setLastResult] = React.useState<GradeResult | null>(null);
  const [combo, setCombo] = React.useState({ count: 0, multiplier: 1, best: 0 });

  const [summary, setSummary] = React.useState<{
    score: number;
    total_score: number;
    correct_count: number;
    question_count: number;
    time_taken_seconds: number;
    max_combo: number;
    integrity_flags: string[];
  } | null>(null);

  // Server-derived combo polling (SSE-shaped preview, §7.6).
  React.useEffect(() => {
    if (!attemptId) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      try {
        const state = await getComboState(attemptId);
        if (!cancelled) setCombo(state);
      } catch {
        /* attempt closed — ignore, terminal states handle it */
      }
    };
    void tick();
    const timer = window.setInterval(tick, COMBO_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [attemptId]);

  // Anti-cheat telemetry hooks (build.md F4) — capture now, Integrity Gate later.
  React.useEffect(() => {
    if (!attemptId) return;
    const fire = (type: TelemetryType, detail: string) => {
      void reportTelemetry({
        attempt_id: attemptId,
        type,
        detail,
        occurred_at: new Date().toISOString(),
      });
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        fire("tab_visibility", "tab hidden during assessment");
      }
    };
    const onPaste = (e: ClipboardEvent) => {
      fire("paste", `paste event (${e.clipboardData?.getData("text").length ?? 0} chars)`);
    };
    const onBlur = () => fire("focus_blur", "window lost focus");
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("paste", onPaste);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("paste", onPaste);
      window.removeEventListener("blur", onBlur);
    };
  }, [attemptId]);

  const gradeMutation = useMutation({
    mutationFn: (answer: NonNullable<typeof draft>) => {
      if (!attempt || !assessment) throw new Error("Attempt not ready");
      const question = assessment.questions[index];
      if (!question) throw new Error("Question not found");
      const timeSpentMs =
        (Date.now() - new Date(attempt.started_at).getTime()) /
        Math.max(1, assessment.questions.length);
      return submitAnswer({
        attempt_id: attemptId,
        question_id: question.id,
        user_id: userId,
        type: question.type,
        answer,
        time_spent_ms: Math.round(timeSpentMs),
      });
    },
    onSuccess: (result) => {
      setLastResult(result);
      setCombo(result.combo);
      setDraft(null);
      // CRITICAL: re-read the attempt server-side so answers/score/counter
      // refresh — otherwise the answered counter stays stale and the final
      // submit gate never opens.
      refreshAttempt();
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: () => submitAssessment(attemptId),
    onSuccess: (event) => {
      setSummary(event);
      void attemptQuery.refetch();
    },
  });

  /* ---------- Loading ---------- */
  if (attemptQuery.isLoading || (attempt && assessmentQuery.isLoading)) {
    return (
      <PageContainer>
        <SkeletonLines count={2} className="max-w-md" />
        <div className="mt-6">
          <Card className="p-6">
            <SkeletonLines count={5} />
          </Card>
        </div>
      </PageContainer>
    );
  }

  /* ---------- Error / 404 ---------- */
  if (attemptQuery.isError || !attempt) {
    const err = attemptQuery.error;
    const is404 =
      err instanceof Error && "status" in err && (err as { status: number }).status === 404;
    return (
      <PageContainer>
        <ErrorState
          title={is404 ? "Attempt not found" : "Attempt unavailable"}
          message={
            is404
              ? "This attempt does not exist. Start a fresh attempt from the assessment page."
              : err instanceof Error
                ? err.message
                : "The assessment engine is not responding."
          }
          code={is404 ? "ATTEMPT_404" : "ATTEMPT_ERR"}
          onRetry={() => attemptQuery.refetch()}
        />
      </PageContainer>
    );
  }

  if (!assessment) {
    return (
      <PageContainer>
        <ErrorState
          title="Assessment unavailable"
          message="The assessment definition could not be loaded."
          code="ASSESS_ERR"
          onRetry={() => assessmentQuery.refetch()}
        />
      </PageContainer>
    );
  }

  /* ---------- Summary (submitted) ---------- */
  if (summary || attempt.status === "submitted") {
    const totalScore = assessment.questions.reduce(
      (sum, q) => sum + (q.difficulty === "hard" ? 25 : q.difficulty === "medium" ? 15 : 10),
      0,
    );
    const event = summary ?? {
      score: attempt.score,
      total_score: totalScore,
      correct_count: attempt.answers.filter((a) => a.correct).length,
      question_count: assessment.questions.length,
      time_taken_seconds: Math.max(
        0,
        Math.round(
          (new Date(attempt.submitted_at ?? attempt.expires_at).getTime() -
            new Date(attempt.started_at).getTime()) /
            1000,
        ),
      ),
      max_combo: 0,
      integrity_flags: attempt.integrity_flags,
    };
    return (
      <PageContainer>
        <AttemptSummary
          event={event}
          passed={(event.score / event.total_score) * 100 >= assessment.passing_percent}
        />
      </PageContainer>
    );
  }

  /* ---------- Expired ---------- */
  if (attempt.status === "expired") {
    return (
      <PageContainer>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto flex max-w-md flex-col items-center gap-4 py-12 text-center"
        >
          <div className="grid size-14 place-items-center rounded-2xl border border-amber-500/40 bg-amber-500/10 text-amber-500">
            <TimerReset className="size-7" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold">Time&apos;s up</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              The attempt hit its time limit and was auto-submitted with the
              answers captured so far (server-enforced).
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/assessments/${assessment.id}`}>Review assessment</Link>
          </Button>
        </motion.div>
      </PageContainer>
    );
  }

  const question = assessment.questions[index];
  if (!question) {
    return (
      <PageContainer>
        <ErrorState
          title="No question here"
          message="This question could not be loaded."
          code="Q_ERR"
          onRetry={() => attemptQuery.refetch()}
        />
      </PageContainer>
    );
  }

  const remainingMs = Math.max(
    0,
    new Date(attempt.expires_at).getTime() - nowMs,
  );
  const low = remainingMs < 5 * 60_000;
  const answeredCount = attempt.answers.length;
  const allAnswered = answeredCount >= assessment.questions.length;
  const canSubmitAnswer =
    !!draft &&
    !gradeMutation.isPending &&
    attempt.status === "in_progress" &&
    // Empty short-answer drafts don't count as an answer.
    (draft.type !== "short_answer" || draft.text.trim() !== "");

  const handleSubmitAnswer = () => {
    if (!canSubmitAnswer || !draft) return;
    gradeMutation.mutate(draft);
  };

  const goNext = () => {
    setLastResult(null);
    setIndex((i) => Math.min(assessment.questions.length - 1, i + 1));
  };

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2" asChild>
            <Link href="/assessments">
              <ArrowLeft className="size-4" />
              Assessments
            </Link>
          </Button>
          <div>
            <h1 className="font-display text-lg font-bold tracking-tight">
              {assessment.title}
            </h1>
            <p className="font-mono text-[11px] text-muted-foreground">
              attempt #{attempt.attempt_number} · {attempt.attempt_id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1.5 text-[10px]">
            <ClipboardCheck className="size-3" />
            {answeredCount}/{assessment.questions.length} answered
          </Badge>
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-sm font-semibold tabular-nums",
              low
                ? "border-amber-500/40 bg-amber-500/10 text-amber-600"
                : "border-border bg-muted/50",
            )}
            title="Time remaining"
          >
            <Clock className="size-3.5" />
            {formatCountdown(remainingMs)}
          </div>
        </div>
      </div>

      {/* Combo meter */}
      <div className="mt-5">
        <ComboMeter combo={combo} />
      </div>

      {/* Question */}
      <div className="mt-5 grid items-start gap-4 lg:grid-cols-[1fr_280px]">
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-full bg-primary/10 font-mono text-sm font-semibold text-primary">
                {index + 1}
              </span>
              <span className="text-sm font-medium">
                Question {index + 1} of {assessment.questions.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <QuestionTypeBadge type={question.type} />
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 font-mono text-[10px]",
                  question.difficulty === "easy" &&
                    "border-emerald-500/40 bg-emerald-500/10 text-emerald-600",
                  question.difficulty === "medium" &&
                    "border-amber-500/40 bg-amber-500/10 text-amber-600",
                  question.difficulty === "hard" &&
                    "border-rose-500/40 bg-rose-500/10 text-rose-600",
                )}
              >
                {question.difficulty}
              </span>
            </div>
          </div>

          <div className="pt-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {question.prompt}
            </p>

            {/* Question input by type */}
            <div className="mt-5">
              {question.type === "mcq" && question.options ? (
                <div className="flex flex-col gap-2">
                  {question.options.map((option, i) => {
                    const selected = draft?.type === "mcq" && draft.option_index === i;
                    return (
                      <button
                        key={i}
                        onClick={() =>
                          setDraft({ type: "mcq", option_index: i })
                        }
                        className={cn(
                          "flex items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all",
                          selected
                            ? "border-primary/60 bg-primary/10"
                            : "border-border hover:border-primary/40 hover:bg-muted/30",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border font-mono text-[11px]",
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border text-muted-foreground",
                          )}
                        >
                          {String.fromCharCode(65 + i)}
                        </span>
                        {option}
                      </button>
                    );
                  })}
                </div>
              ) : question.type === "short_answer" ? (
                <Textarea
                  placeholder="Type your answer…"
                  value={draft?.type === "short_answer" ? draft.text : ""}
                  onChange={(e) => setDraft({ type: "short_answer", text: e.target.value })}
                  className="min-h-24"
                />
              ) : (
                <div className="overflow-hidden rounded-lg border border-border">
                  <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
                    <span className="flex items-center gap-1.5 text-xs font-medium">
                      <Code2 className="size-3.5 text-muted-foreground" />
                      solution.py
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      graded by the Judge Engine
                    </span>
                  </div>
                  <div className="h-64">
                    <EditorShell
                      value={draft?.type === "code" ? draft.source_code : question.starter_code ?? ""}
                      onChange={(v) => setDraft({ type: "code", source_code: v })}
                      language="python"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Grade feedback */}
            <AnimatePresence mode="wait">
              {gradeMutation.isError ? (
                <motion.div
                  key="err"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-xs text-destructive">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                    <span>
                      {gradeMutation.error instanceof Error
                        ? gradeMutation.error.message
                        : "Grading failed."}
                    </span>
                  </div>
                </motion.div>
              ) : lastResult ? (
                <motion.div
                  key={`r-${index}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    "mt-4 flex items-start gap-3 rounded-lg border p-4",
                    lastResult.correct
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-rose-500/30 bg-rose-500/5",
                  )}
                >
                  {lastResult.correct ? (
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" />
                  ) : (
                    <XCircle className="mt-0.5 size-5 shrink-0 text-rose-500" />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        lastResult.correct
                          ? "text-emerald-400"
                          : "text-rose-400",
                      )}
                    >
                      {lastResult.correct
                        ? `Correct! +${lastResult.score} pts`
                        : "Incorrect"}
                    </p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {lastResult.feedback}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={goNext}
                  >
                    {index + 1 >= assessment.questions.length
                      ? "Finish"
                      : "Next"}
                    <ArrowRight className="ml-1 size-3.5" />
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 flex items-center justify-between"
                >
                  <p className="text-[11px] text-muted-foreground">
                    {lastResult ? "" : "Your answer is graded deterministically, server-side."}
                  </p>
                  <Button
                    onClick={handleSubmitAnswer}
                    disabled={!canSubmitAnswer}
                    className="gap-2"
                  >
                    {gradeMutation.isPending ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    {gradeMutation.isPending ? "Grading…" : "Submit answer"}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>

        {/* Right rail */}
        <div className="flex flex-col gap-4">
          {/* Progress dots */}
          <Card className="p-4">
            <h3 className="font-display text-sm font-semibold">Progress</h3>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {assessment.questions.map((q, i) => {
                const isAnswered = attempt.answers.some((a) => a.question_id === q.id);
                const isCurrent = i === index;
                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setLastResult(null);
                      setIndex(i);
                    }}
                    aria-label={`Go to question ${i + 1}`}
                    className={cn(
                      "size-6 rounded-md border font-mono text-[10px] transition-colors",
                      isAnswered
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40",
                      isCurrent && "ring-2 ring-primary/30",
                    )}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Final submit */}
          <Card className="flex flex-col gap-3 p-4">
            <h3 className="flex items-center gap-2 font-display text-sm font-semibold">
              <Flag className="size-4 text-muted-foreground" />
              Finalize
            </h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {allAnswered
                ? "Every question is answered. Submit to record your result."
                : `Answer all ${assessment.questions.length} questions to submit (${answeredCount} done).`}
            </p>
            <Button
              onClick={() => finalizeMutation.mutate()}
              disabled={!allAnswered || finalizeMutation.isPending}
              className="w-full gap-2"
            >
              {finalizeMutation.isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <ClipboardCheck className="size-4" />
              )}
              {finalizeMutation.isPending ? "Submitting…" : "Submit assessment"}
            </Button>
            {finalizeMutation.isError ? (
              <p className="flex items-start gap-1.5 text-xs text-destructive">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                {finalizeMutation.error instanceof Error
                  ? finalizeMutation.error.message
                  : "Could not submit."}
              </p>
            ) : null}
            <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <Lock className="mt-0.5 size-3 shrink-0" />
              Tab-switches and paste events are captured as anti-cheat
              telemetry.
            </p>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}

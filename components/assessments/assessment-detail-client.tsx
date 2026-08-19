"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { m as motion } from "framer-motion";
import {
  AlertTriangle,
  Clock,
  Code2,
  Flame,
  Gauge,
  ListChecks,
  LoaderCircle,
  Lock,
  PenLine,
  Play,
  RotateCcw,
  ShieldAlert,
  ShieldQuestion,
  Sparkles,
} from "lucide-react";

import type { Assessment, QuestionType } from "@/lib/contracts/assessment";
import { getAssessment, startAttempt } from "@/lib/data/demo/assessment";
import { AUTH_MODE } from "@/lib/config";
import { useSession } from "@/components/providers/session-provider";
import { ComboCurveTeaser } from "@/components/assessments/combo-curve-teaser";
import { AttemptsTracker } from "@/components/assessments/attempts-tracker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageContainer } from "@/components/shared/page-container";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SkeletonLines } from "@/components/shared/skeletons";
import { cn } from "@/lib/utils";

const TYPE_META: Record<QuestionType, { label: string; icon: typeof Code2 }> = {
  mcq: { label: "Multiple choice", icon: ListChecks },
  short_answer: { label: "Short answer", icon: PenLine },
  code: { label: "Coding question", icon: Code2 },
};

const DIFF_POINTS: Record<Assessment["questions"][number]["difficulty"], number> = {
  easy: 10,
  medium: 15,
  hard: 25,
};

export function AssessmentDetailClient({
  assessmentId,
}: {
  assessmentId: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useSession();

  const assessmentQuery = useQuery({
    queryKey: ["assessment", assessmentId],
    queryFn: () => getAssessment(assessmentId),
  });

  const start = useMutation({
    mutationFn: () =>
      startAttempt(assessmentId, user?.id ?? "", 1).then((attempt) => {
        router.push(`/assessments/${assessmentId}/attempt/${attempt.attempt_id}`);
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["assessment", assessmentId] });
    },
  });

  /* ---------- Loading ---------- */
  if (assessmentQuery.isLoading) {
    return (
      <PageContainer>
        <SkeletonLines count={2} className="max-w-xl" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <SkeletonLines count={6} />
          <Card className="h-56 p-4">
            <SkeletonLines count={3} />
          </Card>
        </div>
      </PageContainer>
    );
  }

  /* ---------- Error / 404 ---------- */
  if (assessmentQuery.isError || !assessmentQuery.data) {
    const err = assessmentQuery.error;
    const is404 =
      err instanceof Error &&
      "status" in err &&
      (err as { status: number }).status === 404;
    return (
      <PageContainer>
        {is404 ? (
          <EmptyState
            icon={ShieldQuestion}
            title="Assessment not found"
            description={`No assessment exists with the id "${assessmentId}". It may have been unpublished or the URL is wrong.`}
            action={
              <Button variant="outline" size="sm" asChild>
                <Link href="/assessments">Browse assessments</Link>
              </Button>
            }
          />
        ) : (
          <ErrorState
            title="Assessment unavailable"
            message={
              err instanceof Error
                ? err.message
                : "The assessment is unavailable."
            }
            onRetry={() => assessmentQuery.refetch()}
          />
        )}
      </PageContainer>
    );
  }

  const assessment = assessmentQuery.data;
  // The backend slice grades MCQ only; the demo service also grades short-answer and code
  // questions deterministically (slice 03 §6), so the gate applies to backend mode alone.
  const mcqOnly = assessment.questions.every((question) => question.type === "mcq");
  const startDisabledByFormat = AUTH_MODE === "backend" && !mcqOnly;
  const totalPoints = assessment.questions.reduce(
    (sum, q) => sum + DIFF_POINTS[q.difficulty],
    0,
  );

  return (
    <PageContainer>
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        {/* Left — description + question list */}
        <div className="flex flex-col gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-warning-strong">
                {assessment.category}
              </span>
              <Badge variant="outline" className="font-mono text-[10px]">
                v{assessment.version}
              </Badge>
              <Badge
                variant="secondary"
                className="gap-1 text-caption text-success-strong"
              >
                <Flame className="size-3" />
                combo meter active
              </Badge>
            </div>
            <h1 className="mt-1.5 font-display text-h1">
              {assessment.title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {assessment.description}
            </p>
          </div>

          <div className="flex flex-wrap gap-4 border-y border-border py-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              Time limit:{" "}
              <span className="font-medium text-foreground">
                {assessment.estimated_minutes} min
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <Gauge className="size-3.5" />
              Passing:{" "}
              <span className="font-medium text-foreground">
                {assessment.passing_percent}%
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <RotateCcw className="size-3.5" />
              Attempts:{" "}
              <span className="font-medium text-foreground">
                {assessment.attempts_allowed}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="size-3.5" />
              Max score:{" "}
              <span className="font-medium text-foreground">{totalPoints}</span>
            </span>
          </div>

          <div>
            <h2 className="font-display text-h2">
              Questions
            </h2>
            <div className="mt-3 flex flex-col gap-2">
              {assessment.questions.map((q, i) => {
                const meta = TYPE_META[q.type];
                return (
                  <Card
                    key={q.id}
                    className="flex items-start gap-3 border-border/70 px-4 py-3 shadow-none"
                  >
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-border bg-secondary font-mono text-xs text-muted-foreground">
                      {i + 1}
                    </span>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <p className="line-clamp-2 text-sm font-medium">
                        {q.prompt}
                      </p>
                      <div className="flex items-center gap-2 text-caption text-muted-foreground">
                        <meta.icon className="size-3" />
                        {meta.label}
                        <span
                          className={cn(
                            "rounded-full border px-1.5 py-px font-mono text-[10px]",
                            q.difficulty === "easy" &&
                              "border-success/40 bg-success/10 text-success-strong",
                            q.difficulty === "medium" &&
                              "border-warning/40 bg-warning/10 text-warning-strong",
                            q.difficulty === "hard" &&
                              "border-primary-border bg-primary-light text-primary",
                          )}
                        >
                          {q.difficulty}
                        </span>
                      </div>
                    </div>
                    <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground">
                      +{DIFF_POINTS[q.difficulty]}
                    </span>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right — start card */}
        <div className="lg:sticky lg:top-20">
          <Card className="flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Start the assessment</span>
              <Gauge className="size-4 text-warning-strong" />
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              The timer starts when you begin. Answer flow is one question at a
              time; a correct answer builds your combo multiplier.
            </p>
            <ul className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <ListChecks className="size-3.5 text-warning-strong" />
                Deterministic grading — never AI
              </li>
              <li className="flex items-center gap-1.5">
                <Flame className="size-3.5 text-warning-strong" />
                Combo preview ×3.0 max
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldAlert className="size-3.5 text-warning-strong" />
                Anti-cheat telemetry is captured
              </li>
            </ul>

            <Button
              onClick={() => start.mutate()}
              disabled={!user || start.isPending || startDisabledByFormat}
              className="w-full gap-2"
            >
              {start.isPending ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  Starting…
                </>
              ) : (
                <>
                  <Play className="size-4" />
                  Start assessment
                </>
              )}
            </Button>

            {start.isPending ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs"
              >
                <LoaderCircle className="size-3.5 animate-spin text-warning-strong" />
                <span>Reserving attempt slot…</span>
              </motion.div>
            ) : null}

            {!user ? (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="size-3.5 shrink-0" />
                Sign in to start an assessment.
              </p>
            ) : null}

            {startDisabledByFormat ? (
              <p className="text-xs text-muted-foreground">
                Only MCQ assessments are enabled in this production slice.
              </p>
            ) : null}

            {start.isError ? (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-xs text-destructive">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  {start.error instanceof Error
                    ? start.error.message
                    : "Could not start the assessment."}
                </span>
              </div>
            ) : null}
          </Card>

          <p className="mt-3 flex items-start gap-1.5 text-caption leading-relaxed text-muted-foreground">
            <Code2 className="mt-0.5 size-3 shrink-0" />
             MCQ questions are graded deterministically by the Assessment Engine.
          </p>

          <div className="mt-4 flex flex-col gap-4">
            <ComboCurveTeaser />
            <AttemptsTracker
              assessmentId={assessment.id}
              attemptsAllowed={assessment.attempts_allowed}
            />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

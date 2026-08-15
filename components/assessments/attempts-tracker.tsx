"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { m as motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  History,
  RotateCcw,
  TimerReset,
} from "lucide-react";

import { getAssessment, getAttempt, listAttemptsForAssessment } from "@/lib/data/demo/assessment";
import { useSession } from "@/components/providers/session-provider";
import { Badge } from "@/components/ui/badge";
import { SkeletonLines } from "@/components/shared/skeletons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/* ------------------------------------------------------------------ */
/*  Attempts tracker — reads the mock attempt store per assessment +   */
/*  user and shows used/remaining + results.                            */
/* ------------------------------------------------------------------ */

const STATUS_LABEL: Record<string, string> = {
  in_progress: "In progress",
  submitted: "Submitted",
  expired: "Timed out",
  abandoned: "Abandoned",
};

export function AttemptsTracker({
  assessmentId,
  attemptsAllowed,
}: {
  assessmentId: string;
  attemptsAllowed: number;
}) {
  const { user } = useSession();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["attempts-for", assessmentId],
    queryFn: () => listAttemptsForAssessment(assessmentId, user?.id ?? ""),
    enabled: !!user,
  });

  const attempts = data ?? [];
  const used = attempts.length;
  const remaining = Math.max(0, attemptsAllowed - used);
  const exhausted = remaining <= 0;
  // Pass/fail comes from the server (`passed`), never computed here.
  const lastPassed = attempts.some((a) => a.passed);
  const [reviewAttemptId, setReviewAttemptId] = React.useState<string | null>(null);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 font-display text-small font-semibold">
          <History className="size-4 text-muted-foreground" />
          Your attempts
        </p>
        {!isLoading && !isError ? (
          <Badge
            variant={exhausted ? "outline" : "secondary"}
            className={cn(
              "text-caption",
              exhausted && "border-primary-border bg-primary-light text-primary",
            )}
          >
            {used}/{attemptsAllowed} used
          </Badge>
        ) : null}
      </div>

      {!user ? (
        <p className="mt-2.5 text-xs text-muted-foreground">
          Sign in to see your attempt history.
        </p>
      ) : isLoading ? (
        <div className="mt-3">
          <SkeletonLines count={2} />
        </div>
      ) : isError ? (
        <div className="mt-3 flex items-center gap-2 text-xs text-destructive">
          <AlertTriangle className="size-3.5" />
          Could not load attempt history.
          <button
            onClick={() => refetch()}
            className="underline underline-offset-2 hover:text-foreground"
          >
            Retry
          </button>
        </div>
      ) : attempts.length === 0 ? (
        <p className="mt-2.5 text-xs text-muted-foreground">
          No attempts yet — your results will appear here.
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-col gap-2">
            {attempts.map((attempt) => (
              <motion.div
                key={attempt.attempt_id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    #{attempt.attempt_number}
                  </span>
                  <Badge variant="outline" className="text-caption">
                    {STATUS_LABEL[attempt.status] ?? attempt.status}
                  </Badge>
                </div>
                <div className="flex shrink-0 items-center gap-2.5 font-mono text-[11px] text-muted-foreground">
                  {attempt.status === "submitted" ? (
                    <>
                      <span className="text-emerald-700">
                        {attempt.score} pts · {attempt.correct_count}/
                        {attempt.question_count} correct
                        {attempt.max_combo > 1 ? (
                          <span className="ml-2 text-amber-700">
                            best {attempt.max_combo}-combo
                          </span>
                        ) : null}
                      </span>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={() => setReviewAttemptId(attempt.attempt_id)}>Review</Button>
                    </>
                  ) : attempt.status === "expired" ? (
                    <span className="flex items-center gap-1 text-amber-700">
                      <TimerReset className="size-3" />
                      timed out
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <RotateCcw className="size-3" />
                      in progress
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2 border-t border-border pt-2.5 text-xs">
            {exhausted ? (
              <p className="flex items-center gap-1.5 font-medium text-primary">
                <AlertTriangle className="size-3.5" />
                 Attempts used up — further attempts are blocked by the server.
              </p>
            ) : lastPassed ? (
              <p className="flex items-center gap-1.5 font-medium text-emerald-700">
                <CheckCircle2 className="size-3.5" />
                You passed a previous attempt — retakes still allowed.
              </p>
            ) : (
              <p className="text-muted-foreground">
                {remaining} {remaining === 1 ? "attempt" : "attempts"} remaining
              </p>
            )}
          </div>
          <AttemptReview assessmentId={assessmentId} attemptId={reviewAttemptId} onClose={() => setReviewAttemptId(null)} />
        </>
      )}
    </div>
  );
}

function AttemptReview({
  assessmentId,
  attemptId,
  onClose,
}: {
  assessmentId: string;
  attemptId: string | null;
  onClose: () => void;
}) {
  const attemptQuery = useQuery({
    queryKey: ["attempt-review", attemptId],
    queryFn: () => getAttempt(attemptId!),
    enabled: Boolean(attemptId),
  });
  const assessmentQuery = useQuery({
    queryKey: ["assessment-review", assessmentId],
    queryFn: () => getAssessment(assessmentId),
    enabled: Boolean(attemptId),
  });
  const attempt = attemptQuery.data;
  const assessment = assessmentQuery.data;

  return (
    <Dialog open={Boolean(attemptId)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[min(85dvh,42rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Attempt review</DialogTitle>
         <DialogDescription>Review each answer and the deterministic result recorded by the server.</DialogDescription>
        </DialogHeader>
        {attemptQuery.isLoading || assessmentQuery.isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading review…</div>
        ) : attempt && assessment ? (
          <div className="grid gap-3">
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">Attempt #{attempt.attempt_number}</Badge>
              <Badge variant="outline">{attempt.score} points</Badge>
              <span className="self-center">{attempt.answers.filter((answer) => answer.correct).length}/{assessment.questions.length} correct</span>
            </div>
            {assessment.questions.map((question, index) => {
              const answer = attempt.answers.find((candidate) => candidate.question_id === question.id);
              return (
                <div key={question.id} className="rounded-xl border border-border bg-surface-1 p-4">
                  <div className="flex items-start gap-3">
                    <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-xs", answer?.correct ? "bg-success/15 text-success-strong" : "bg-danger/10 text-danger-strong")}>
                      {answer?.correct ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{index + 1}. {question.prompt}</p>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        {answer?.correct ? "Correct. Keep this reasoning pattern available for future challenges." : "Not correct this time. Revisit the concept, then retry the assessment when you are ready."}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">{answer?.score ?? 0} pts</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : <p className="py-8 text-center text-sm text-muted-foreground">This attempt review is unavailable.</p>}
      </DialogContent>
    </Dialog>
  );
}

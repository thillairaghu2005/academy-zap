"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  History,
  RotateCcw,
  TimerReset,
} from "lucide-react";

import { listAttemptsForAssessment } from "@/lib/api/assessment";
import { useSession } from "@/components/providers/session-provider";
import { Badge } from "@/components/ui/badge";
import { SkeletonLines } from "@/components/shared/skeletons";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Attempts tracker — reads the mock attempt store per assessment +   */
/*  user (server-side table read) and shows used/remaining + results.  */
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

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 font-display text-sm font-semibold">
          <History className="size-4 text-muted-foreground" />
          Your attempts
        </p>
        {!isLoading && !isError ? (
          <Badge
            variant={exhausted ? "outline" : "secondary"}
            className={cn(
              "text-[10px]",
              exhausted && "border-rose-500/40 bg-rose-500/10 text-rose-700",
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
                  <Badge variant="outline" className="text-[10px]">
                    {STATUS_LABEL[attempt.status] ?? attempt.status}
                  </Badge>
                </div>
                <div className="flex shrink-0 items-center gap-2.5 font-mono text-[11px] text-muted-foreground">
                  {attempt.status === "submitted" ? (
                    <span className="text-emerald-700">
                      {attempt.score} pts · {attempt.correct_count}/
                      {attempt.question_count} correct
                      {attempt.max_combo > 1 ? (
                        <span className="ml-2 text-amber-700">
                          best {attempt.max_combo}-combo
                        </span>
                      ) : null}
                    </span>
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
              <p className="flex items-center gap-1.5 font-medium text-rose-700">
                <AlertTriangle className="size-3.5" />
                Attempts used up — further attempts are blocked server-side.
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
        </>
      )}
    </div>
  );
}

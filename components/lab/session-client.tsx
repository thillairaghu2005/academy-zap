"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Circle,
  CircleOff,
  Clock,
  Flag,
  Hourglass,
  LoaderCircle,
  Lock,
  Monitor,
  Power,
  Sparkles,
  Terminal,
  TimerReset,
} from "lucide-react";

import type { Lab, LabSession, ObjectiveResult } from "@/lib/contracts/lab";
import {
  checkObjective,
  completeSession,
  getLab,
  getSession,
  requestHint,
  terminateSession,
} from "@/lib/data/demo/lab";
import { useSession } from "@/components/providers/session-provider";
import { LabTerminalShell } from "@/components/lab/terminal-shell";
import { GuacamoleStub } from "@/components/lab/guacamole-stub";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageContainer } from "@/components/shared/page-container";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonLines, TerminalSkeleton } from "@/components/shared/skeletons";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Lab session — the live F3 surface.                                 */
/*                                                                     */
/*  Session lifecycle mirrors §6: provision → run → hard timeout (or    */
/*  terminate / complete). The CLIENT never decides status transitions — */
/*  getSession() enforces the hard timeout in the local mock store       */
/*  and the view renders what the API returns.                          */
/* ------------------------------------------------------------------ */

const POLL_MS = 2500;

/** Fallback when the lab metadata query hasn't resolved yet (session drives the UI). */
const EMPTY_LAB: Lab = {
  id: "",
  slug: "",
  title: "Lab session",
  category: "",
  difficulty: "beginner",
  description: "",
  estimated_minutes: 0,
  success_rate_pct: 0,
  requires_gui: false,
  hard_timeout_minutes: 60,
  objectives: [],
};

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0:00";
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function timeAgo(iso: string): string {
  const seconds = Math.max(
    0,
    Math.round((Date.now() - new Date(iso).getTime()) / 1000),
  );
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}

/* ---------- Objectives panel ---------- */

function ObjectivesPanel({
  session,
  lab,
  onCheck,
}: {
  session: LabSession;
  lab: Lab;
  onCheck: (objectiveId: string) => void;
}) {
  const done = new Set(session.objectives_completed);
  const allDone = lab.objectives.every((o) => done.has(o.id));

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-small font-semibold">
          <Flag className="size-4 text-muted-foreground" />
          Objectives
        </h2>
        <Badge
          variant={allDone ? "secondary" : "outline"}
          className={cn(
            "text-caption",
            allDone && "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
          )}
        >
          {session.objectives_completed.length}/{lab.objectives.length}
        </Badge>
      </div>

      <div className="flex flex-col gap-2">
        {lab.objectives.map((objective) => {
          const completed = done.has(objective.id);
          return (
            <div
              key={objective.id}
              className={cn(
                "flex items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors",
                completed
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-border bg-card",
              )}
            >
              {completed ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700" />
              ) : (
                <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" />
              )}
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm font-medium",
                    completed && "text-emerald-700",
                  )}
                >
                  {objective.title}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {objective.description}
                </p>
              </div>
              {!completed && !objective.requires_terminal ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 shrink-0 px-2 text-caption"
                  onClick={() => onCheck(objective.id)}
                >
                  Check
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>

      <p className="text-caption leading-relaxed text-muted-foreground/80">
        Terminal objectives verify automatically when the flag is found
        (demo-service). GUI objectives use the Check button.
      </p>
    </Card>
  );
}

/* ---------- End-state cards ---------- */

function SessionEnded({
  kind,
  lab,
  session,
  completedEvent,
}: {
  kind: "completed" | "timed_out" | "terminated";
  lab: Lab;
  session: LabSession;
  completedEvent?: {
    time_taken_seconds: number;
    hints_used: number;
    objectives_completed: string[];
  } | null;
}) {
  const isCompleted = kind === "completed";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-4 py-10 text-center"
    >
      <div
        className={cn(
          "grid size-16 place-items-center rounded-2xl border",
          isCompleted
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
            : kind === "timed_out"
              ? "border-amber-500/40 bg-amber-500/10 text-amber-700"
              : "border-muted-foreground/30 bg-secondary text-muted-foreground",
        )}
      >
        {isCompleted ? (
          <CheckCircle2 className="size-8" />
        ) : kind === "timed_out" ? (
          <TimerReset className="size-8" />
        ) : (
          <Power className="size-8" />
        )}
      </div>

      <div>
        <h2 className="font-display text-h2">
          {isCompleted
            ? "Lab completed"
            : kind === "timed_out"
              ? "Hard timeout reached"
              : "Session terminated"}
        </h2>
        <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
          {isCompleted
            ? "All objectives verified against the live session. The sandbox is being destroyed."
            : kind === "timed_out"
              ? "The session hit its hard timeout and was force-terminated. Any progress not verified by the demo service is gone — that's by design."
              : "The session was ended early. The sandbox and its state have been torn down."}
        </p>
      </div>

      {isCompleted && completedEvent ? (
        <div className="grid w-full max-w-md grid-cols-3 gap-3">
          <Stat label="Objectives" value={String(completedEvent.objectives_completed.length)} />
          <Stat label="Time taken" value={`${Math.floor(completedEvent.time_taken_seconds / 60)}m ${completedEvent.time_taken_seconds % 60}s`} />
          <Stat label="Hints used" value={String(completedEvent.hints_used)} />
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3.5" />
          Session {timeAgo(session.provisioned_at)} ·{" "}
          {session.objectives_completed.length}/
          {lab.objectives.length} objectives completed
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/labs">Back to labs</Link>
        </Button>
        <Button size="sm" asChild>
          <Link href={`/labs/${lab.id}`}>Restart this lab</Link>
        </Button>
      </div>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card px-3 py-2.5">
      <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="font-mono text-sm font-medium">{value}</span>
    </div>
  );
}

/* ---------- Session view ---------- */

export function LabSessionClient({
  labId,
  sessionId,
}: {
  labId: string;
  sessionId: string;
}) {
  const { user } = useSession();
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: ["lab-session", sessionId],
    queryFn: () => getSession(sessionId),
    // Keep polling while the session is live so demo-service transitions
    // (running → completed / timed_out) surface in the UI.
    refetchInterval: (query) => {
      const s = query.state.data;
      return s && (s.status === "provisioning" || s.status === "running")
        ? POLL_MS
        : false;
    },
  });

  const session = sessionQuery.data;

  // Countdown tick — Date.now() must not run during render (react-hooks/
  // purity). A 1s interval owns the "now" value, exactly like the judge's
  // queue-elapsed counter.
  const [nowMs, setNowMs] = React.useState(() => Date.now());
  React.useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Lab metadata (objectives titles etc.) for the active session.
  const labQuery = useQuery({
    queryKey: ["lab", session?.lab_id ?? labId],
    queryFn: () => getLab(session?.lab_id ?? labId),
    enabled: !!session,
  });

  const [completedEvent, setCompletedEvent] = React.useState<{
    time_taken_seconds: number;
    hints_used: number;
    objectives_completed: string[];
  } | null>(null);
  const [checkResults, setCheckResults] = React.useState<
    Record<string, ObjectiveResult>
  >({});

  const terminate = useMutation({
    mutationFn: () => terminateSession(sessionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["lab-session", sessionId],
      });
    },
  });

  const complete = useMutation({
    mutationFn: () => completeSession(sessionId),
    onSuccess: (event) => {
      setCompletedEvent(event);
      void queryClient.invalidateQueries({
        queryKey: ["lab-session", sessionId],
      });
    },
  });

  const checkMutation = useMutation({
    mutationFn: (objectiveId: string) =>
      checkObjective(sessionId, objectiveId).then((result) => {
        setCheckResults((prev) => ({ ...prev, [objectiveId]: result }));
        void queryClient.invalidateQueries({
          queryKey: ["lab-session", sessionId],
        });
        return result;
      }),
  });

  const hintMutation = useMutation({
    mutationFn: () => requestHint(sessionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["lab-session", sessionId],
      });
    },
  });

  // Refresh the session when the terminal reports a command (flag found → the
  // demo store updated, so re-read it from the demo service.
  const handleTerminalCommand = React.useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: ["lab-session", sessionId],
    });
  }, [queryClient, sessionId]);

  /* ---------- Loading ---------- */
  if (sessionQuery.isLoading) {
    return (
      <PageContainer>
        <SkeletonLines count={2} className="max-w-md" />
        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_300px]">
          <Card className="h-[420px] overflow-hidden p-0">
            <TerminalSkeleton />
          </Card>
          <div className="flex flex-col gap-4">
            <SkeletonLines count={3} />
            <SkeletonLines count={2} />
          </div>
        </div>
      </PageContainer>
    );
  }

  /* ---------- Error / 404 ---------- */
  if (sessionQuery.isError || !session) {
    const err = sessionQuery.error;
    const is404 =
      err instanceof Error &&
      "status" in err &&
      (err as { status: number }).status === 404;
    return (
      <PageContainer>
        {is404 ? (
          <EmptyState
            icon={CircleOff}
            title="Session not found"
            description="This lab session does not exist or has expired. Start a fresh session from the lab page."
            action={
              <Button variant="outline" size="sm" asChild>
                <Link href={`/labs/${labId}`}>Open lab</Link>
              </Button>
            }
          />
        ) : (
          <ErrorState
            title="Session unavailable"
            message={
              err instanceof Error
                ? err.message
                : "The lab orchestrator is not responding."
            }
            code="SESSION_ERR"
            onRetry={() => sessionQuery.refetch()}
          />
        )}
      </PageContainer>
    );
  }

  if (labQuery.isLoading) {
    return (
      <PageContainer>
        <SkeletonLines count={2} className="max-w-md" />
        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
          <Card className="h-[440px] overflow-hidden p-0">
            <TerminalSkeleton />
          </Card>
          <div className="flex flex-col gap-4">
            <SkeletonLines count={5} />
            <SkeletonLines count={3} />
          </div>
        </div>
      </PageContainer>
    );
  }

  if (labQuery.isError || !labQuery.data) {
    return (
      <PageContainer>
        <ErrorState
          title="Lab metadata unavailable"
          message="The session exists, but its lab definition could not be loaded."
          code="LAB_METADATA_ERR"
          onRetry={() => labQuery.refetch()}
        />
      </PageContainer>
    );
  }

  const lab = labQuery.data;
  const ended =
    session.status === "completed" ||
    session.status === "timed_out" ||
    session.status === "terminated";
  const remainingMs = Math.max(
    0,
    new Date(session.expires_at).getTime() - nowMs,
  );
  const low = remainingMs < 5 * 60_000;

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2" asChild>
            <Link href="/labs">
              <ArrowLeft className="size-4" />
              Labs
            </Link>
          </Button>
          <div>
            <h1 className="font-display text-h1">
              {lab?.title ?? "Lab session"}
            </h1>
            <p className="font-mono text-[11px] text-muted-foreground">
              {session.session_id}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!ended ? (
            <Badge
              variant={session.status === "running" ? "secondary" : "outline"}
              className={cn(
                "gap-1.5",
                session.status === "provisioning" && "text-muted-foreground",
              )}
            >
              {session.status === "provisioning" ? (
                <LoaderCircle className="size-3 animate-spin" />
              ) : (
                <span className="size-1.5 rounded-full bg-emerald-500" />
              )}
              {session.status}
            </Badge>
          ) : (
                  <Badge variant="outline" className="text-caption">
              ended
            </Badge>
          )}

          {!ended ? (
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-sm font-semibold tabular-nums",
                low
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-700"
                  : "border-border bg-muted/50",
              )}
              title="Hard timeout countdown"
            >
              <Hourglass className="size-3.5" />
              {formatCountdown(remainingMs)}
            </div>
          ) : null}
        </div>
      </div>

      {/* End states */}
      {ended ? (
        <div className="mt-6">
          {session.status === "completed" ? (
            <SessionEnded
              kind="completed"
              lab={lab ?? EMPTY_LAB}
              session={session}
              completedEvent={completedEvent}
            />
          ) : session.status === "timed_out" ? (
            <SessionEnded
              kind="timed_out"
              lab={lab ?? EMPTY_LAB}
              session={session}
            />
          ) : (
            <SessionEnded
              kind="terminated"
              lab={lab ?? EMPTY_LAB}
              session={session}
            />
          )}
        </div>
      ) : (
        <div className="mt-6 grid items-start gap-4 lg:grid-cols-[1fr_320px]">
          {/* Terminal / GUI area */}
          <div className="flex flex-col gap-3">
            <div className="overflow-hidden rounded-xl border border-border bg-zinc-950 shadow-sm">
              <div className="flex items-center justify-between border-b border-white/5 bg-zinc-900 px-3.5 py-2">
                <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  {lab?.requires_gui ? (
                    <Monitor className="size-3.5 text-emerald-700" />
                  ) : (
                    <Terminal className="size-3.5 text-emerald-700" />
                  )}
                  {lab?.requires_gui ? "Guacamole GUI viewer" : "shell — ttyd over WebSocket"}
                </span>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-caption text-emerald-700/80">
                    <Lock className="size-3" />
                    encrypted
                  </span>
                  {!lab?.requires_gui ? (
                    <span className="hidden rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
                      {session.terminal_url}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="h-[440px]">
                {lab?.requires_gui ? (
                  <GuacamoleStub sessionId={sessionId} />
                ) : (
                  <LabTerminalShell
                    sessionId={sessionId}
                    onCommand={handleTerminalCommand}
                  />
                )}
              </div>
            </div>

            {/* Terminal hint bar */}
            {!lab?.requires_gui ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3.5 py-2.5">
                <p className="text-caption leading-relaxed text-muted-foreground">
                  Try{" "}
                  <code className="rounded bg-muted px-1">help</code>,{" "}
                  <code className="rounded bg-muted px-1">ls /root</code>,{" "}
                  <code className="rounded bg-muted px-1">cat /root/flag.txt</code>{" "}
                   to capture flags — objective state is derived by the demo service.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                    className="h-7 gap-1.5 px-2.5 text-caption"
                  onClick={() => hintMutation.mutate()}
                  disabled={hintMutation.isPending}
                >
                  <Sparkles className="size-3.5" />
                  {hintMutation.isPending ? "Asking…" : "Request hint"}
                </Button>
              </div>
            ) : null}

            {hintMutation.data ? (
              <div className="animate-fade-up rounded-lg border border-amber-500/25 bg-amber-500/5 px-3.5 py-2.5 text-xs text-amber-700">
                <span className="font-semibold">Hint:</span> {hintMutation.data}
              </div>
            ) : null}
          </div>

          {/* Right rail */}
          <div className="flex flex-col gap-4">
            {lab ? (
              <ObjectivesPanel
                session={session}
                lab={lab}
                onCheck={(id) => checkMutation.mutate(id)}
              />
            ) : null}

            {/* Latest demo-service check feedback */}
            {Object.keys(checkResults).length > 0 ? (
              <div className="flex flex-col gap-2">
                {Object.values(checkResults).map((result) => (
                  <div
                    key={result.objective_id}
                    className={cn(
                      "animate-fade-up rounded-lg border px-3.5 py-2.5 text-xs",
                      result.completed
                        ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-700"
                        : "border-border bg-muted/30 text-muted-foreground",
                    )}
                  >
                    <span className="font-semibold">
                      {result.completed ? "Verified" : "Not yet"}:{" "}
                    </span>
                    {result.detail}
                  </div>
                ))}
              </div>
            ) : null}

            {checkMutation.error ? (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-xs text-destructive">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  {checkMutation.error instanceof Error
                    ? checkMutation.error.message
                    : "Objective check failed."}
                </span>
              </div>
            ) : null}

            <Card className="flex flex-col gap-2.5 p-4">
              <h3 className="font-display text-h3">
                Session info
              </h3>
              <InfoRow label="Started" value={timeAgo(session.provisioned_at)} />
              <InfoRow
                label="Hard timeout"
                value={formatCountdown(remainingMs)}
              />
              <InfoRow
                label="Hints used"
                value={String(session.hints_used)}
              />
              <InfoRow
                label="Network"
                value="isolated · egress denied"
              />
            </Card>

            <div className="flex flex-col gap-2">
              {lab && session.objectives_completed.length === lab.objectives.length ? (
                <Button
                  className="w-full gap-2"
                  onClick={() => complete.mutate()}
                  disabled={complete.isPending}
                >
                  {complete.isPending ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  {complete.isPending ? "Finalizing…" : "Complete lab"}
                </Button>
              ) : null}

              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => terminate.mutate()}
                disabled={terminate.isPending || !user}
              >
                {terminate.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Power className="size-4" />
                )}
                End session
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-[11px] text-foreground/90">{value}</span>
    </div>
  );
}

"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpenText,
  CheckCircle2,
  Circle,
  CircleOff,
  Flag,
  LoaderCircle,
  Lock,
  Play,
  Save,
  Sparkles,
} from "lucide-react";

import type {
  LabDetail,
  LabProgress,
  CellExecutionState,
} from "@/lib/contracts/lab-notebook";
import {
  completeLab,
  createCheckpoint,
  executeCell,
  getProgress,
  saveProgress,
} from "@/lib/data/lab-facade";
import { MarkdownRenderer } from "@/components/ide/statement/MarkdownRenderer";
import { EditorShell } from "@/components/judge/editor-shell";
import { useSession } from "@/components/providers/session-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageContainer } from "@/components/shared/page-container";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SkeletonLines } from "@/components/shared/skeletons";
import { feedback } from "@/lib/feedback";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  B6 notebook — the browser-native lab surface.                      */
/*                                                                     */
/*  Reads the published versioned manifest, hydrates the learner's      */
/*  progress (lazily created on the backend), autosaves cell sources    */
/*  (debounced), and enqueues cell runs against the sandbox worker.     */
/*  Execution is NEVER inline: the 202 handle + progress polling is the */
/*  single source of truth for cell output (platform §5).               */
/* ------------------------------------------------------------------ */

const SAVE_DEBOUNCE_MS = 1500;
const POLL_MS = 1200;

function flattenCodeCells(notebook: NonNullable<LabDetail["notebook"]>) {
  return notebook.sections.flatMap((section) =>
    section.cells.filter((cell) => cell.cell_type === "code"),
  );
}

function isRunning(state: CellExecutionState | undefined): boolean {
  return state?.status === "queued" || state?.status === "processing";
}

function formatRuntime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatBytes(kb: number): string {
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ---------- Code cell output ---------- */

function CellOutput({ state }: { state: CellExecutionState | undefined }) {
  if (!state) return null;

  if (state.status === "queued" || state.status === "processing") {
    return (
      <div className="flex items-center gap-2 border-t border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        <LoaderCircle className="size-3.5 animate-spin text-primary" />
        {state.status === "queued" ? "Queued for sandbox…" : "Running in sandbox…"}
      </div>
    );
  }

  if (state.status === "succeeded") {
    return (
      <div className="border-t border-border bg-zinc-950">
        {state.stdout ? (
          <pre className="overflow-x-auto px-4 py-3 font-mono text-xs leading-relaxed text-emerald-100">{state.stdout}</pre>
        ) : (
          <p className="px-4 py-3 text-xs text-muted-foreground">No output.</p>
        )}
        <div className="flex items-center gap-3 border-t border-white/5 px-4 py-1.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1 text-emerald-500">
            <CheckCircle2 className="size-3" /> exit 0
          </span>
          {typeof state.runtime_ms === "number" ? <span>{formatRuntime(state.runtime_ms)}</span> : null}
          {typeof state.memory_kb === "number" ? <span>{formatBytes(state.memory_kb)}</span> : null}
        </div>
      </div>
    );
  }

  if (state.status === "failed") {
    return (
      <div className="border-t border-border bg-zinc-950">
        {state.stdout ? (
          <pre className="overflow-x-auto px-4 py-3 font-mono text-xs leading-relaxed text-zinc-200">{state.stdout}</pre>
        ) : null}
        {state.stderr ? (
          <pre className="overflow-x-auto px-4 py-3 font-mono text-xs leading-relaxed text-red-300">{state.stderr}</pre>
        ) : (
          <p className="px-4 py-3 text-xs text-muted-foreground">The program exited with a non-zero code.</p>
        )}
        <div className="flex items-center gap-3 border-t border-white/5 px-4 py-1.5 text-[11px] text-muted-foreground">
          <span className="text-red-400">exit {state.exit_code ?? "?"}</span>
          {typeof state.runtime_ms === "number" ? <span>{formatRuntime(state.runtime_ms)}</span> : null}
        </div>
      </div>
    );
  }

  // status === "error" (worker/permanent failure)
  return (
    <div className="flex items-start gap-2 border-t border-destructive/25 bg-destructive/5 px-4 py-3 text-xs text-destructive">
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
      <span>{state.error ?? "The cell could not be executed."}</span>
    </div>
  );
}

/* ---------- Code cell card ---------- */

function CodeCell({
  value,
  state,
  running,
  onEdit,
  onRun,
}: {
  value: string;
  state: CellExecutionState | undefined;
  running: boolean;
  onEdit: (value: string) => void;
  onRun: () => void;
}) {
  const done = state?.status === "succeeded";
  return (
    <Card className="overflow-hidden border-border/80 shadow-none">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className={cn(
            "size-1.5 rounded-full",
            done ? "bg-success" : state && state.status !== "not_run" ? "bg-warning" : "bg-muted-foreground/40",
          )} />
          <span className="font-mono text-[11px] text-muted-foreground">cell · code</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 px-2.5 text-caption"
          onClick={onRun}
          disabled={running}
        >
          {running ? (
            <LoaderCircle className="size-3.5 animate-spin" />
          ) : (
            <Play className="size-3.5" />
          )}
          {running ? "Running…" : "Run"}
        </Button>
      </div>
      <div className="h-56">
        <EditorShell
          value={value}
          onChange={onEdit}
          language="python"
          theme="vs"
        />
      </div>
      <CellOutput state={state} />
    </Card>
  );
}

/* ---------- Main notebook view ---------- */

export function NotebookClient({
  labId,
  initialLab,
}: {
  labId: string;
  initialLab: LabDetail;
}) {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const notebook = initialLab.notebook;

  const progressQuery = useQuery({
    queryKey: ["lab-progress", labId],
    queryFn: () => getProgress(labId),
    enabled: Boolean(user && notebook),
    refetchInterval: (query) => {
      const p = query.state.data as LabProgress | undefined;
      if (!p) return false;
      const running = Object.values(p.outputs).some(isRunning);
      return running ? POLL_MS : false;
    },
  });

  const codeCells = React.useMemo(
    () => (notebook ? flattenCodeCells(notebook) : []),
    [notebook],
  );

  const [drafts, setDrafts] = React.useState<Record<string, string>>({});
  const [lastSaved, setLastSaved] = React.useState<string | null>(null);
  const [checkpointResult, setCheckpointResult] = React.useState<{
    checkpoint_id: string;
    created_at: string;
  } | null>(null);
  const [completeResult, setCompleteResult] = React.useState<{
    time_taken_seconds: number;
    hints_used: number;
    objectives_completed: string[];
  } | null>(null);

  /** Current source for a cell: local edits win, else the last autosave, else starter. */
  const cellValue = (cellId: string, starter: string): string =>
    drafts[cellId] ?? progressQuery.data?.code[cellId] ?? starter;

  const saveMutation = useMutation({
    mutationFn: (code: Record<string, string>) => saveProgress(labId, code),
    onSuccess: (result) => setLastSaved(result.updated_at),
  });

  // Debounced autosave — fires after edits settle; the backend merges cell-level.
  const saveTimer = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (Object.keys(drafts).length === 0) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveMutation.mutate(drafts);
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drafts]);

  const executeMutation = useMutation({
    mutationFn: (cellId: string) => executeCell(labId, cellId, drafts[cellId]),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["lab-progress", labId] });
    },
  });

  const checkpointMutation = useMutation({
    mutationFn: () => createCheckpoint(labId),
    onSuccess: (result) => setCheckpointResult(result),
  });

  const completeMutation = useMutation({
    mutationFn: () => completeLab(labId),
    onSuccess: (result) => {
      setCompleteResult(result);
      void queryClient.invalidateQueries({ queryKey: ["lab-progress", labId] });
    },
  });

  const progress = progressQuery.data;
  const isCompleted = progress?.status === "completed";
  const succeededCount = codeCells.filter(
    (cell) => progress?.outputs[cell.id]?.status === "succeeded",
  ).length;
  const allSucceeded = codeCells.length > 0 && succeededCount === codeCells.length;
  const anyRunning = codeCells.some((cell) => isRunning(progress?.outputs[cell.id]));

  // Multimodal feedback on cell results — fires once per transition, on the
  // same frame the visual lands (SKILL §13). Never fires on first load.
  const prevOutputs = React.useRef<Record<string, { status?: CellExecutionState["status"] }> | null>(null);
  React.useEffect(() => {
    const outputs = progress?.outputs;
    if (!outputs) return;
    const prev = prevOutputs.current;
    if (prev) {
      for (const [cellId, output] of Object.entries(outputs)) {
        if (!output) continue;
        const prevStatus = prev[cellId]?.status;
        if (prevStatus !== output.status) {
          if (output.status === "succeeded") feedback.success();
          else if (output.status === "failed" || output.status === "error") feedback.error();
        }
      }
    }
    prevOutputs.current = outputs;
  }, [progress?.outputs]);

  /* ---------- Sign-in gate ---------- */
  if (!user) {
    return (
      <PageContainer>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2" asChild>
            <Link href="/labs">
              <ArrowLeft className="size-4" /> Labs
            </Link>
          </Button>
          <h1 className="font-display text-h1">{initialLab.title}</h1>
        </div>
        <div className="mt-8">
          <EmptyState
            icon={Lock}
            title="Sign in to run the notebook"
            description="Cell execution and progress are scoped to your account. Your autosaved code is restored when you come back."
            action={
              <Button variant="gradient" className="gap-2" asChild>
                <Link href={`/login?next=/labs/${labId}/notebook`}>
                  <Lock className="size-4" /> Sign in to continue
                </Link>
              </Button>
            }
          />
        </div>
      </PageContainer>
    );
  }

  /* ---------- Progress error ---------- */
  if (progressQuery.isError && !progress) {
    const err = progressQuery.error;
    const is401 = err instanceof Error && "status" in err && (err as { status: number }).status === 401;
    return (
      <PageContainer>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2" asChild>
            <Link href="/labs">
              <ArrowLeft className="size-4" /> Labs
            </Link>
          </Button>
          <h1 className="font-display text-h1">{initialLab.title}</h1>
        </div>
        <div className="mt-8">
          {is401 ? (
            <EmptyState
              icon={Lock}
              title="Session expired"
              description="Your sign-in expired. Re-authenticate to restore your notebook."
              action={
                <Button variant="gradient" className="gap-2" asChild>
                  <Link href={`/login?next=/labs/${labId}/notebook`}>
                    <Lock className="size-4" /> Sign in again
                  </Link>
                </Button>
              }
            />
          ) : (
            <ErrorState
              title="Notebook unavailable"
              message={err instanceof Error ? err.message : "The lab progress service is unavailable."}
              code="NOTEBOOK_ERR"
              onRetry={() => progressQuery.refetch()}
            />
          )}
        </div>
      </PageContainer>
    );
  }

  /* ---------- Completion banner ---------- */
  const completedView = isCompleted ? (
    <div className="mb-6 flex flex-col items-start gap-3 rounded-xl border border-success/30 bg-success/5 p-5">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="size-5 text-success-strong" />
        <h2 className="font-display text-h2">Lab completed</h2>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Every code cell succeeded. A completion event was emitted for the
        gamification engine.
      </p>
      {completeResult ? (
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Flag className="size-3.5 text-success-strong" />
            {completeResult.objectives_completed.length} objectives
          </span>
          <span className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-success-strong" />
            {Math.floor(completeResult.time_taken_seconds / 60)}m {completeResult.time_taken_seconds % 60}s
          </span>
        </div>
      ) : null}
    </div>
  ) : null;

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2" asChild>
            <Link href="/labs">
              <ArrowLeft className="size-4" /> Labs
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-h1">{initialLab.title}</h1>
              <Badge variant="outline" className="text-caption">
                <BookOpenText className="size-3" /> v{notebook?.version ?? 1}
              </Badge>
            </div>
            <p className="font-mono text-[11px] text-muted-foreground">{initialLab.slug}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {progress ? (
            <Badge variant={isCompleted ? "secondary" : "outline"} className={cn("gap-1.5 text-caption", isCompleted && "border-success/40 bg-success/10 text-success-strong")}>
              {isCompleted ? <CheckCircle2 className="size-3" /> : anyRunning ? <LoaderCircle className="size-3 animate-spin" /> : <Circle className="size-3" />}
              {isCompleted ? "completed" : anyRunning ? "running…" : "in progress"}
            </Badge>
          ) : null}
          <span className="flex items-center gap-1.5 text-caption text-muted-foreground">
            <Save className="size-3.5" />
            {saveMutation.isPending ? "saving…" : lastSaved ? `saved ${formatTimestamp(lastSaved)}` : "not saved yet"}
          </span>
        </div>
      </div>

      {completedView}

      {/* Body */}
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_300px]">
        {/* Notebook */}
        <div className="flex flex-col gap-6">
          {progressQuery.isLoading ? (
            <div className="flex flex-col gap-4">
              <SkeletonLines count={2} className="max-w-md" />
              <Card className="h-64 p-4"><SkeletonLines count={3} /></Card>
            </div>
          ) : notebook ? (
            notebook.sections.map((section) => (
              <section key={section.id} className="flex flex-col gap-3">
                <h2 className="font-display text-h2">{section.title}</h2>
                {section.cells.map((cell) =>
                  cell.cell_type === "markdown" ? (
                    <div key={cell.id} className="rounded-xl border border-border/70 bg-card px-4 py-3 shadow-none">
                      <MarkdownRenderer content={cell.content} />
                    </div>
                  ) : (
                    <CodeCell
                      key={cell.id}
                      value={cellValue(cell.id, cell.content)}
                      state={progress?.outputs[cell.id]}
                      running={executeMutation.isPending && executeMutation.variables === cell.id}
                      onEdit={(value) => setDrafts((prev) => ({ ...prev, [cell.id]: value }))}
                      onRun={() => executeMutation.mutate(cell.id)}
                    />
                  ),
                )}
              </section>
            ))
          ) : null}
        </div>

        {/* Right rail */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-20">
          <Card className="flex flex-col gap-3 p-4">
            <h3 className="flex items-center gap-2 font-display text-h3">
              <Flag className="size-4 text-muted-foreground" /> Objectives
            </h3>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Code cells passed</span>
              <span className="font-mono font-semibold">{succeededCount}/{codeCells.length}</span>
            </div>
            <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full bg-success transition-all", succeededCount === codeCells.length && codeCells.length > 0 && "bg-success-strong")}
                style={{ width: codeCells.length > 0 ? `${(succeededCount / codeCells.length) * 100}%` : "0%" }}
              />
            </div>
            <p className="text-caption leading-relaxed text-muted-foreground/80">
              A cell counts as done only when the sandbox worker reports a zero exit code.
            </p>

            {!isCompleted ? (
              <>
                <Button
                  className="w-full gap-2"
                  onClick={() => completeMutation.mutate()}
                  disabled={!allSucceeded || completeMutation.isPending || anyRunning}
                >
                  {completeMutation.isPending ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  {completeMutation.isPending ? "Completing…" : "Complete lab"}
                </Button>

                {!allSucceeded ? (
                  <p className="flex items-start gap-1.5 text-caption leading-relaxed text-muted-foreground">
                    <CircleOff className="mt-0.5 size-3.5 shrink-0" />
                    Complete every code cell to finish the lab.
                  </p>
                ) : null}

                {completeMutation.isError ? (
                  <div className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-xs text-destructive">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                    <span>
                      {completeMutation.error instanceof Error
                        ? completeMutation.error.message
                        : "Completion failed."}
                    </span>
                  </div>
                ) : null}
              </>
            ) : null}

            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => checkpointMutation.mutate()}
              disabled={checkpointMutation.isPending}
            >
              {checkpointMutation.isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {checkpointMutation.isPending ? "Snapshoting…" : "Create checkpoint"}
            </Button>
            {checkpointResult ? (
              <p className="text-caption text-success-strong">
                Checkpoint saved at {formatTimestamp(checkpointResult.created_at)}.
              </p>
            ) : null}
            {checkpointMutation.isError ? (
              <p className="text-caption text-destructive">
                {checkpointMutation.error instanceof Error
                  ? checkpointMutation.error.message
                  : "Checkpoint failed."}
              </p>
            ) : null}
          </Card>

          <Card className="flex flex-col gap-2.5 p-4">
            <h3 className="font-display text-h3">Notebook info</h3>
            <InfoRow label="Version" value={`v${notebook?.version ?? 1}`} />
            <InfoRow label="Started" value={formatTimestamp(progress?.started_at ?? null)} />
            <InfoRow label="Cells" value={`${codeCells.length} code`} />
            <InfoRow label="Sandbox" value="isolated · 5s cap" />
          </Card>
        </div>
      </div>
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

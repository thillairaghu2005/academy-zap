"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Braces,
  ChevronRight,
  CircleCheck,
  Clock,
  CodeXml,
  Gauge,
  LoaderCircle,
  Terminal,
} from "lucide-react";

import type {
  Problem,
  ProblemDifficulty,
} from "@/lib/contracts/judge";
import { listProblems } from "@/lib/api/judge";
import { DEMO_MODE } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageContainer } from "@/components/shared/page-container";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SkeletonCard } from "@/components/shared/skeletons";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Judge — problem list (F2)                                          */
/*  Wired to the mock listProblems() API. Difficulty filter is a       */
/*  client-side view over the fixture (mirrors the real catalog-query  */
/*  shape; full Meilisearch-backed search on the Judge list is a       */
/*  Content-side concern, not part of the F2 slice).                   */
/* ------------------------------------------------------------------ */

const DIFFICULTIES: { value: ProblemDifficulty | "all"; label: string }[] = [
  { value: "all", label: "All difficulties" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const DIFFICULTY_STYLE: Record<
  ProblemDifficulty,
  { badge: string; text: string }
> = {
  easy: { badge: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700", text: "text-emerald-700" },
  medium: { badge: "border-amber-500/40 bg-amber-500/10 text-amber-700", text: "text-amber-700" },
  hard: { badge: "border-rose-500/40 bg-rose-500/10 text-rose-700", text: "text-rose-700" },
};

function ProblemRow({ problem, index }: { problem: Problem; index: number }) {
  const diff = DIFFICULTY_STYLE[problem.difficulty];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 * index, duration: 0.3, ease: "easeOut" }}
    >
      <Link href={`/judge/${problem.id}`} className="group block outline-none">
        <Card className="flex items-center gap-4 p-4 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-lg group-hover:shadow-primary/5 focus-visible:ring-2 focus-visible:ring-ring">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50 text-muted-foreground transition-colors group-hover:border-primary/30 group-hover:text-primary">
            <CodeXml className="size-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-display text-h3 group-hover:text-primary">
                {problem.title}
              </h3>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-caption font-semibold uppercase tracking-wide",
                  diff.badge,
                )}
              >
                {problem.difficulty}
              </span>
            </div>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {problem.topics.map((topic) => (
                <span key={topic} className="flex items-center gap-1">
                  <Braces className="size-3" />
                  {topic}
                </span>
              ))}
            </p>
          </div>

          <div className="hidden shrink-0 items-center gap-4 text-xs text-muted-foreground sm:flex">
            <span className="flex items-center gap-1" title="Time limit">
              <Clock className="size-3.5" />
              {problem.time_limit_ms}ms
            </span>
            <span
              className="flex items-center gap-1"
              title="Memory limit"
            >
              <Gauge className="size-3.5" />
              {(problem.memory_limit_kb / 1024).toFixed(0)}MB
            </span>
            <span className="flex items-center gap-1" title="Hidden test cases">
              <Terminal className="size-3.5" />
              {problem.hidden_test_count} cases
            </span>
          </div>

          <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
        </Card>
      </Link>
    </motion.div>
  );
}

export function ProblemListClient() {
  const [difficulty, setDifficulty] = React.useState<
    ProblemDifficulty | "all"
  >("all");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["judge-problems", difficulty],
    queryFn: listProblems,
  });

  const filtered = data
    ? difficulty === "all"
      ? data
      : data.filter((p) => p.difficulty === difficulty)
    : [];

  const counts = React.useMemo(() => {
    const c: Record<ProblemDifficulty, number> = {
      easy: 0,
      medium: 0,
      hard: 0,
    };
    for (const p of data ?? []) c[p.difficulty]++;
    return c;
  }, [data]);

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-h1">
          Judge Engine
        </h1>
        <p className="text-sm text-muted-foreground">
          Solve challenges in the Monaco editor, submit, and get deterministic
          verdicts from the mock judge queue. Python only — the Phase-1
          language slice.
        </p>
      </div>

      {/* Difficulty filter */}
      <div className="mt-6 flex flex-wrap gap-2">
        {DIFFICULTIES.map((d) => {
          const count =
            d.value === "all"
              ? data?.length
              : d.value === "easy"
                ? counts.easy
                : d.value === "medium"
                  ? counts.medium
                  : counts.hard;
          const active = difficulty === d.value;
          return (
            <Button
              key={d.value}
              variant={active ? "default" : "outline"}
              size="sm"
              onClick={() => setDifficulty(d.value)}
              className={cn(
                !active &&
                  "text-muted-foreground hover:text-foreground",
              )}
            >
              {d.label}
              {count !== undefined ? (
                <span
                  className={cn(
                    "ml-1.5 rounded-full px-1.5 text-caption font-semibold",
                    active
                      ? "bg-white/20 text-white"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {count}
                </span>
              ) : null}
            </Button>
          );
        })}
      </div>

      {/* Problem rows */}
      <div className="mt-6 flex flex-col gap-3">
        {isLoading ? (
          <>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Loading problems…
            </div>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : isError ? (
          <ErrorState
            title="Judge unavailable"
            message={
              error instanceof Error
                ? error.message
                : "The judge backend is not responding."
            }
            code="JUDGE_ERR"
            onRetry={() => refetch()}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={CircleCheck}
            title="No problems here yet"
            description={
              difficulty === "all"
                ? "The problem set is empty."
                : `No ${difficulty} problems in the set yet. Try another difficulty.`
            }
          />
        ) : (
          filtered.map((problem, i) => (
            <ProblemRow key={problem.id} problem={problem} index={i} />
          ))
        )}
      </div>

      {/* Mock-hint footer — demo scaffolding, gated in production builds. */}
      {DEMO_MODE ? (
        <p className="mt-8 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">Mock hints:</span>{" "}
          inside the editor, include{" "}
          <code className="rounded bg-muted px-1">raise </code> for a runtime
          error, <code className="rounded bg-muted px-1">sleep(</code> for a
          time limit exceeded,{" "}
          <code className="rounded bg-muted px-1">wrong_answer</code> for a
          wrong answer, and{" "}
          <code className="rounded bg-muted px-1">compile_error</code> for a
          compile error. The starter code passes cleanly.
        </p>
      ) : null}
    </PageContainer>
  );
}

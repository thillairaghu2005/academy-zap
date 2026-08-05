"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ClipboardList,
  Clock,
  Code2,
  Gauge,
  ListChecks,
  PenLine,
  RotateCcw,
} from "lucide-react";

import type { Assessment, QuestionType } from "@/lib/contracts/assessment";
import { listAssessments } from "@/lib/api/assessment";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer } from "@/components/shared/page-container";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SkeletonGrid } from "@/components/shared/skeletons";

/* ------------------------------------------------------------------ */
/*  Assessment catalog — the F4 landing surface.                       */
/*  Wired to the mock listAssessments() API.                           */
/*                                                                     */
/*  States: loading (skeleton grid), empty, error (boom hook handled   */
/*  via detail), happy path.                                           */
/* ------------------------------------------------------------------ */

const TYPE_META: Record<QuestionType, { label: string; icon: typeof Code2 }> = {
  mcq: { label: "MCQ", icon: ListChecks },
  short_answer: { label: "Short answer", icon: PenLine },
  code: { label: "Code", icon: Code2 },
};

function AssessmentCard({ assessment, index }: { assessment: Assessment; index: number }) {
  const types = [...new Set(assessment.questions.map((q) => q.type))];
  const totalPoints = assessment.questions.reduce(
    (sum, q) =>
      sum + (q.difficulty === "hard" ? 25 : q.difficulty === "medium" ? 15 : 10),
    0,
  );
  const hue = (assessment.id.length * 53 + index * 70) % 360;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 * index, duration: 0.35, ease: "easeOut" }}
    >
      <Link href={`/assessments/${assessment.id}`} className="group block h-full outline-none">
        <Card className="h-full overflow-hidden transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-amber-500/40 group-hover:shadow-xl group-hover:shadow-amber-500/10 focus-visible:ring-2 focus-visible:ring-ring">
          <div
            className="relative h-28 w-full"
            style={{
              background: `linear-gradient(135deg, hsl(${hue}, 55%, 42%), hsl(${(hue + 60) % 360}, 45%, 24%))`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2">
              <h3 className="font-display text-base font-bold leading-tight text-white drop-shadow-sm">
                {assessment.title}
              </h3>
              <span className="shrink-0 rounded-full border border-white/20 bg-black/40 px-2 py-0.5 font-mono text-[10px] text-white/90 backdrop-blur-sm">
                v{assessment.version}
              </span>
            </div>
          </div>

          <CardContent className="flex flex-col gap-2.5 p-4">
            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {assessment.description}
            </p>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Gauge className="size-3.5" />
                {assessment.passing_percent}% to pass
              </span>
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" />
                ~{assessment.estimated_minutes} min
              </span>
              <span className="flex items-center gap-1">
                <RotateCcw className="size-3.5" />
                {assessment.attempts_allowed} attempts
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-2.5">
              <div className="flex flex-wrap gap-1">
                {types.map((t) => {
                  const meta = TYPE_META[t];
                  return (
                    <Badge key={t} variant="outline" className="gap-1 text-[10px]">
                      <meta.icon className="size-3" />
                      {meta.label}
                    </Badge>
                  );
                })}
              </div>
              <span className="text-xs text-muted-foreground">
                {assessment.questions.length} questions · {totalPoints} pts
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

export function AssessmentCatalogClient() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["assessments"],
    queryFn: () => listAssessments(),
  });

  return (
    <PageContainer>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Assessments
        </h1>
        <p className="text-sm text-muted-foreground">
          Timed checkpoints across mixed question formats — deterministic
          grading, a live combo meter, and anti-cheat telemetry hooks.
        </p>
      </div>

      <div className="mt-8">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">Loading assessments…</p>
            <SkeletonGrid count={3} />
          </div>
        ) : isError ? (
          <ErrorState
            title="Assessment catalog unavailable"
            message={
              error instanceof Error
                ? error.message
                : "The assessment backend is not responding."
            }
            code="ASSESS_ERR"
            onRetry={() => refetch()}
          />
        ) : data && data.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No assessments yet"
            description="Assessments appear here once they are published."
          />
        ) : data ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {data.map((assessment, i) => (
              <AssessmentCard key={assessment.id} assessment={assessment} index={i} />
            ))}
          </div>
        ) : null}
      </div>
    </PageContainer>
  );
}

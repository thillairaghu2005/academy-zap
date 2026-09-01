"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { m as motion, useReducedMotion } from "framer-motion";
import {
  ClipboardList,
  Clock,
  Code2,
  Gauge,
  ListChecks,
  PenLine,
  RotateCcw,
  Sparkles,
  ArrowRight
} from "lucide-react";

import type { Assessment, QuestionType } from "@/lib/contracts/assessment";
import { listAssessments } from "@/lib/data/demo/assessment";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageContainer } from "@/components/shared/page-container";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SkeletonGrid } from "@/components/shared/skeletons";

const TYPE_META: Record<QuestionType, { label: string; icon: typeof Code2 }> = {
  mcq: { label: "MCQ", icon: ListChecks },
  short_answer: { label: "Short Answer", icon: PenLine },
  code: { label: "Code", icon: Code2 },
};

function AssessmentCard({ assessment, index }: { assessment: Assessment; index: number }) {
  const reducedMotion = useReducedMotion() ?? false;
  const types = [...new Set(assessment.questions.map((q) => q.type))];
  const totalPoints = assessment.questions.reduce(
    (sum, q) =>
      sum + (q.difficulty === "hard" ? 25 : q.difficulty === "medium" ? 15 : 10),
    0,
  );

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 20 }}
      animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      transition={reducedMotion ? undefined : { delay: 0.1 + index * 0.05, duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="group h-full"
    >
      <Link href={`/assessments/${assessment.id}`} className="block h-full outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl">
        <Card className="relative h-full overflow-hidden border border-border/50 bg-background/50 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-primary/50 hover:bg-background/80 hover:shadow-[0_8px_40px_-12px_rgba(var(--primary-rgb),0.2)]">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />
          
          <div className="relative p-6 flex flex-col h-full gap-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-lg tracking-tight text-foreground/90 transition-colors group-hover:text-primary">
                    {assessment.title}
                  </h3>
                  <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary border-0 text-[10px] uppercase tracking-wider px-2 py-0">
                    v{assessment.version}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                  {assessment.description}
                </p>
              </div>
              <div className="shrink-0 p-2.5 rounded-xl bg-surface-1 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary shadow-sm border border-border/50">
                <ClipboardList className="size-5" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 py-4 border-y border-border/40 mt-auto">
              <div className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg bg-surface-1/50 transition-colors group-hover:bg-surface-1">
                <Gauge className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span className="text-xs font-medium">{assessment.passing_percent}%</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Pass</span>
              </div>
              <div className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg bg-surface-1/50 transition-colors group-hover:bg-surface-1">
                <Clock className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span className="text-xs font-medium">{assessment.estimated_minutes}m</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Time</span>
              </div>
              <div className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg bg-surface-1/50 transition-colors group-hover:bg-surface-1">
                <RotateCcw className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span className="text-xs font-medium">{assessment.attempts_allowed}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Tries</span>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5 text-foreground/80">
                  <Sparkles className="size-3.5 text-amber-500" />
                  {totalPoints} Total Points
                </span>
                <span>{assessment.questions.length} Questions</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  {types.map((t) => {
                    const meta = TYPE_META[t];
                    return (
                      <div key={t} className="flex h-7 items-center justify-center rounded-full border border-border/50 bg-surface-1/50 px-2.5 text-[11px] font-medium text-foreground/80 shadow-sm transition-colors group-hover:border-border" title={meta.label}>
                        <meta.icon className="size-3.5 mr-1.5 text-muted-foreground" />
                        {meta.label}
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-center rounded-full bg-primary p-2 text-primary-foreground opacity-0 -translate-x-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 shadow-md">
                  <ArrowRight className="size-4" />
                </div>
              </div>
            </div>
          </div>
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
    <div className="min-h-screen bg-background selection:bg-primary/30 pb-20">
      {/* Premium Hero Section */}
      <div className="relative overflow-hidden border-b border-border/40 bg-surface-1/30">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
        <div className="absolute inset-0 bg-grid opacity-20 [mask-image:linear-gradient(to_bottom,white,transparent)] pointer-events-none" />
        
        <PageContainer className="relative py-16 sm:py-24">
          <div className="flex max-w-3xl flex-col gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <Badge variant="outline" className="mb-6 rounded-full border-primary/20 bg-primary/5 px-3 py-1.5 text-xs text-primary backdrop-blur-sm shadow-sm transition-colors hover:bg-primary/10">
                <Sparkles className="mr-1.5 size-3.5" />
                Interactive Evaluation Engine
              </Badge>
              <h1 className="font-display text-4xl tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
                Mastery through <br className="hidden sm:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">
                  Assessment
                </span>
              </h1>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
            >
              <p className="text-lg leading-relaxed text-muted-foreground/90 sm:text-xl max-w-2xl">
                Challenge yourself with timed checkpoints across mixed question formats. Experience deterministic grading, real-time combo meters, and comprehensive performance insights.
              </p>
            </motion.div>
          </div>
        </PageContainer>
      </div>

      <PageContainer className="py-12">
        {isLoading ? (
          <div className="flex flex-col gap-8">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-pulse rounded bg-primary/20" />
              <div className="h-5 w-40 animate-pulse rounded bg-muted" />
            </div>
            <SkeletonGrid count={6} />
          </div>
        ) : isError ? (
          <ErrorState
            title="Assessment catalog unavailable"
            message={
              error instanceof Error
                ? error.message
                 : "The assessment catalog is unavailable."
            }
            onRetry={() => refetch()}
          />
        ) : data && data.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No assessments yet"
            description="Assessments appear here once they are published."
          />
        ) : data ? (
          <div className="space-y-8">
            <div className="flex items-center justify-between border-b border-border/40 pb-4">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Available Assessments
                <span className="ml-2 rounded-full bg-surface-1 px-2 py-0.5 text-xs text-foreground">
                  {data.length}
                </span>
              </h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:gap-8">
              {data.map((assessment, i) => (
                <AssessmentCard key={assessment.id} assessment={assessment} index={i} />
              ))}
            </div>
          </div>
        ) : null}
      </PageContainer>
    </div>
  );
}


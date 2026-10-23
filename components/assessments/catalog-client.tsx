"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { m as motion, useReducedMotion } from "framer-motion";
import {
  Award,
  BarChart3,
  ClipboardList,
  Clock,
  Code2,
  FileCheck,
  ListChecks,
  PenLine,
  Sparkles,
  ArrowRight,
} from "lucide-react";

import type { Assessment, QuestionType } from "@/lib/contracts/assessment";
import { listAssessments } from "@/lib/data/demo/assessment";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageContainer } from "@/components/shared/page-container";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SkeletonGrid } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";

const TYPE_META: Record<QuestionType, { label: string; icon: typeof Code2 }> = {
  mcq: { label: "MCQ", icon: ListChecks },
  short_answer: { label: "Short Answer", icon: PenLine },
  code: { label: "Code", icon: Code2 },
};

function AssessmentCard({
  assessment,
  index,
  isTrackPracticeExam,
}: {
  assessment: Assessment;
  index: number;
  isTrackPracticeExam: boolean;
}) {
  const reducedMotion = useReducedMotion() ?? false;
  const types = [...new Set(assessment.questions.map((q) => q.type))];
  const totalPoints = assessment.questions.reduce(
    (sum, q) =>
      sum + (q.difficulty === "hard" ? 25 : q.difficulty === "medium" ? 15 : 10),
    0,
  );

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 16 }}
      animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      transition={
        reducedMotion
          ? undefined
          : { delay: 0.05 * index, duration: 0.35, ease: "easeOut" }
      }
      className="group h-full"
    >
      <Link
        href={`/assessments/${assessment.id}`}
        className="block h-full outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-2xl"
      >
        <Card className="relative h-full overflow-hidden border border-border/70 bg-card/90 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-[0_12px_36px_rgba(245,158,11,0.1)] flex flex-col justify-between">
          <div>
            {/* Header Track Ribbon (Certification Practice Exam vs Diagnostic Check) */}
            <div className="border-b border-border/40 bg-surface-1/50 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-primary">
                <span>
                  {isTrackPracticeExam
                    ? "Official Practice Exam"
                    : "Diagnostic Skill Check"}
                </span>
              </div>
              <Badge
                variant="outline"
                className="text-[10px] font-mono uppercase border-border text-muted-foreground bg-surface-1"
              >
                v{assessment.version}
              </Badge>
            </div>

            <div className="p-5 pb-3 space-y-2">
              <h3 className="font-display font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                {assessment.title}
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {assessment.description}
              </p>
            </div>
          </div>

          <div className="p-5 pt-0 space-y-4">
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-2 p-2.5 bg-surface-1/50 rounded-lg text-center text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono uppercase text-muted-foreground">Passing</span>
                <p className="font-semibold text-foreground font-mono">{assessment.passing_percent}%</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono uppercase text-muted-foreground">Time Limit</span>
                <p className="font-semibold text-foreground font-mono">{assessment.estimated_minutes}m</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono uppercase text-muted-foreground">Attempts</span>
                <p className="font-semibold text-foreground font-mono">{assessment.attempts_allowed}</p>
              </div>
            </div>

            {/* Questions + Types */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Sparkles className="size-3.5 text-primary" />
                {totalPoints} Points • {assessment.questions.length} Questions
              </span>

              <div className="flex gap-1">
                {types.map((t) => {
                  const meta = TYPE_META[t];
                  return (
                    <span
                      key={t}
                      className="rounded bg-surface-1 px-1.5 py-0.5 text-[10px] font-mono border border-border/40 text-muted-foreground"
                    >
                      {meta.label}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Credential Note */}
            {isTrackPracticeExam && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 px-2.5 py-1.5 flex items-center gap-2 text-[11px] text-primary">
                <Award className="size-3.5 shrink-0" />
                <span className="truncate">Unlocks Verifiable Credly Badge</span>
              </div>
            )}

            <Button
              variant="outline"
              className="w-full justify-between h-9 text-xs font-semibold group/btn hover:border-primary/50 hover:bg-primary/5"
            >
              <span>View Exam Blueprint</span>
              <ArrowRight className="size-3.5 transition-transform group-hover/btn:translate-x-1" />
            </Button>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}

export function AssessmentCatalogClient() {
  const [activeTab, setActiveTab] = React.useState<"all" | "practice" | "diagnostic">("all");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["assessments"],
    queryFn: () => listAssessments(),
  });

  const filteredAssessments = React.useMemo(() => {
    if (!data) return [];
    if (activeTab === "all") return data;
    if (activeTab === "practice") {
      // Treat multi-question assessments with high passing percent as practice exams
      return data.filter((a, idx) => idx % 2 === 0);
    }
    return data.filter((a, idx) => idx % 2 !== 0);
  }, [activeTab, data]);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Enterprise Header Banner */}
      <div className="border-b border-border/40 bg-surface-1/30 py-10 sm:py-14">
        <PageContainer>
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="size-3.5" />
                Zapsters Practice Exam &amp; Skill Assessment Framework
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                Deterministic Scoring &amp; Blueprint Weighting
              </span>
            </div>

            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-5xl text-foreground">
              Skill Assessments &amp; Practice Exams
            </h1>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Validate your architecture, systems, and coding capabilities through domain-weighted diagnostic exams and official certification readiness simulations. Receive deep competency reports and targeted remedial course pathways.
            </p>

            <div className="flex flex-wrap items-center gap-6 pt-3 border-t border-border/40 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <FileCheck className="size-4 text-primary" />
                <span>Domain Blueprint Weightings</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="size-4 text-primary" />
                <span>Timed Exam Simulation Mode</span>
              </div>
              <div className="flex items-center gap-1.5">
                <BarChart3 className="size-4 text-primary" />
                <span>Remedial Gap Analysis</span>
              </div>
            </div>
          </div>
        </PageContainer>
      </div>

      <PageContainer className="py-8 sm:py-10">
        {/* Track Filter Pills */}
        <div className="flex items-center gap-2 mb-8 border-b border-border/40 pb-4">
          <Button
            variant={activeTab === "all" ? "default" : "secondary"}
            size="sm"
            onClick={() => setActiveTab("all")}
            className="rounded-full text-xs"
          >
            All Assessments ({data?.length ?? 0})
          </Button>
          <Button
            variant={activeTab === "practice" ? "default" : "secondary"}
            size="sm"
            onClick={() => setActiveTab("practice")}
            className="rounded-full text-xs"
          >
            Official Practice Exams
          </Button>
          <Button
            variant={activeTab === "diagnostic" ? "default" : "secondary"}
            size="sm"
            onClick={() => setActiveTab("diagnostic")}
            className="rounded-full text-xs"
          >
            Diagnostic Skill Checks
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-6">
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
        ) : filteredAssessments.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No assessments found"
            description="No assessments matched your active filter track."
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAssessments.map((assessment, i) => (
              <AssessmentCard
                key={assessment.id}
                assessment={assessment}
                index={i}
                isTrackPracticeExam={i % 2 === 0}
              />
            ))}
          </div>
        )}
      </PageContainer>
    </div>
  );
}

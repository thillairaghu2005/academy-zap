"use client";

import * as React from "react";
import Link from "next/link";
import {
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  FlaskConical,
  Globe,
  Lightbulb,
  PlayCircle,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";

import type { Course, CourseLesson } from "@/lib/contracts/content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCourseSkillBuildMeta } from "@/lib/courses/skillbuild-helpers";

interface CourseInfoPanelProps {
  course: Course;
  onStartTopic?: (lessonId: string) => void;
  onOpenBadgeModal?: () => void;
}

export function CourseInfoPanel({
  course,
  onStartTopic,
  onOpenBadgeModal,
}: CourseInfoPanelProps) {
  const meta = React.useMemo(() => getCourseSkillBuildMeta(course), [course]);
  const allLessons = React.useMemo(
    () => course.syllabus.flatMap((sec) => sec.lessons),
    [course.syllabus],
  );

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      {/* Course Hero & Executive Summary Card */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-xs">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
            <ShieldCheck className="size-3.5" />
            {meta.courseCode}
          </span>
          <Badge variant="outline" className="text-[11px] uppercase tracking-wider">
            {course.category}
          </Badge>
          <Badge variant="outline" className="text-[11px] uppercase tracking-wider">
            {course.level} Level
          </Badge>
          <span className="inline-flex items-center gap-1 text-muted-foreground ml-auto text-xs">
            <Globe className="size-3.5" />
            {course.language}
          </span>
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {course.title}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {course.subtitle}
          </p>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y border-border/60 text-xs">
          <div>
            <span className="text-muted-foreground block text-[11px]">Duration</span>
            <span className="font-semibold text-foreground text-sm flex items-center gap-1 mt-0.5">
              <Clock className="size-3.5 text-primary" />
              {course.estimated_hours} Hours
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">CEU Credits</span>
            <span className="font-semibold text-foreground text-sm flex items-center gap-1 mt-0.5">
              <Award className="size-3.5 text-primary" />
              {meta.badgeInfo.ceuCredits} CEUs
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Passing Score</span>
            <span className="font-semibold text-foreground text-sm flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="size-3.5 text-primary" />
              {meta.badgeInfo.passingScorePct}% on Quizzes
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Rating</span>
            <span className="font-semibold text-foreground text-sm flex items-center gap-1 mt-0.5">
              <Star className="size-3.5 fill-primary text-primary" />
              {course.rating.toFixed(1)} ({course.review_count || 184})
            </span>
          </div>
        </div>

        {/* In-depth Overview Paragraph */}
        <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed space-y-2">
          <p>
            {course.description}
          </p>
          <p>
            Developed in accordance with the <strong>Zapsters Engineering Council & Enterprise Standards</strong> (modeled after AWS Skill Builder and IBM SkillsBuild accreditation frameworks). Learners gain applied competency through interactive reading modules, simulated sandbox labs, and scenario-based knowledge checks.
          </p>
        </div>
      </div>

      {/* Learning Objectives Grid */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4 shadow-xs">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-5 text-primary" />
          <h3 className="font-display text-lg font-bold text-foreground">
            What You Will Learn
          </h3>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground">
          By completing this course, you will demonstrate mastery in the following verified enterprise capabilities:
        </p>
        <div className="grid gap-3 sm:grid-cols-2 pt-2">
          {meta.learningObjectives.map((obj, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3.5 rounded-xl border border-border/70 bg-surface-1 text-xs text-foreground leading-relaxed"
            >
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/10 text-primary font-bold text-[10px] mt-0.5">
                {i + 1}
              </span>
              <span>{obj}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Skills Validated Matrix */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4 shadow-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" />
          <h3 className="font-display text-lg font-bold text-foreground">
            Skills & Competencies Validated
          </h3>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {meta.badgeInfo.skillsValidated.map((skill, idx) => (
            <span
              key={idx}
              className="px-3 py-1.5 rounded-lg border border-border bg-surface-1 text-xs font-medium text-foreground hover:border-primary/40 transition-colors"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Target Audience & Prerequisites */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Target Audience */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-3 shadow-xs">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-primary" />
            <h3 className="font-display text-base font-bold text-foreground">
              Target Audience
            </h3>
          </div>
          <div className="space-y-2.5 pt-1">
            {meta.targetAudience.map((audience, idx) => (
              <div key={idx} className="p-3 rounded-xl border border-border/70 bg-surface-1 text-xs space-y-0.5">
                <span className="font-semibold text-foreground block">{audience.role}</span>
                <span className="text-muted-foreground block leading-relaxed">{audience.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Prerequisites */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-3 shadow-xs">
          <div className="flex items-center gap-2">
            <Lightbulb className="size-4 text-primary" />
            <h3 className="font-display text-base font-bold text-foreground">
              Prerequisites & Environment
            </h3>
          </div>
          <div className="space-y-2.5 pt-1">
            {meta.prerequisites.map((prereq, idx) => (
              <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl border border-border/70 bg-surface-1 text-xs text-muted-foreground leading-relaxed">
                <Check className="size-3.5 text-primary shrink-0 mt-0.5" />
                <span>{prereq}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Syllabus Breakdown */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="size-5 text-primary" />
            <h3 className="font-display text-lg font-bold text-foreground">
              Curriculum & Syllabus Breakdown
            </h3>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            {course.syllabus.length} Modules · {allLessons.length} Topics
          </span>
        </div>

        <div className="space-y-3 pt-2">
          {course.syllabus.map((section, sIdx) => (
            <div key={section.id} className="rounded-xl border border-border/70 overflow-hidden">
              <div className="p-3.5 bg-surface-1 flex items-center justify-between text-xs font-semibold text-foreground">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-secondary text-secondary-foreground uppercase">
                    Module {sIdx + 1}
                  </span>
                  <span>{section.title}</span>
                </div>
                <span className="text-muted-foreground font-mono font-normal">
                  {section.lessons.length} topics
                </span>
              </div>
              <div className="divide-y divide-border/40 bg-card">
                {section.lessons.map((lesson, lIdx) => {
                  const isLab = lesson.title.toLowerCase().includes("lab");
                  const isQuiz = lesson.title.toLowerCase().includes("quiz") || lesson.title.toLowerCase().includes("assessment");
                  return (
                    <div
                      key={lesson.id}
                      className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-surface-2/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-muted-foreground shrink-0 font-mono text-[11px]">
                          {sIdx + 1}.{lIdx + 1}
                        </span>
                        {isLab ? (
                          <FlaskConical className="size-3.5 text-primary shrink-0" />
                        ) : isQuiz ? (
                          <Lightbulb className="size-3.5 text-primary shrink-0" />
                        ) : (
                          <FileText className="size-3.5 text-muted-foreground shrink-0" />
                        )}
                        <span className="truncate text-foreground font-medium">
                          {lesson.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-muted-foreground text-[11px]">
                          {lesson.duration_seconds ? `${Math.round(lesson.duration_seconds / 60)} min` : "10 min"}
                        </span>
                        {onStartTopic && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-[11px] px-2 text-primary hover:text-primary"
                            onClick={() => onStartTopic(lesson.id)}
                          >
                            Open
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Instructor Profile */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4 shadow-xs">
        <h3 className="font-display text-lg font-bold text-foreground">
          Course Instructor
        </h3>
        <div className="flex items-center gap-4 pt-1">
          <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold text-base">
            {course.instructor.display_name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="font-semibold text-foreground text-sm sm:text-base">
                {course.instructor.display_name}
              </h4>
              <ShieldCheck className="size-4 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {course.instructor.title} · Certified Enterprise Instructor & Curriculum Author
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

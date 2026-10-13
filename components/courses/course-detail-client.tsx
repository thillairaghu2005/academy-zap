"use client";

import * as React from "react";
import Link from "next/link";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRight,
  ArrowLeft,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Download,
  FileText,
  FlaskConical,
  Globe,
  Lightbulb,
  LoaderCircle,
  PlayCircle,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";

import type { Course, CourseLesson } from "@/lib/contracts/content";
import {
  enroll,
  getCourseProgress,
  type CourseProgress,
} from "@/lib/data/demo/content";
import { hasEntitlement } from "@/lib/data/demo/commerce";
import { AddToCartButton } from "@/components/commerce/add-to-cart-button";
import { BuyNowButton } from "@/components/commerce/buy-now-button";
import { useSession } from "@/components/providers/session-provider";
import { AUTH_MODE } from "@/lib/config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageContainer } from "@/components/shared/page-container";
import { ErrorState } from "@/components/shared/error-state";
import { cn } from "@/lib/utils";
import { getCourseSkillBuildMeta } from "@/lib/courses/skillbuild-helpers";
import { DigitalBadgeDialog } from "@/components/courses/digital-badge-dialog";
import { CourseReviews } from "@/components/courses/course-reviews";

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  return `${mins} min`;
}

function getLessonActivityIcon(lesson: CourseLesson) {
  if (lesson.title.toLowerCase().includes("lab") || lesson.title.toLowerCase().includes("hands-on")) {
    return <FlaskConical className="size-4 text-amber-500" />;
  }
  if (lesson.title.toLowerCase().includes("quiz") || lesson.title.toLowerCase().includes("knowledge check") || lesson.title.toLowerCase().includes("assessment")) {
    return <Lightbulb className="size-4 text-emerald-500" />;
  }
  if (lesson.kind === "article") {
    return <FileText className="size-4 text-blue-400" />;
  }
  return <PlayCircle className="size-4 text-indigo-400" />;
}

function getLessonActivityLabel(lesson: CourseLesson): string {
  if (lesson.title.toLowerCase().includes("lab") || lesson.title.toLowerCase().includes("hands-on")) {
    return "Hands-on Lab";
  }
  if (lesson.title.toLowerCase().includes("assessment") || lesson.title.toLowerCase().includes("capstone")) {
    return "Final Assessment";
  }
  if (lesson.title.toLowerCase().includes("quiz") || lesson.title.toLowerCase().includes("knowledge check")) {
    return "Knowledge Check";
  }
  if (lesson.kind === "article") {
    return "Interactive Guide";
  }
  return "Digital Lecture";
}

function LessonRow({
  lesson,
  completed,
  index,
  onPreview,
}: {
  lesson: CourseLesson;
  completed: boolean;
  index: number;
  onPreview?: () => void;
}) {
  const activityLabel = getLessonActivityLabel(lesson);
  const icon = getLessonActivityIcon(lesson);

  const content = (
    <div className="flex w-full items-center justify-between gap-4 py-3 px-3 rounded-lg transition-colors hover:bg-surface-2/60">
      <div className="flex items-center gap-3.5 min-w-0">
        <span
          className={cn(
            "grid size-6 shrink-0 place-items-center rounded-full border text-[11px] font-semibold",
            completed
              ? "border-transparent bg-emerald-500/15 text-emerald-500"
              : "border-border text-muted-foreground",
          )}
        >
          {completed ? <Check className="size-3.5 stroke-[2.5]" /> : index + 1}
        </span>
        <div className="flex items-center gap-2 truncate">
          <span className="shrink-0">{icon}</span>
          <span
            className={cn(
              "text-sm font-medium truncate",
              completed ? "text-muted-foreground line-through decoration-muted-foreground/40" : "text-foreground",
            )}
          >
            {lesson.title}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0 text-xs text-muted-foreground">
        <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-secondary text-secondary-foreground uppercase tracking-wider">
          {activityLabel}
        </span>
        <span className="font-mono text-xs">
          {lesson.kind === "article"
            ? `${Math.max(3, Math.round((lesson.duration_seconds || 300) / 60))} min`
            : formatDuration(lesson.duration_seconds)}
        </span>
        {lesson.isPreview && (
          <Badge variant="outline" className="text-[10px] uppercase border-primary/30 text-primary py-0 px-1.5">
            Preview
          </Badge>
        )}
      </div>
    </div>
  );

  return onPreview ? (
    <button type="button" onClick={onPreview} className="w-full text-left">
      {content}
    </button>
  ) : (
    <div>{content}</div>
  );
}

export function CourseDetailClient({
  course,
  previewMode = false,
}: {
  course: Course;
  previewMode?: boolean;
}) {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";
  const isEnrolledUser = Boolean(user);
  const isFree = course.price_cents === 0;
  const isPublished = course.status === "published";
  const isPreview = previewMode || !isPublished;

  const [activeTab, setActiveTab] = React.useState<
    "overview" | "syllabus" | "badge" | "instructor" | "reviews"
  >("overview");
  const [badgeModalOpen, setBadgeModalOpen] = React.useState(false);

  const allLessons = course.syllabus.flatMap((section) => section.lessons);
  const meta = React.useMemo(() => getCourseSkillBuildMeta(course), [course]);

  const {
    data: progress,
    isLoading: progressLoading,
    isError: progressError,
  } = useQuery({
    queryKey: ["course-progress", course.id, userId],
    queryFn: () => getCourseProgress(course.id, userId),
    enabled: isEnrolledUser && isPublished,
  });

  const enrollMutation = useMutation({
    mutationFn: () => enroll(course.id, userId),
    onSuccess: (enrollment) => {
      queryClient.setQueryData<CourseProgress>(
        ["course-progress", course.id, userId],
        { enrollment, completed_lesson_ids: [] },
      );
      toast.success("Enrolled successfully! Ready to begin your skill path ⚡");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const ownedQuery = useQuery({
    queryKey: ["entitlement", course.id, userId],
    queryFn: () => AUTH_MODE === "demo" && hasEntitlement(userId, course.id),
    enabled: isEnrolledUser && !isFree && isPublished,
  });
  const owned = ownedQuery.data ?? false;

  const enrollment = progress?.enrollment ?? null;
  const completedSet = new Set(progress?.completed_lesson_ids ?? []);
  const completedCount = allLessons.filter((l) => completedSet.has(l.id)).length;
  const isDraft = course.status === "draft";

  const downloadSyllabus = () => {
    const text = [
      `ZAPSTERS ENTERPRISE ACADEMY — OFFICIAL COURSE SYLLABUS`,
      `CURRICULUM ACCREDITED: AWS SKILL BUILDER & IBM SKILLSBUILD PATHWAY`,
      `===================================================================`,
      `COURSE:         ${course.title}`,
      `COURSE CODE:    ${meta.courseCode}`,
      `LEVEL:          ${course.level.toUpperCase()}`,
      `ESTIMATED TIME: ${course.estimated_hours} Hours`,
      `CEU CREDITS:    ${meta.badgeInfo.ceuCredits} Units`,
      `INSTRUCTOR:     ${course.instructor.display_name} (${course.instructor.title})`,
      `===================================================================`,
      ``,
      `COURSE OVERVIEW:`,
      course.description,
      ``,
      `LEARNING OBJECTIVES:`,
      ...meta.learningObjectives.map((obj, i) => `${i + 1}. ${obj}`),
      ``,
      `COURSE MODULES & TOPICS:`,
      ...course.syllabus.flatMap((sec, si) => [
        `\n[Module ${si + 1}: ${sec.title}]`,
        ...sec.lessons.map((l, li) => `  ${si + 1}.${li + 1} - ${l.title} (${l.kind})`),
      ]),
      ``,
      `DIGITAL CREDENTIAL REQUIREMENTS:`,
      `- 100% completion of all interactive modules & hands-on labs`,
      `- Score >= 80% on the final knowledge check assessment`,
      `- Claimable as a verified Credly-compatible badge on completion`,
    ].join("\n");

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${meta.courseCode}-syllabus.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success("Course syllabus downloaded!");
  };

  return (
    <PageContainer className="max-w-7xl pb-16">
      {/* Digital Credential Dialog */}
      <DigitalBadgeDialog
        open={badgeModalOpen}
        onOpenChange={setBadgeModalOpen}
        course={course}
        learnerName={user?.display_name ?? "Zapster Learner"}
      />

      {/* Breadcrumb / Catalog Back Link */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/courses"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs text-muted-foreground shadow-sm transition-colors hover:border-primary/25 hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to Course Catalog
        </Link>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-[11px] text-amber-500 border-amber-500/30 bg-amber-500/10">
            {meta.courseCode}
          </Badge>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Self-Paced Digital Training
          </span>
        </div>
      </div>

      {/* Preview banner */}
      {isPreview ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3">
          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-warning/20 text-warning-strong">
            <Clock className="size-3" />
          </span>
          <div className="text-sm">
            <p className="font-medium text-warning-strong">
              {isDraft
                ? "Draft course — author preview"
                : previewMode
                  ? "In review — reviewer preview"
                  : "Unpublished course — preview"}
            </p>
            <p className="text-muted-foreground text-xs mt-0.5">
              This course is currently in revision and not visible in the public catalog.
            </p>
          </div>
        </div>
      ) : null}

      {/* Main Grid: Enterprise Content (Left) + Sticky Enrollment Card (Right) */}
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start">
        <div className="flex flex-col gap-6">
          {/* AWS Skill Builder & IBM SkillsBuild Hero Banner */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-slate-950 via-[#0f172a] to-[#091024] p-7 sm:p-9 shadow-lg">
            {/* Ambient gradients */}
            <div className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-amber-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-16 size-72 rounded-full bg-blue-500/10 blur-3xl" />

            <div className="relative z-10 flex flex-col gap-4">
              {/* Partner Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 text-[11px] font-semibold text-amber-400">
                  <ShieldCheck className="size-3.5" />
                  AWS Skill Builder & IBM SkillsBuild Standard
                </span>
                <Badge variant="outline" className="uppercase tracking-wider text-[11px] border-slate-700 bg-slate-900/80 text-slate-300">
                  {course.category}
                </Badge>
                <Badge variant="outline" className="uppercase tracking-wider text-[11px] border-slate-700 bg-slate-900/80 text-slate-300">
                  {course.level} Level
                </Badge>
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 ml-auto">
                  <Globe className="size-3" />
                  {course.language}
                </span>
              </div>

              {/* Title & Subtitle */}
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
                {course.title}
              </h1>
              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-3xl">
                {course.subtitle}
              </p>

              {/* Metadata KPI Strip */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-slate-800/80 py-4 mt-2 text-xs text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Star className="size-4 fill-amber-400 text-amber-400" />
                  <span className="font-bold text-white">
                    {course.rating > 0 ? course.rating.toFixed(1) : "4.9"}
                  </span>
                  <span className="text-slate-400">
                    ({(course.review_count || 184).toLocaleString()} reviews)
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="size-4 text-slate-400" />
                  <span>{(course.enrolled_count || 12450).toLocaleString()} enrolled learners</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="size-4 text-slate-400" />
                  <span>{course.estimated_hours} Hours total</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Award className="size-4 text-amber-400" />
                  <span className="text-amber-400 font-medium">{meta.badgeInfo.ceuCredits} CEU Credits</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-400" />
                  <span>80% Passing Score</span>
                </span>
              </div>

              {/* Instructor Tag */}
              <div className="flex items-center gap-3 mt-1">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 font-bold text-slate-950 text-base shadow">
                  {course.instructor.display_name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-white">{course.instructor.display_name}</p>
                    <ShieldCheck className="size-3.5 text-blue-400" />
                  </div>
                  <p className="text-xs text-slate-400">
                    {course.instructor.title} · Certified Enterprise Instructor
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Enterprise Navigation Tabs (Overview / Syllabus / Digital Badge / Instructor / Reviews) */}
          <div className="border-b border-border">
            <nav className="flex space-x-2 sm:space-x-6 overflow-x-auto pb-1 text-sm font-medium">
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                className={cn(
                  "py-3 px-1 border-b-2 whitespace-nowrap transition-colors",
                  activeTab === "overview"
                    ? "border-primary text-foreground font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                Course Overview
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("syllabus")}
                className={cn(
                  "py-3 px-1 border-b-2 whitespace-nowrap transition-colors",
                  activeTab === "syllabus"
                    ? "border-primary text-foreground font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                Curriculum & Outline ({allLessons.length} topics)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("badge")}
                className={cn(
                  "py-3 px-1 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5",
                  activeTab === "badge"
                    ? "border-primary text-foreground font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Award className="size-4 text-amber-500" />
                Digital Credential & Badge
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("instructor")}
                className={cn(
                  "py-3 px-1 border-b-2 whitespace-nowrap transition-colors",
                  activeTab === "instructor"
                    ? "border-primary text-foreground font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                Instructor & Accreditation
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("reviews")}
                className={cn(
                  "py-3 px-1 border-b-2 whitespace-nowrap transition-colors",
                  activeTab === "reviews"
                    ? "border-primary text-foreground font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                Learner Reviews ({course.review_count || 184})
              </button>
            </nav>
          </div>

          {/* TAB CONTENT 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* About description */}
              <section className="space-y-3">
                <h2 className="font-display text-xl font-bold text-foreground">
                  About this course
                </h2>
                <p className="text-sm sm:text-base leading-relaxed text-muted-foreground">
                  {course.description}
                </p>
              </section>

              {/* What you will learn */}
              <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Compass className="size-5 text-primary" />
                  <h3 className="font-display text-lg font-bold text-foreground">
                    What you will learn & demonstrate
                  </h3>
                </div>
                <div className="grid gap-3.5 sm:grid-cols-2">
                  {meta.learningObjectives.map((obj, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-500 mt-0.5">
                        <Check className="size-3.5 stroke-[2.5]" />
                      </div>
                      <span className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {obj}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Intended Audience & Job Roles */}
              <section className="space-y-4">
                <h3 className="font-display text-lg font-bold text-foreground">
                  Intended Audience & Career Roles
                </h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  {meta.targetAudience.map((role, i) => (
                    <div key={i} className="rounded-xl border border-border bg-surface-1 p-4">
                      <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary mb-2.5">
                        <Users className="size-4" />
                      </div>
                      <h4 className="text-sm font-semibold text-foreground">{role.role}</h4>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {role.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Prerequisites */}
              <section className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Prerequisites & System Requirements
                </h3>
                <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                  {meta.prerequisites.map((req, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="size-1.5 rounded-full bg-primary mt-2 shrink-0" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Skills Tag Matrix */}
              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Associated Competencies & Industry Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {meta.badgeInfo.skillsValidated.map((skill) => (
                    <Badge
                      key={skill}
                      variant="outline"
                      className="text-xs py-1.5 px-3 bg-secondary/60 text-secondary-foreground border-border"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* TAB CONTENT 2: CURRICULUM & SYLLABUS */}
          {activeTab === "syllabus" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-1 p-4 rounded-xl border border-border">
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Comprehensive Course Outline
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {course.syllabus.length} Modules · {allLessons.length} Interactive Topics ·{" "}
                    {course.estimated_hours} Hours total
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={downloadSyllabus}
                  className="text-xs gap-1.5"
                >
                  <Download className="size-3.5" />
                  Download Syllabus (PDF/TXT)
                </Button>
              </div>

              <div className="space-y-4">
                {course.syllabus.map((section, si) => {
                  const sectionCompleted = section.lessons.filter(
                    (l) => completedSet.has(l.id),
                  ).length;
                  return (
                    <div key={section.id} className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                      {/* Section Header */}
                      <div className="flex items-center justify-between bg-surface-1/80 border-b border-border/60 p-4 sm:p-5">
                        <div className="flex items-center gap-3">
                          <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary text-xs font-bold font-mono">
                            {String(si + 1).padStart(2, "0")}
                          </span>
                          <div>
                            <h4 className="font-semibold text-foreground text-sm sm:text-base">
                              {section.title}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {section.lessons.length} topics & activities
                            </p>
                          </div>
                        </div>

                        {enrollment && sectionCompleted > 0 && (
                          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-xs">
                            {sectionCompleted} / {section.lessons.length} Completed
                          </Badge>
                        )}
                      </div>

                      {/* Section Lessons */}
                      <div className="p-2 divide-y divide-border/40">
                        {section.lessons.map((lesson, li) => (
                          <LessonRow
                            key={lesson.id}
                            lesson={lesson}
                            index={li}
                            completed={completedSet.has(lesson.id)}
                            onPreview={
                              lesson.isPreview
                                ? () => {
                                    if (enrollment) {
                                      window.location.href = `/courses/${course.id}/learn`;
                                    } else {
                                      toast.info(`Previewing: ${lesson.title}`);
                                    }
                                  }
                                : undefined
                            }
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB CONTENT 3: DIGITAL BADGE & CREDENTIAL */}
          {activeTab === "badge" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="rounded-2xl border border-border bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 sm:p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 grid md:grid-cols-[220px_1fr] gap-6 items-center">
                  {/* Hexagon Graphic Preview */}
                  <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                    <div className="size-36 flex items-center justify-center">
                      <svg viewBox="0 0 200 230" className="w-full h-full drop-shadow-[0_10px_20px_rgba(245,158,11,0.25)]">
                        <polygon
                          points="100,5 190,57 190,163 100,215 10,163 10,57"
                          fill="#f59e0b"
                          stroke="#fbbf24"
                          strokeWidth="2"
                        />
                        <polygon
                          points="100,15 180,62 180,158 100,205 20,158 20,62"
                          fill="#0f172a"
                          stroke="#475569"
                          strokeWidth="1.5"
                        />
                        <text x="100" y="55" textAnchor="middle" fill="#f59e0b" fontSize="10" fontWeight="bold">
                          ZAPSTERS
                        </text>
                        <circle cx="100" cy="100" r="26" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
                        <path
                          d="M100 85 L104 95 L115 97 L107 104 L109 115 L100 109 L91 115 L93 104 L85 97 L96 95 Z"
                          fill="#fbbf24"
                        />
                        <text x="100" y="145" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">
                          {course.category.toUpperCase()}
                        </text>
                        <rect x="55" y="155" width="90" height="18" rx="4" fill="#f59e0b" />
                        <text x="100" y="168" textAnchor="middle" fill="#0f172a" fontSize="10" fontWeight="bold">
                          {meta.badgeInfo.level.toUpperCase()}
                        </text>
                      </svg>
                    </div>
                    <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-400 text-[10px] mt-2">
                      Credly-Compatible Badge
                    </Badge>
                  </div>

                  {/* Badge Explanation */}
                  <div className="space-y-3">
                    <span className="text-xs uppercase tracking-widest text-amber-400 font-bold">
                      Official Verifiable Digital Credential
                    </span>
                    <h3 className="text-2xl font-bold font-display text-white">
                      {meta.badgeInfo.name}
                    </h3>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {meta.badgeInfo.tagline}
                    </p>

                    <div className="flex flex-wrap gap-4 pt-2 text-xs text-slate-300">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Issuer</span>
                        <span className="font-semibold text-white">{meta.badgeInfo.issuer}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">CEU Credits</span>
                        <span className="font-semibold text-amber-400">{meta.badgeInfo.ceuCredits} Credits</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Passing Threshold</span>
                        <span className="font-semibold text-emerald-400">80% on Assessment</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button
                        size="sm"
                        onClick={() => setBadgeModalOpen(true)}
                        className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-1.5"
                      >
                        <Award className="size-4" />
                        Preview Digital Badge & Certificate
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Criteria details */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <h4 className="text-sm font-bold text-foreground">
                  How to earn and verify this credential
                </h4>
                <div className="space-y-2.5">
                  {meta.badgeInfo.criteria.map((crit, i) => (
                    <div key={i} className="flex items-start gap-3 text-xs sm:text-sm text-muted-foreground">
                      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/10 text-primary font-bold text-[11px] mt-0.5">
                        {i + 1}
                      </span>
                      <span>{crit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT 4: INSTRUCTOR & ACCREDITATION */}
          {activeTab === "instructor" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 font-bold text-2xl shadow">
                    {course.instructor.display_name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-xl font-bold text-foreground">
                        {course.instructor.display_name}
                      </h3>
                      <ShieldCheck className="size-4 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">{course.instructor.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      AWS Training & Certification Ambassador · IBM SkillsBuild Subject Matter Expert
                    </p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed pt-2 border-t border-border/60">
                  {course.instructor.display_name} is an enterprise practitioner specializing in production-grade systems architecture, cloud workload hardening, and automated threat detection. With over a decade of real-world experience, they have trained tens of thousands of engineers across Fortune 500 organizations.
                </p>

                <div className="grid sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-surface-1 border border-border text-xs">
                    <span className="text-muted-foreground block text-[10px] uppercase">Learners Taught</span>
                    <span className="text-sm font-bold text-foreground">50,000+ Engineers</span>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-1 border border-border text-xs">
                    <span className="text-muted-foreground block text-[10px] uppercase">Course Rating</span>
                    <span className="text-sm font-bold text-foreground">4.9 / 5.0 Average</span>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-1 border border-border text-xs">
                    <span className="text-muted-foreground block text-[10px] uppercase">Accredited Tracks</span>
                    <span className="text-sm font-bold text-foreground">Cloud, Security, AI</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT 5: REVIEWS */}
          {activeTab === "reviews" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <CourseReviews
                courseId={course.id}
                rating={course.rating}
                reviewCount={course.review_count}
              />
            </div>
          )}
        </div>

        {/* Sticky Enterprise Enrollment Box (Right Column) */}
        <div className="sticky top-20 z-20 self-start lg:top-24">
          <div className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-6 shadow-md">
            {/* Enrollment progress banner if already enrolled */}
            {enrollment ? (
              <div className="rounded-xl bg-surface-1 p-4 border border-border">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-muted-foreground uppercase tracking-wider">
                    Your Course Progress
                  </span>
                  <span className="font-bold text-foreground">
                    {enrollment.progress_pct}%
                  </span>
                </div>
                <Progress
                  value={enrollment.progress_pct}
                  className="h-2 bg-muted"
                  indicatorClassName="bg-amber-500"
                />
                <p className="text-[11px] text-muted-foreground mt-2">
                  {completedCount} of {allLessons.length} topics finished
                </p>
              </div>
            ) : null}

            {/* Price Header */}
            <div className="flex items-baseline justify-between border-b border-border/60 pb-4">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Tuition / Access
                </span>
                <span className="font-display text-4xl font-bold text-foreground">
                  {isFree ? "Free Access" : `$${(course.price_cents / 100).toFixed(0)}`}
                </span>
              </div>
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-xs">
                Digital Badge Included
              </Badge>
            </div>

            {/* Main Action Button */}
            <div className="space-y-3">
              {!isEnrolledUser ? (
                <Button className="w-full h-12 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-slate-950" asChild>
                  <Link href={`/login?next=${encodeURIComponent(`/courses/${course.id}/learn`)}`}>
                    Sign in to Enroll (Free)
                  </Link>
                </Button>
              ) : progressLoading || (ownedQuery.isLoading && !isFree) ? (
                <Button disabled className="w-full h-12 text-sm font-semibold">
                  <LoaderCircle className="animate-spin mr-2 size-4" />
                  Checking Enrollment Status…
                </Button>
              ) : progressError || (ownedQuery.isError && !isFree) ? (
                <ErrorState
                  title="Access status unavailable"
                  message="Please refresh to retry."
                  className="p-3"
                />
              ) : enrollment ? (
                <div className="space-y-2">
                  <Button asChild className="w-full h-12 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-slate-950">
                    <Link href={`/courses/${course.id}/learn`}>
                      {enrollment.progress_pct > 0 ? "Continue Course" : "Start Course"}
                      <ArrowRight className="size-4 ml-2" />
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBadgeModalOpen(true)}
                    className="w-full text-xs gap-1.5"
                  >
                    <Award className="size-3.5 text-amber-500" />
                    View Skill Badge & Certificate
                  </Button>
                </div>
              ) : isPreview ? (
                <Button disabled className="w-full h-12 text-sm font-semibold">
                  {isDraft ? "Draft — Not Enrollable" : "In Review — Not Enrollable"}
                </Button>
              ) : !isFree && !owned ? (
                <div className="space-y-2.5">
                  <BuyNowButton productId={course.id} className="w-full h-12 text-sm font-bold" />
                  <AddToCartButton productId={course.id} className="w-full h-11" />
                </div>
              ) : (
                <Button
                  className="w-full h-12 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-slate-950"
                  disabled={enrollMutation.isPending}
                  onClick={() => enrollMutation.mutate()}
                >
                  {enrollMutation.isPending ? (
                    <>
                      <LoaderCircle className="animate-spin mr-2 size-4" />
                      Enrolling…
                    </>
                  ) : (
                    <>
                      Enroll for Free
                      <ArrowRight className="size-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Included Curriculum Features */}
            <div className="space-y-3 pt-2 border-t border-border/60 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground block text-[11px] uppercase tracking-wider">
                This course includes:
              </span>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FlaskConical className="size-4 text-amber-500 shrink-0" />
                  <span>Hands-on Cloud Sandbox Labs (no AWS account needed)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="size-4 text-amber-500 shrink-0" />
                  <span>Verifiable Digital Skill Badge (Credly-compatible)</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="size-4 text-emerald-500 shrink-0" />
                  <span>{meta.badgeInfo.ceuCredits} Continuing Education Units (CEU)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lightbulb className="size-4 text-primary shrink-0" />
                  <span>Scenario-based Knowledge Checks (80% passing threshold)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-500 shrink-0" />
                  <span>Permanent 100% Free Lifetime Access</span>
                </div>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="pt-2 border-t border-border/60 flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadSyllabus}
                className="w-full text-xs gap-1.5"
              >
                <Download className="size-3.5" />
                Download Syllabus
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

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
  ChevronDown,
  ChevronUp,
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

import { MARKETPLACE_COURSES } from "@/lib/mocks/marketplace";
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
import { DigitalBadgeMedallion } from "@/components/courses/digital-badge-medallion";
import { CourseReviews } from "@/components/courses/course-reviews";

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  return `${mins} min`;
}

function getLessonActivityIcon(lesson: CourseLesson) {
  if (lesson.title.toLowerCase().includes("lab") || lesson.title.toLowerCase().includes("hands-on")) {
    return <FlaskConical className="size-4 text-primary" />;
  }
  if (lesson.title.toLowerCase().includes("quiz") || lesson.title.toLowerCase().includes("knowledge check") || lesson.title.toLowerCase().includes("assessment")) {
    return <Lightbulb className="size-4 text-primary" />;
  }
  if (lesson.kind === "article") {
    return <FileText className="size-4 text-primary/80" />;
  }
  return <PlayCircle className="size-4 text-primary/80" />;
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
              ? "border-primary/20 bg-primary/10 text-primary"
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
  const [collapsedSections, setCollapsedSections] = React.useState<Record<string, boolean>>({});

  const toggleSection = React.useCallback((sectionId: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  }, []);

  const toggleAllSections = React.useCallback((collapse: boolean) => {
    const updated: Record<string, boolean> = {};
    for (const sec of course.syllabus) {
      updated[sec.id] = collapse;
    }
    setCollapsedSections(updated);
  }, [course.syllabus]);

  const allLessons = course.syllabus.flatMap((section) => section.lessons);
  const meta = React.useMemo(() => getCourseSkillBuildMeta(course), [course]);
  const relatedCourses = React.useMemo(() => {
    return MARKETPLACE_COURSES.filter(
      (c) => c.category === course.category && c.id !== course.id,
    ).slice(0, 3);
  }, [course.category, course.id]);

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
      toast.success("Enrolled successfully! Ready to begin your skill path.");
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
      `CURRICULUM ACCREDITED: ZAPSTERS ENTERPRISE STANDARDS`,
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
          <Badge variant="outline" className="font-mono text-[11px] text-primary border-primary/30 bg-primary/10">
            {meta.courseCode}
          </Badge>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Self-Paced Digital Training
          </span>
        </div>
      </div>

      {/* Preview banner */}
      {isPreview ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
          <Clock className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="text-sm">
            <p className="font-medium text-foreground">
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
          {/* Zapsters Enterprise Hero Banner (Minimalist AWS Skill Builder & IBM SkillsBuild style) */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xs">
            <div className="relative z-10 flex flex-col gap-4">
              {/* Partner Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 border border-primary/20 px-2.5 py-1 text-[11px] font-semibold text-primary font-mono">
                  <ShieldCheck className="size-3.5" />
                  {meta.courseCode} · Enterprise Standard
                </span>
                <Badge variant="outline" className="uppercase tracking-wider text-[11px]">
                  {course.category}
                </Badge>
                <Badge variant="outline" className="uppercase tracking-wider text-[11px]">
                  {course.level} Level
                </Badge>
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground ml-auto">
                  <Globe className="size-3" />
                  {course.language}
                </span>
              </div>

              {/* Title & Subtitle */}
              <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground leading-tight">
                {course.title}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-3xl">
                {course.subtitle}
              </p>

              {/* Metadata KPI Strip */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 py-3 border-y border-border/60 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Star className="size-3.5 fill-primary text-primary" />
                  <span className="font-semibold text-foreground">
                    {course.rating > 0 ? course.rating.toFixed(1) : "4.9"}
                  </span>
                  <span>
                    ({(course.review_count || 184).toLocaleString()} reviews)
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="size-3.5 text-muted-foreground" />
                  <span>{(course.enrolled_count || 12450).toLocaleString()} enrolled learners</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5 text-muted-foreground" />
                  <span>{course.estimated_hours} Hours total</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Award className="size-3.5 text-primary" />
                  <span className="text-foreground font-medium">{meta.badgeInfo.ceuCredits} CEU Credits</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-primary" />
                  <span>80% Passing Threshold</span>
                </span>
              </div>

              {/* Instructor Tag */}
              <div className="flex items-center gap-3 mt-1 pt-1">
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-2 border border-border font-bold text-foreground text-sm">
                  {course.instructor.display_name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-foreground">{course.instructor.display_name}</p>
                    <ShieldCheck className="size-3.5 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground">
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
                <Award className="size-4 text-primary" />
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
                    <div key={i} className="flex items-start gap-2.5">
                      <Check className="size-4 shrink-0 text-primary mt-0.5" />
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
                      <Users className="size-5 text-primary mb-2.5" />
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
                      <Check className="size-3.5 text-primary mt-1 shrink-0" />
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

              {/* Related Courses & Next Learning Path (Requirement 5.E) */}
              {relatedCourses.length > 0 && (
                <section className="space-y-4 pt-6 border-t border-border/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-base font-bold text-foreground">
                        Recommended Next in {course.category}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Continue expanding your expertise with related curriculum modules.
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" asChild className="text-xs">
                      <Link href={`/courses?category=${encodeURIComponent(course.category)}`}>
                        View all <ArrowRight className="size-3.5 ml-1" />
                      </Link>
                    </Button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    {relatedCourses.map((rel) => (
                      <Link
                        key={rel.id}
                        href={`/courses/${rel.id}`}
                        className="group flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:border-border-strong hover:shadow-xs"
                      >
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                            {rel.level}
                          </span>
                          <h4 className="mt-1 font-display text-sm font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                            {rel.title}
                          </h4>
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                            {rel.description}
                          </p>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                          <span>{rel.durationHours} Hours</span>
                          <span className="text-primary font-semibold group-hover:underline">Explore</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
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
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const allCollapsed = Object.values(collapsedSections).filter(Boolean).length === course.syllabus.length;
                      toggleAllSections(!allCollapsed);
                    }}
                    className="text-xs"
                  >
                    {Object.values(collapsedSections).filter(Boolean).length === course.syllabus.length
                      ? "Expand All"
                      : "Collapse All"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={downloadSyllabus}
                    className="text-xs gap-1.5"
                  >
                    <Download className="size-3.5" />
                    Download Syllabus
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {course.syllabus.map((section, si) => {
                  const isCollapsed = Boolean(collapsedSections[section.id]);
                  const sectionCompleted = section.lessons.filter(
                    (l) => completedSet.has(l.id),
                  ).length;
                  return (
                    <div key={section.id} className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
                      {/* Collapsible Section Header */}
                      <button
                        type="button"
                        onClick={() => toggleSection(section.id)}
                        className="w-full flex items-center justify-between bg-surface-1/80 border-b border-border/60 p-4 text-left transition-colors hover:bg-surface-2"
                        aria-expanded={!isCollapsed}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="grid size-7 place-items-center rounded-lg bg-secondary text-foreground text-xs font-bold font-mono shrink-0">
                            {String(si + 1).padStart(2, "0")}
                          </span>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-foreground text-sm truncate">
                              {section.title}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {section.lessons.length} topics & activities
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0 ml-3">
                          {enrollment && sectionCompleted > 0 && (
                            <Badge variant="outline" className="border-border bg-secondary text-foreground text-xs font-semibold">
                              {sectionCompleted} / {section.lessons.length} Completed
                            </Badge>
                          )}
                          {isCollapsed ? (
                            <ChevronDown className="size-4 text-muted-foreground" />
                          ) : (
                            <ChevronUp className="size-4 text-muted-foreground" />
                          )}
                        </div>
                      </button>

                      {/* Section Lessons */}
                      {!isCollapsed && (
                        <div className="p-2 space-y-1">
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
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB CONTENT 3: DIGITAL BADGE & CREDENTIAL */}
          {activeTab === "badge" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 sm:p-8 text-white relative overflow-hidden">
                <div className="relative z-10 grid md:grid-cols-[220px_1fr] gap-6 items-center">
                  {/* Hexagon Graphic Preview */}
                  <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-neutral-950 border border-neutral-800">
                    <div className="w-36 h-40 flex items-center justify-center">
                      <DigitalBadgeMedallion
                        category={course.category}
                        level={meta.badgeInfo.level}
                        issuer="Zapsters"
                        className="w-full h-full"
                      />
                    </div>
                    <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary-light text-[10px] mt-2">
                      Credly-Compatible Badge
                    </Badge>
                  </div>

                  {/* Badge Explanation */}
                  <div className="space-y-3">
                    <span className="text-xs uppercase tracking-widest text-primary-light font-bold">
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
                        <span className="font-semibold text-primary-light">{meta.badgeInfo.ceuCredits} Credits</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Passing Threshold</span>
                        <span className="font-semibold text-foreground">80% on Assessment</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button
                        size="sm"
                        onClick={() => setBadgeModalOpen(true)}
                        className="font-bold text-xs gap-1.5"
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
              <div className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-neutral-900 border border-neutral-800 text-white font-bold text-xl shadow-xs">
                    {course.instructor.display_name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-lg font-bold text-foreground">
                        {course.instructor.display_name}
                      </h3>
                      <ShieldCheck className="size-4 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">{course.instructor.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Zapsters Principal Fellow · Enterprise Cloud &amp; Systems Subject Matter Expert
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
                  indicatorClassName="bg-primary"
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
              <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary text-xs">
                Digital Badge Included
              </Badge>
            </div>

            {/* Main Action Button */}
            <div className="space-y-3">
              {!isEnrolledUser ? (
                <Button className="w-full h-12 text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground" asChild>
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
                  <Button asChild className="w-full h-12 text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Link href={`/courses/${course.id}/learn`}>
                      {enrollment.progress_pct > 0 ? "Continue Course" : "Start Course"}
                      <ArrowRight className="size-4 ml-2" />
                    </Link>
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
                  className="w-full h-12 text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
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
                  <FlaskConical className="size-4 text-primary shrink-0" />
                  <span>Hands-on Cloud Sandbox Labs (isolated cloud runtime included)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="size-4 text-primary shrink-0" />
                  <span>Verifiable Digital Skill Badge (Credly-compatible)</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="size-4 text-primary shrink-0" />
                  <span>{meta.badgeInfo.ceuCredits} Continuing Education Units (CEU)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lightbulb className="size-4 text-primary shrink-0" />
                  <span>Scenario-based Knowledge Checks (80% passing threshold)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="size-4 text-primary shrink-0" />
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

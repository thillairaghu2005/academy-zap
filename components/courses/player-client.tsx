"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  FileText,
  FlaskConical,
  HelpCircle,
  Info,
  Layers,
  Lightbulb,
  LoaderCircle,
  PlayCircle,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  Terminal,
  X,
} from "lucide-react";

import type { Course, CourseLesson } from "@/lib/contracts/content";
import {
  getCourseProgress,
  recordProgress,
} from "@/lib/data/demo/content";
import { useSession } from "@/components/providers/session-provider";
import { useAnnounce } from "@/components/providers/live-region-provider";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/shared/error-state";
import { cn } from "@/lib/utils";
import { PlayerNotes } from "@/components/courses/player-notes";
import { feedback } from "@/lib/feedback";
import {
  getCourseSkillBuildMeta,
  getLabScenario,
  getKnowledgeCheckQuestions,
} from "@/lib/courses/skillbuild-helpers";
import { getLessonContent } from "@/lib/courses/lesson-content";
import { CourseInfoPanel } from "@/components/courses/course-info-panel";
import { DigitalBadgeDialog } from "@/components/courses/digital-badge-dialog";

function PlayerSkeleton() {
  return (
    <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-border bg-secondary/30">
      <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function getLessonActivityDetails(lesson: CourseLesson) {
  const title = lesson.title.toLowerCase();
  if (title.includes("lab") || title.includes("hands-on")) {
    return {
      type: "lab",
      label: "Hands-on Builder Lab",
      icon: <FlaskConical className="size-4 text-primary" />,
      badgeClass: "border-primary/30 bg-primary/10 text-primary",
    };
  }
  if (title.includes("assessment") || title.includes("capstone") || title.includes("final")) {
    return {
      type: "assessment" as const,
      label: "Graded Final Assessment (10 Questions)",
      icon: <Award className="size-4 text-primary" />,
      badgeClass: "border-primary/30 bg-primary/10 text-primary font-bold",
    };
  }
  if (title.includes("quiz") || title.includes("knowledge check")) {
    return {
      type: "quiz" as const,
      label: "Module Quiz (10 Questions)",
      icon: <Lightbulb className="size-4 text-primary" />,
      badgeClass: "border-primary/30 bg-primary/10 text-primary",
    };
  }
  if (lesson.kind === "article") {
    return {
      type: "guide",
      label: "Interactive Concept Guide",
      icon: <FileText className="size-4 text-primary/80" />,
      badgeClass: "border-border bg-surface-2 text-foreground",
    };
  }
  return {
    type: "video",
    label: "Multimedia Lecture",
    icon: <PlayCircle className="size-4 text-primary/80" />,
    badgeClass: "border-border bg-surface-2 text-foreground",
  };
}

function CodeBlock({ className, children }: { className?: string; children?: React.ReactNode }) {
  const [copied, setCopied] = React.useState(false);
  const match = /language-(\w+)/.exec(className || "");
  const lang = match ? match[1] : "";
  const codeText = String(children).replace(/\n$/, "");

  const onCopy = () => {
    navigator.clipboard.writeText(codeText);
    setCopied(true);
    toast.success("Code copied to clipboard", { position: "top-center" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-5 overflow-hidden rounded-xl border border-border bg-[#0d1117] text-xs shadow-xs">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 bg-[#161b22] text-[11px]">
        <span className="font-semibold uppercase tracking-wider font-mono text-slate-300">
          {lang || "CODE"}
        </span>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-sans font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Copy code snippet"
        >
          {copied ? <CheckCheck className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <div className="p-4 overflow-x-auto bg-[#0d1117] text-[#e6edf3] font-mono text-xs leading-relaxed whitespace-pre select-text selection:bg-primary/35 selection:text-white">
        {codeText}
      </div>
    </div>
  );
}

/** Zapsters Enterprise Article Lesson Viewer with Architecture Callouts & Key Takeaways */
function SkillBuildArticleBody({ lesson, course }: { lesson: CourseLesson; course: Course }) {
  const content = React.useMemo(() => {
    return getLessonContent(course.title, course.category, lesson.title, lesson.id);
  }, [course.title, course.category, lesson.title, lesson.id]);

  const body = content.body || lesson.preview_body?.trim();

  return (
    <div className="rounded-2xl border border-border bg-card p-6 sm:p-10 shadow-xs space-y-6">
      {/* Enterprise Lesson Callout Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-surface-1 border border-border text-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" />
          <span className="font-semibold text-foreground">
            Zapsters Enterprise Standard
          </span>
          <span className="text-muted-foreground hidden sm:inline">· Self-Paced Digital Training</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[11px] font-mono">
            {lesson.duration_seconds ? `${Math.max(3, Math.round(lesson.duration_seconds / 60))} min read` : "10 min read"}
          </Badge>
        </div>
      </div>

      {/* Lesson Header */}
      <div>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
          {lesson.title}
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Part of {course.title} · Curriculum standard v2.4
        </p>
      </div>

      {/* Markdown Body */}
      <div className="max-w-none text-sm leading-7 text-muted-foreground [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:font-display [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground [&_p]:my-3 [&_li]:my-1.5 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:text-foreground [&_hr]:my-6 [&_hr]:border-border">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeSanitize]}
          components={{
            pre({ children }) {
              return <>{children}</>;
            },
            code({ className, children, ...props }) {
              const isInline = !className && !String(children).includes("\n");
              if (isInline) {
                return (
                  <code className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-foreground border border-border/50" {...props}>
                    {children}
                  </code>
                );
              }
              return <CodeBlock className={className}>{children}</CodeBlock>;
            },
          }}
        >
          {body}
        </ReactMarkdown>
      </div>

      {/* Architecture Best Practice Callout Box */}
      <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 sm:p-5 text-sm space-y-2">
        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
          <Lightbulb className="size-4" />
          <span>{content.bestPractice.title}</span>
        </div>
        <p className="text-xs sm:text-sm text-foreground leading-relaxed">
          {content.bestPractice.description}
        </p>
      </div>

      {/* Key Takeaways Card */}
      {content.keyTakeaways && content.keyTakeaways.length > 0 && (
        <div className="rounded-xl border border-border bg-surface-1 p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2 text-foreground font-semibold text-xs uppercase tracking-wider">
            <CheckCircle2 className="size-4 text-primary" />
            <span>Key Takeaways</span>
          </div>
          <ul className="space-y-1.5 text-xs sm:text-sm text-muted-foreground">
            {content.keyTakeaways.map((takeaway, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <Check className="size-3.5 text-primary shrink-0 mt-0.5" />
                <span>{takeaway}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Zapsters Builder Lab & Cloud Sandbox Interactive Simulator */
function SkillBuildLabSandbox({
  course,
  lesson,
  onCompleteLab,
}: {
  course: Course;
  lesson: CourseLesson;
  onCompleteLab: () => void;
}) {
  const labData = React.useMemo(() => getLabScenario(course, lesson), [course, lesson]);
  const [completedTasks, setCompletedTasks] = React.useState<Set<string>>(new Set(["task-1"]));
  const [terminalOutput, setTerminalOutput] = React.useState<string>(labData.cliSamples[0]!.output);
  const [activeCommand, setActiveCommand] = React.useState<string>(labData.cliSamples[0]!.command);
  const [labVerified, setLabVerified] = React.useState(false);

  const toggleTask = (taskId: string) => {
    setCompletedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const runCommand = (cmd: string, output: string) => {
    setActiveCommand(cmd);
    setTerminalOutput(`$ ${cmd}\n\n${output}`);
    toast.success(`Executed: ${cmd.slice(0, 32)}...`);
  };

  const handleValidateLab = () => {
    setCompletedTasks(new Set(labData.tasks.map((t) => t.id)));
    setTerminalOutput(
      `$ zapsters-audit --evaluate --standard CIS-v1.4\n\n[SANDBOX VALIDATOR] Evaluating state on ${labData.region}...\n[PASS] All 4 Lab Objectives Verified!\n[SUCCESS] Lab Environment Passed with 100% Score.`,
    );
    setLabVerified(true);
    toast.success("All lab tasks verified.");
    onCompleteLab();
  };

  return (
    <div className="space-y-6">
      {/* Sandbox Status Bar */}
      <div className="rounded-xl border border-border bg-slate-950 p-4 text-white flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Cloud Sandbox Session Active
              </span>
              <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/10">
                Connected
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Region: {labData.region} · Session: zapsters-sandbox-cloud-shell
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-400">Time Remaining:</span>
          <span className="font-mono font-bold text-white bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
            58:45
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleValidateLab}
            className="text-xs border-primary/30 text-primary hover:bg-primary/10 gap-1.5"
          >
            <ShieldCheck className="size-3.5" />
            Validate Lab
          </Button>
        </div>
      </div>

      {/* Lab Overview Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div>
          <Badge variant="outline" className="text-[10px] uppercase border-primary/30 bg-primary/10 text-primary mb-2">
            Hands-on Lab Exercise
          </Badge>
          <h3 className="font-display text-xl font-bold text-foreground">
            {labData.scenarioTitle}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
            {labData.architectureSummary}
          </p>
        </div>

        {/* Architecture Topology View */}
        <div className="p-4 rounded-xl border border-border bg-surface-1 space-y-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
            Lab Architecture Topology
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {labData.topologyNodes.map((node, i) => (
              <React.Fragment key={node.id}>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground">
                  <Server className="size-3 text-primary shrink-0" />
                  <span>{node.label}</span>
                </div>
                {i < labData.topologyNodes.length - 1 && (
                  <ArrowRight className="size-3 text-muted-foreground shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step-by-Step Task Checklist */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Step-by-Step Lab Tasks ({completedTasks.size} of {labData.tasks.length} Completed)
            </span>
            <span className="text-xs font-medium text-foreground">
              {Math.round((completedTasks.size / labData.tasks.length) * 100)}% Complete
            </span>
          </div>

          <div className="space-y-2.5">
            {labData.tasks.map((task) => {
              const isDone = completedTasks.has(task.id);
              return (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={cn(
                    "flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors",
                    isDone
                      ? "border-primary/40 bg-primary/5 text-foreground"
                      : "border-border bg-surface-1 hover:bg-surface-2/60 text-muted-foreground",
                  )}
                >
                  <div
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-md border text-xs mt-0.5 transition-colors",
                      isDone
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-transparent",
                    )}
                  >
                    <Check className="size-3.5 stroke-[3]" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <p className={cn("text-xs sm:text-sm font-semibold", isDone ? "text-foreground" : "text-foreground/90")}>
                      {task.title}
                    </p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {task.description}
                    </p>
                    {task.cliHint && (
                      <div className="pt-1 flex items-center gap-1.5 font-mono text-[11px] text-primary">
                        <Terminal className="size-3" />
                        <code>{task.cliHint}</code>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Embedded Interactive Web Terminal / Cloud Shell */}
        <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-lg mt-4">
          <div className="flex items-center justify-between bg-slate-900 px-4 py-2.5 border-b border-slate-800 text-xs text-slate-300">
            <div className="flex items-center gap-2 font-mono">
              <Terminal className="size-3.5 text-primary" />
              <span>cloudshell@zapsters-sandbox:~$ {activeCommand}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400">Click runnable command:</span>
              <div className="flex gap-1.5">
                {labData.cliSamples.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => runCommand(s.command, s.output)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-200 hover:text-white border border-slate-700 transition-colors"
                  >
                    CMD {idx + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 font-mono text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
            {terminalOutput}
          </div>
        </div>

        {/* Verification Button */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Complete the steps above and check the verification button to record progress.
          </p>
          <Button
            onClick={handleValidateLab}
            className="font-bold text-xs gap-1.5"
          >
            <ShieldCheck className="size-4" />
            {labVerified ? "Lab Completed & Verified" : "Run Automated Verification Check"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Zapsters Scenario-based Knowledge Check & Assessment Engine (10 Questions) */
function SkillBuildKnowledgeCheck({
  course,
  lesson,
  onPassed,
}: {
  course: Course;
  lesson: CourseLesson;
  onPassed: () => void;
}) {
  const questions = React.useMemo(() => getKnowledgeCheckQuestions(course, lesson), [course, lesson]);
  const [selectedAnswers, setSelectedAnswers] = React.useState<Record<string, number>>({});
  const [revealed, setRevealed] = React.useState(false);
  const announce = useAnnounce();

  const isFinal =
    lesson.title.toLowerCase().includes("final") ||
    lesson.title.toLowerCase().includes("assessment");

  const answeredCount = Object.keys(selectedAnswers).length;

  const handleSelect = (questionId: string, index: number) => {
    if (revealed) return;
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: index }));
  };

  const handleCheck = () => {
    setRevealed(true);
    let correctCount = 0;
    questions.forEach((q) => {
      if (selectedAnswers[q.id] === q.correctIndex) correctCount++;
    });
    const scorePct = Math.round((correctCount / questions.length) * 100);
    if (scorePct >= 80) {
      announce(
        isFinal
          ? "Final Comprehensive Assessment Passed! Certification Benchmark Attained!"
          : "Module Quiz Passed! Benchmark Attained.",
      );
      feedback.success();
      feedback.xp(isFinal ? 100 : 50);
      toast.success(
        isFinal
          ? `Congratulations! Passed Final Assessment with ${scorePct}%.`
          : `Passed Module Quiz with ${scorePct}% score.`,
      );
      onPassed();
    } else {
      announce("Assessment not passed. You can review the rationales and retry.");
      toast.error(`Scored ${scorePct}%. 80% passing grade required (minimum 8 of 10).`);
    }
  };

  const handleReset = () => {
    setSelectedAnswers({});
    setRevealed(false);
  };

  const correctCount = revealed
    ? questions.filter((q) => selectedAnswers[q.id] === q.correctIndex).length
    : 0;
  const scorePct = revealed ? Math.round((correctCount / questions.length) * 100) : 0;
  const isPassed = revealed && scorePct >= 80;

  return (
    <div className="space-y-6">
      {/* Assessment Header Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {isFinal ? <Award className="size-7 text-primary shrink-0" /> : <Lightbulb className="size-7 text-primary shrink-0" />}
            <div>
              <h3 className="font-display text-lg sm:text-xl font-bold text-foreground">
                {isFinal ? `Final Comprehensive Assessment: ${course.title}` : lesson.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isFinal
                  ? "Accredited Capstone Exam · Cross-Module Verification"
                  : "End-of-Module Verification Quiz · 10 Graded Questions"}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-xs font-semibold px-2.5 py-1",
              isFinal
                ? "border-primary/30 bg-primary/10 text-primary font-bold"
                : "border-primary/30 bg-primary/10 text-primary",
            )}
          >
            {isFinal ? "Graded Final Assessment · 80% to Pass" : "10 Questions · 80% Benchmark"}
          </Badge>
        </div>

        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {isFinal
            ? `Demonstrate comprehensive mastery across all curriculum pillars of ${course.title}. Answer all 10 scenario-based questions to earn your official digital credential.`
            : "Review each realistic enterprise scenario, apply the architectural best practices learned in this module, and select the best technical solution."}
        </p>

        {/* Live Answering Progress Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60 text-xs">
          <span className="text-muted-foreground">
            Progress:{" "}
            <strong className="text-foreground">
              {answeredCount} of {questions.length} Questions Answered
            </strong>
          </span>
          <div className="flex items-center gap-2">
            <Progress
              value={(answeredCount / questions.length) * 100}
              className="w-32 sm:w-40 h-2 bg-muted"
              indicatorClassName="bg-primary"
            />
            <span className="font-mono text-xs font-semibold text-primary">
              {Math.round((answeredCount / questions.length) * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Questions list */}
      <div className="space-y-5">
        {questions.map((q, qIndex) => {
          const selected = selectedAnswers[q.id];
          const _isChosen = selected !== undefined;
          const isCorrect = selected === q.correctIndex;

          return (
            <div key={q.id} className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold text-primary uppercase tracking-wider">
                  Question {qIndex + 1} of {questions.length} · {q.domain}
                </span>
                {revealed && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs font-semibold",
                      isCorrect
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-secondary text-muted-foreground",
                    )}
                  >
                    {isCorrect ? "Correct" : "Incorrect"}
                  </Badge>
                )}
              </div>

              {q.scenario && (
                <div className="p-3.5 rounded-xl bg-surface-1 border border-border/80 text-xs sm:text-sm text-foreground/90 leading-relaxed font-sans">
                  <span className="font-bold text-foreground block text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                    Scenario:
                  </span>
                  {q.scenario}
                </div>
              )}

              <p className="text-sm font-semibold text-foreground leading-relaxed">
                {q.question}
              </p>

              <div className="space-y-2">
                {q.options.map((option, optIdx) => {
                  const isSelected = selected === optIdx;
                  const isOptionCorrect = optIdx === q.correctIndex;

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleSelect(q.id, optIdx)}
                      disabled={revealed}
                      className={cn(
                        "w-full flex items-start gap-3 p-3.5 rounded-xl border text-left text-xs sm:text-sm transition-all",
                        !revealed && isSelected
                          ? "border-primary bg-primary/10 text-foreground font-medium"
                          : !revealed
                            ? "border-border bg-surface-1 hover:border-border/80 hover:bg-surface-2 text-muted-foreground hover:text-foreground"
                            : isOptionCorrect
                              ? "border-primary/50 bg-primary/10 text-foreground font-medium"
                              : isSelected && !isOptionCorrect
                                ? "border-border bg-secondary/50 text-muted-foreground"
                                : "border-border bg-card opacity-50",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-5 shrink-0 place-items-center rounded-full border text-[11px] font-bold mt-0.5",
                          !revealed && isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : revealed && isOptionCorrect
                              ? "border-primary bg-primary text-primary-foreground"
                              : revealed && isSelected
                                ? "border-border bg-secondary text-muted-foreground"
                                : "border-border text-muted-foreground",
                        )}
                      >
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span className="leading-relaxed">{option}</span>
                    </button>
                  );
                })}
              </div>

              {/* Rationale feedback */}
              {revealed && (
                <div
                  className={cn(
                    "p-4 rounded-xl border text-xs sm:text-sm leading-relaxed space-y-1.5",
                    isCorrect
                      ? "border-primary/30 bg-primary/5 text-foreground"
                      : "border-border bg-secondary/30 text-foreground",
                  )}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    {isCorrect ? (
                      <CheckCircle2 className="size-4 text-primary" />
                    ) : (
                      <HelpCircle className="size-4 text-primary" />
                    )}
                    <span>Technical Rationale:</span>
                  </div>
                  <p className="text-muted-foreground">{q.explanation}</p>
                  <p className="text-[11px] font-mono text-muted-foreground/80 pt-1">
                    Citation: {q.documentationRef}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Assessment Action Strip */}
      <div className="p-5 rounded-2xl border border-border bg-card flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div>
          {revealed ? (
            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                {isFinal ? "Final Certification Result" : "Module Quiz Result"}
              </span>
              <p className="text-lg font-bold font-display text-foreground">
                Score: {scorePct}% · {isPassed ? "Passed (>= 80%)" : "Needs Review (< 80%)"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isPassed
                  ? "Topic verified! Your score has been recorded to your learning record."
                  : `You answered ${correctCount} of ${questions.length} correctly. Review the technical rationales and retake when ready.`}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {answeredCount === questions.length
                ? "All 10 questions answered! Click submit to evaluate your score."
                : `Answer all 10 questions to submit (${answeredCount} of ${questions.length} completed). Minimum 80% required to pass.`}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {revealed ? (
            <Button variant="outline" size="sm" onClick={handleReset} className="text-xs gap-1.5">
              <RefreshCw className="size-3.5" />
              Retake Assessment
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleCheck}
              disabled={answeredCount < questions.length}
              className="font-bold text-xs gap-1.5 shadow-sm"
            >
              <CheckCircle2 className="size-4" />
              Submit & Check Answers
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Main LMS Player Component built to Zapsters Enterprise Standards */
export function PlayerClient({ course }: { course: Course }) {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const announce = useAnnounce();
  const userId = user?.id ?? "";

  const allLessons = React.useMemo(
    () => course.syllabus.flatMap((section) => section.lessons),
    [course.syllabus],
  );
  const [pickedLessonId, setPickedLessonId] = React.useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = React.useState<Record<string, boolean>>({});
  const [lessonSearch, setLessonSearch] = React.useState("");
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<"content" | "overview" | "lab" | "quiz" | "resources" | "notes">("content");
  const [digitalBadgeOpen, setDigitalBadgeOpen] = React.useState(false);

  const meta = React.useMemo(() => getCourseSkillBuildMeta(course), [course]);

  const {
    data: progress,
    isLoading: progressLoading,
    isError: progressError,
  } = useQuery({
    queryKey: ["course-progress", course.id, userId],
    queryFn: () => getCourseProgress(course.id, userId),
    enabled: Boolean(userId),
  });

  const enrollment = progress?.enrollment ?? null;
  const completedLessonIds = progress?.completed_lesson_ids;
  const completedSet = React.useMemo(
    () => new Set(completedLessonIds ?? []),
    [completedLessonIds],
  );

  const activeLesson =
    allLessons.find((l) => l.id === pickedLessonId) ??
    allLessons.find((l) => l.id === enrollment?.last_lesson_id) ??
    allLessons[0];
  const activeLessonIndex = activeLesson ? allLessons.findIndex((l) => l.id === activeLesson.id) : -1;
  const previousLesson = activeLessonIndex > 0 ? allLessons[activeLessonIndex - 1] ?? null : null;
  const nextLesson = activeLessonIndex >= 0 && activeLessonIndex < allLessons.length - 1 ? allLessons[activeLessonIndex + 1] ?? null : null;

  const currentSection = course.syllabus.find((sec) =>
    sec.lessons.some((l) => l.id === activeLesson?.id),
  );

  const activityDetails = activeLesson ? getLessonActivityDetails(activeLesson) : null;
  const isQuizOrAssessment = activityDetails?.type === "quiz" || activityDetails?.type === "assessment";
  const isFinalAssessment = activityDetails?.type === "assessment";

  const priorLessons = React.useMemo(
    () =>
      allLessons.filter(
        (l) =>
          !l.title.toLowerCase().includes("final assessment") &&
          !l.title.toLowerCase().includes("final comprehensive"),
      ),
    [allLessons],
  );

  const completedPriorCount = React.useMemo(
    () => priorLessons.filter((l) => completedSet.has(l.id)).length,
    [priorLessons, completedSet],
  );

  const areAllPriorModulesComplete =
    priorLessons.length > 0 && completedPriorCount >= priorLessons.length;

  const firstIncompleteLesson = React.useMemo(
    () => priorLessons.find((l) => !completedSet.has(l.id)) ?? null,
    [priorLessons, completedSet],
  );

  const [readingProgress, setReadingProgress] = React.useState(0);
  const mainRef = React.useRef<HTMLElement | null>(null);
  const contentContainerRef = React.useRef<HTMLDivElement | null>(null);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  const completedLessonIdsRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    if (progress?.completed_lesson_ids) {
      progress.completed_lesson_ids.forEach((id) => completedLessonIdsRef.current.add(id));
    }
  }, [progress?.completed_lesson_ids]);

  const progressMutation = useMutation({
    mutationFn: (input: { lessonId: string; completed: boolean }) =>
      recordProgress({
        courseId: course.id,
        lessonId: input.lessonId,
        userId,
        position_seconds: 1,
        completed: input.completed,
      }),
    onSuccess: (updatedEnrollment, input) => {
      queryClient.invalidateQueries({
        queryKey: ["course-progress", course.id, userId],
      });
      if (input.completed) {
        announce("Topic marked complete and verified");
        feedback.success();
        feedback.xp(25);
        toast.success("Topic marked complete", { position: "top-center" });
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const isActiveCompleted = activeLesson ? completedSet.has(activeLesson.id) : false;

  const completeCurrentLesson = React.useCallback(() => {
    if (!activeLesson) return;
    if (completedSet.has(activeLesson.id)) return;
    if (completedLessonIdsRef.current.has(activeLesson.id)) return;
    if (progressMutation.isPending) return;

    completedLessonIdsRef.current.add(activeLesson.id);
    progressMutation.mutate({ lessonId: activeLesson.id, completed: true });
  }, [activeLesson, completedSet, progressMutation]);

  // Scroll back to top on lesson switch
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
    mainRef.current?.scrollTo({ top: 0, behavior: "instant" });

    const rafId = requestAnimationFrame(() => {
      if (activeLesson && completedSet.has(activeLesson.id)) {
        setReadingProgress(100);
      } else {
        setReadingProgress(0);
      }
    });

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [activeLesson, completedSet]);

  // Track scroll depth and automatically update progress when scrolling down content
  React.useEffect(() => {
    if (!activeLesson || completedSet.has(activeLesson.id)) return;

    const computeProgress = () => {
      const contentEl = contentContainerRef.current;
      if (!contentEl) return;

      const rect = contentEl.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const headerOffset = 56;
      const contentHeight = rect.height;
      const visibleHeight = windowHeight - headerOffset;

      if (contentHeight <= visibleHeight + 40) {
        setReadingProgress(100);
        if (!isQuizOrAssessment) {
          completeCurrentLesson();
        }
        return;
      }

      const scrolled = Math.max(0, headerOffset - rect.top);
      const maxScrollable = contentHeight - visibleHeight;
      const windowPct = Math.min(100, Math.max(0, Math.round((scrolled / maxScrollable) * 100)));

      const mainEl = mainRef.current;
      const containerPct =
        mainEl && mainEl.scrollHeight > mainEl.clientHeight
          ? Math.min(
              100,
              Math.max(
                0,
                Math.round((mainEl.scrollTop / (mainEl.scrollHeight - mainEl.clientHeight)) * 100),
              ),
            )
          : 0;

      const finalPct = Math.max(windowPct, containerPct);
      setReadingProgress((prev) => (finalPct > prev ? finalPct : prev));

      if (!isQuizOrAssessment && finalPct >= 75) {
        completeCurrentLesson();
      }
    };

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined" && sentinelRef.current) {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              setReadingProgress(100);
              if (!isQuizOrAssessment) {
                completeCurrentLesson();
              }
            }
          }
        },
        {
          root: null,
          rootMargin: "0px 0px 80px 0px",
          threshold: 0.1,
        },
      );
      observer.observe(sentinelRef.current);
    }

    const mainEl = mainRef.current;
    window.addEventListener("scroll", computeProgress, { passive: true });
    window.addEventListener("resize", computeProgress, { passive: true });
    if (mainEl) {
      mainEl.addEventListener("scroll", computeProgress, { passive: true });
    }

    computeProgress();

    return () => {
      window.removeEventListener("scroll", computeProgress);
      window.removeEventListener("resize", computeProgress);
      if (mainEl) {
        mainEl.removeEventListener("scroll", computeProgress);
      }
      if (observer) {
        observer.disconnect();
      }
    };
  }, [activeLesson, completedSet, completeCurrentLesson, isQuizOrAssessment]);
  const isCourseComplete =
    enrollment?.status === "completed" ||
    (allLessons.length > 0 && completedSet.size >= allLessons.length);

  const filteredLessons = React.useMemo(() => {
    const q = lessonSearch.trim().toLowerCase();
    if (!q) return null;
    return new Set(
      allLessons.filter((l) => l.title.toLowerCase().includes(q)).map((l) => l.id),
    );
  }, [lessonSearch, allLessons]);

  if (progressLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <PlayerSkeleton />
      </div>
    );
  }

  if (progressError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <ErrorState
          title="Could not load course progress"
          message="Please refresh the page to try again."
        />
      </div>
    );
  }

  const downloadResources = () => {
    const text = [
      `ZAPSTERS ENTERPRISE ACADEMY — OFFICIAL STUDY GUIDE & REFERENCE`,
      `ACCREDITED UNDER ZAPSTERS ENTERPRISE STANDARDS`,
      `=============================================================`,
      `COURSE:         ${course.title}`,
      `COURSE CODE:    ${meta.courseCode}`,
      `CURRENT TOPIC:  ${activeLesson?.title ?? "Overview"}`,
      `=============================================================`,
      ``,
      `QUICK CLI REFERENCE CHEATSHEET:`,
      `* zapster iam get-account-summary`,
      `* zapster storage get-bucket-encryption --bucket <bucket-name>`,
      `* zapster kms list-keys`,
      `* zapster telemetry describe-audit-trails`,
      ``,
      `ARCHITECTURE DESIGN RULES:`,
      `1. Least privilege: No wildcard (*) in IAM actions or resources.`,
      `2. Redundancy: Minimum 2 Availability Zones for all compute nodes.`,
      `3. Key Rotation: Customer-managed KMS keys rotated automatically.`,
      `4. Telemetry: Audit streams must have at least 365-day retention.`,
    ].join("\n");

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${meta.courseCode}-study-guide.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success("Study guide downloaded!");
  };

  return (
    <div className="flex h-full flex-col bg-background text-foreground overflow-hidden">
      {/* Digital Badge Modal */}
      <DigitalBadgeDialog
        open={digitalBadgeOpen}
        onOpenChange={setDigitalBadgeOpen}
        course={course}
        learnerName={user?.display_name ?? "Zapster Learner"}
      />

      {/* Enterprise LMS Header Bar (AWS Skill Builder & IBM SkillsBuild standard) */}
      <header className="shrink-0 flex h-14 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur sm:px-6 relative z-20">
        {/* Left: Breadcrumbs & Back link */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/courses/${course.id}`}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium shrink-0"
          >
            <ArrowLeft className="size-3.5" />
            <span className="hidden md:inline font-semibold">Course Overview</span>
          </Link>
          <span className="text-border">/</span>
          <div className="flex items-center gap-2 truncate text-xs">
            <Badge variant="outline" className="font-mono text-primary font-semibold text-[10px] border-primary/30 bg-primary/5 hidden sm:inline-flex">
              {meta.courseCode}
            </Badge>
            <span className="text-muted-foreground truncate hidden lg:inline">
              {currentSection?.title ?? course.title}
            </span>
            <span className="text-border hidden lg:inline">/</span>
            <span className="font-semibold text-foreground truncate">
              {activeLesson?.title ?? "Lesson"}
            </span>
          </div>
        </div>

        {/* Right: Progress Bar & Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {enrollment && (
            <div className="hidden sm:flex items-center gap-2.5">
              <span className="text-xs font-medium text-muted-foreground">
                {completedSet.size}/{allLessons.length} Topics ({enrollment.progress_pct}%)
              </span>
              <Progress value={enrollment.progress_pct} className="w-20 h-1.5 bg-muted" indicatorClassName="bg-primary" />
            </div>
          )}

          <Button
            size="sm"
            variant={activeTab === "overview" ? "default" : "outline"}
            onClick={() => setActiveTab(activeTab === "overview" ? "content" : "overview")}
            className="text-xs gap-1.5"
          >
            <Info className="size-3.5" />
            <span className="hidden md:inline">Course Info</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSidebarOpen((prev) => !prev)}
            className="text-xs lg:hidden"
            aria-label="Toggle curriculum navigation"
          >
            {sidebarOpen ? <X className="size-4" /> : <Layers className="size-4" />}
          </Button>
        </div>

        {/* Scroll-based Reading Progress Line */}
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-border/40 overflow-hidden">
          <div
            className="h-full transition-[width] duration-150 ease-out bg-primary"
            style={{ width: `${isActiveCompleted ? 100 : readingProgress}%` }}
          />
        </div>
      </header>

      {/* Main LMS Layout: Left Drawer (Curriculum) + Right Learning Canvas */}
      <div className="flex flex-1 min-h-0 items-stretch overflow-hidden relative">
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-xs lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Left Drawer / Table of Contents (Pinned Sidebar) */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex w-80 flex-col border-r border-border bg-card transition-transform duration-200 lg:static lg:w-[340px] lg:h-full lg:translate-x-0 shrink-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {/* Drawer Header with Course Code & Progress */}
          <div className="shrink-0 bg-card p-4 border-b border-border space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary font-mono px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                {meta.courseCode}
              </span>
              <span className="text-[11px] font-bold text-muted-foreground font-mono">
                {enrollment?.progress_pct ?? 0}% COMPLETED
              </span>
            </div>
            <h2 className="font-display text-sm font-bold text-foreground line-clamp-1">
              {course.title}
            </h2>
            <Progress
              value={enrollment?.progress_pct ?? 0}
              className="h-1.5 bg-muted"
              indicatorClassName="bg-primary"
            />
          </div>

          {/* Search Box */}
          <div className="shrink-0 p-3 border-b border-border bg-surface-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search topics & labs..."
                value={lessonSearch}
                onChange={(e) => setLessonSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Curriculum Module Accordion */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 p-2">
            {course.syllabus.map((section, si) => {
              const isCollapsed = collapsedSections[section.id] === true;
              const sectionCompleted = section.lessons.filter((l) => completedSet.has(l.id)).length;

              return (
                <div key={section.id} className="rounded-xl overflow-hidden border border-border/50">
                  {/* Module Header Button */}
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsedSections((prev) => ({
                        ...prev,
                        [section.id]: !isCollapsed,
                      }))
                    }
                    className="w-full flex items-center justify-between p-3.5 text-left transition-colors hover:bg-surface-2 bg-card"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ChevronDown
                        className={cn(
                          "size-3.5 text-muted-foreground shrink-0 transition-transform",
                          isCollapsed && "-rotate-90",
                        )}
                      />
                      <div className="truncate">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block font-mono">
                          Module {si + 1}
                        </span>
                        <span className="text-xs font-semibold text-foreground truncate block">
                          {section.title}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                      {sectionCompleted}/{section.lessons.length}
                    </span>
                  </button>

                  {/* Module Topics */}
                  {!isCollapsed && (
                    <div className="bg-surface-1/40 space-y-0.5 p-1 border-t border-border/40">
                      {section.lessons.map((lesson) => {
                        if (filteredLessons && !filteredLessons.has(lesson.id)) return null;

                        const active = lesson.id === activeLesson?.id;
                        const done = completedSet.has(lesson.id);
                        const details = getLessonActivityDetails(lesson);

                        return (
                          <button
                            key={lesson.id}
                            type="button"
                            onClick={() => {
                              setPickedLessonId(lesson.id);
                              setActiveTab("content");
                              if (window.innerWidth < 1024) setSidebarOpen(false);
                              if (typeof window !== "undefined") {
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }
                              mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            className={cn(
                              "w-full flex items-center justify-between p-3 text-left transition-colors text-xs relative",
                              active
                                ? "bg-primary/10 text-foreground font-semibold before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-primary"
                                : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <span className="shrink-0">{details.icon}</span>
                              <span className="truncate">{lesson.title}</span>
                            </div>

                            {done ? (
                              <Check className="size-4 shrink-0 text-primary stroke-[2.5]" />
                            ) : (
                              <span className="size-4 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* Center Learning Canvas */}
        <main ref={mainRef} className="flex flex-1 min-h-0 flex-col overflow-y-auto">
          {activeLesson && (
            <div ref={contentContainerRef} className="p-4 sm:p-8 lg:p-10 max-w-5xl mx-auto w-full space-y-6">
              {/* MAIN CONTENT REGION */}
              {isQuizOrAssessment ? (
                /* QUIZ / FINAL ASSESSMENT VIEW */
                isFinalAssessment && !areAllPriorModulesComplete ? (
                  /* Prerequisite locked gate for Final Assessment */
                  <div className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-5 shadow-xs">
                    <div className="flex items-start gap-4">
                      <ShieldCheck className="size-6 text-foreground shrink-0 mt-0.5" />
                      <div className="space-y-1.5 flex-1">
                        <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-xs font-semibold">
                          Prerequisite Gate · All Modules Required
                        </Badge>
                        <h3 className="font-display text-2xl font-bold text-foreground">
                          Final Certification Assessment is Locked
                        </h3>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
                          To take the Comprehensive Final Assessment and earn your credential, you must complete all preceding module topics and their 10-question quizzes.
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-border bg-surface-1 space-y-2">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-foreground">Module Curriculum Completion</span>
                        <span className="text-primary font-mono font-bold">
                          {completedPriorCount} of {priorLessons.length} Topics Completed ({Math.round((completedPriorCount / Math.max(1, priorLessons.length)) * 100)}%)
                        </span>
                      </div>
                      <Progress
                        value={(completedPriorCount / Math.max(1, priorLessons.length)) * 100}
                        className="h-2 bg-muted"
                        indicatorClassName="bg-primary"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      {firstIncompleteLesson && (
                        <Button
                          onClick={() => {
                            setPickedLessonId(firstIncompleteLesson.id);
                            setActiveTab("content");
                            if (typeof window !== "undefined") {
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }
                            mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="font-bold text-xs gap-1.5"
                        >
                          <span>Resume Incomplete Topics ({firstIncompleteLesson.title})</span>
                          <ArrowRight className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Directly render the 10-Question Quiz / Final Assessment on the course page! */
                  <div className="space-y-6">
                    <SkillBuildKnowledgeCheck
                      course={course}
                      lesson={activeLesson}
                      onPassed={completeCurrentLesson}
                    />
                  </div>
                )
              ) : (
                /* REGULAR LEARNING TOPIC VIEW (Guide / Cloud Lab / Resources / Notes) */
                <>
                  {activeTab === "overview" && (
                    <div className="space-y-6">
                      <CourseInfoPanel
                        course={course}
                        onStartTopic={(lessonId) => {
                          setPickedLessonId(lessonId);
                          setActiveTab("content");
                          if (typeof window !== "undefined") {
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }
                          mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        onOpenBadgeModal={() => setDigitalBadgeOpen(true)}
                      />
                    </div>
                  )}

                  {activeTab === "content" && (
                    <div className="space-y-6">
                      {activityDetails?.type === "lab" ? (
                        <SkillBuildLabSandbox
                          course={course}
                          lesson={activeLesson}
                          onCompleteLab={completeCurrentLesson}
                        />
                      ) : (
                        <SkillBuildArticleBody lesson={activeLesson} course={course} />
                      )}
                    </div>
                  )}

                  {activeTab === "lab" && (
                    <div className="space-y-6">
                      <SkillBuildLabSandbox
                        course={course}
                        lesson={activeLesson}
                        onCompleteLab={completeCurrentLesson}
                      />
                    </div>
                  )}

                  {activeTab === "resources" && (
                    <div className="space-y-6">
                      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 text-foreground font-bold text-base">
                          <Download className="size-5 text-primary" />
                          <h3>Course Resources, Whitepapers & Cheatsheets</h3>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                          Download supplementary technical blueprints, security configuration checklists, and examination blueprints for {course.title}.
                        </p>

                        <div className="grid sm:grid-cols-2 gap-3 pt-2">
                          <div className="p-4 rounded-xl border border-border bg-surface-1 flex items-start justify-between gap-3">
                            <div>
                              <h4 className="text-sm font-semibold text-foreground">
                                Official Technical Study Guide
                              </h4>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Comprehensive CLI commands & security architecture notes.
                              </p>
                            </div>
                            <Button size="sm" variant="outline" onClick={downloadResources} className="text-xs shrink-0">
                              <Download className="size-3.5 mr-1" />
                              Download
                            </Button>
                          </div>

                          <div className="p-4 rounded-xl border border-border bg-surface-1 flex items-start justify-between gap-3">
                            <div>
                              <h4 className="text-sm font-semibold text-foreground">
                                CIS Benchmark & Compliance Checklist
                              </h4>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Verification checklist for IAM, S3, and workload policies.
                              </p>
                            </div>
                            <Button size="sm" variant="outline" onClick={downloadResources} className="text-xs shrink-0">
                              <Download className="size-3.5 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "notes" && (
                    <div className="space-y-6">
                      <PlayerNotes
                        key={activeLesson.id}
                        courseId={course.id}
                        lessonId={activeLesson.id}
                        lessonTitle={activeLesson.title}
                      />
                    </div>
                  )}
                </>
              )}

              {/* Lesson Completion Status Alert */}
              {isActiveCompleted && (
                <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 text-foreground">
                  <CheckCircle2 className="size-5 shrink-0 text-primary" />
                  <div className="text-xs sm:text-sm">
                    <p className="font-semibold text-foreground">
                      Topic Completed & Verified
                    </p>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      Your progress has been synchronized to your learning record.
                    </p>
                  </div>
                </div>
              )}

              {/* Course Complete Milestone Banner */}
              {isCourseComplete && (
                <div className="rounded-xl border border-border bg-card p-6 sm:p-8 space-y-4 shadow-xs">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Badge variant="outline" className="text-xs border-primary/30 bg-primary/20 text-primary font-bold mb-2">
                        Milestone Unlocked · Credential Ready
                      </Badge>
                      <h3 className="font-display text-2xl font-bold text-foreground">
                        Congratulations! You have completed {course.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xl">
                        You have met all curriculum requirements and passed the scenario knowledge check. Your official digital credential is ready to be claimed and shared to LinkedIn / Credly.
                      </p>
                    </div>
                    <Award className="size-10 text-primary shrink-0" />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <Button
                      onClick={() => setDigitalBadgeOpen(true)}
                      className="font-bold text-xs gap-1.5"
                    >
                      <Award className="size-4" />
                      Claim Digital Credential & Badge
                    </Button>
                    <Button variant="outline" asChild className="text-xs">
                      <Link href="/courses">Explore Next Pathway <ArrowRight className="size-3.5 ml-1" /></Link>
                    </Button>
                  </div>
                </div>
              )}

              {/* Reading Sentinel at the end of the content */}
              <div ref={sentinelRef} className="h-2 w-full" aria-hidden="true" />

              {/* Bottom Navigation Strip (Previous / Next Topic) */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-border">
                {previousLesson ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPickedLessonId(previousLesson.id);
                      setActiveTab("content");
                      if (typeof window !== "undefined") {
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }
                      mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="text-xs gap-1.5"
                  >
                    <ArrowLeft className="size-3.5" />
                    Previous Topic
                  </Button>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-3">
                  {/* Reading / Auto-completion / Quiz status */}
                  {isActiveCompleted ? (
                    <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                      <CheckCircle2 className="size-3.5 text-primary" />
                      <span>{isQuizOrAssessment ? "Assessment Passed" : "Topic Completed"}</span>
                    </div>
                  ) : isQuizOrAssessment ? (
                    <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                      <Lightbulb className="size-3.5" />
                      <span>Pass quiz (&ge; 80%) to complete</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <ArrowDown className="size-3.5 text-primary animate-bounce" />
                      <span>Scroll to complete ({readingProgress}%)</span>
                    </div>
                  )}

                  {nextLesson ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        setPickedLessonId(nextLesson.id);
                        setActiveTab("content");
                        if (typeof window !== "undefined") {
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }
                        mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="font-bold text-xs gap-1.5"
                    >
                      <span>Next Topic</span>
                      <ArrowRight className="size-3.5" />
                    </Button>
                  ) : isCourseComplete ? (
                    <Button
                      size="sm"
                      onClick={() => setDigitalBadgeOpen(true)}
                      className="font-bold text-xs gap-1.5"
                    >
                      <Award className="size-3.5" />
                      <span>Claim Credential</span>
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

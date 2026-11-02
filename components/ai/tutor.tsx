"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Bot,
  Check,
  ChevronRight,
  Code2,
  Compass,
  FlaskConical,
  LoaderCircle,
  MessageCircle,
  RotateCcw,
  Send,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TutorMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  related?: string;
  relatedLabel?: string;
}

export type SurfaceContext =
  | "judge_problem"
  | "judge_catalog"
  | "course_lesson"
  | "course_overview"
  | "lab_session"
  | "lab_overview"
  | "assessment"
  | "rank_progression"
  | "dashboard"
  | "general";

interface ContextConfig {
  context: SurfaceContext;
  title: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  promptHeadline: string;
  promptDescription: string;
  suggestions: string[];
}

function getSurfaceContext(pathname: string | null): ContextConfig {
  if (!pathname) {
    return {
      context: "general",
      title: "Zapsters Tutor",
      badge: "General Guide",
      icon: Compass,
      promptHeadline: "How can I help you today?",
      promptDescription: "Ask for an explanation, practice strategy, or focused review plan.",
      suggestions: [
        "How should I structure my study session today?",
        "Explain how the XP and Rank ladder works",
        "Give me a 15-minute quick practice plan",
      ],
    };
  }

  if (/^\/judge\/[^/]+/.test(pathname)) {
    return {
      context: "judge_problem",
      title: "Judge Copilot",
      badge: "Algorithm & Tests",
      icon: Code2,
      promptHeadline: "Need guidance on this problem?",
      promptDescription: "I provide progressive hints, edge case analysis, and complexity reviews without spoiling the solution.",
      suggestions: [
        "Give me a progressive hint for this challenge",
        "What edge cases should I consider?",
        "Explain the ideal time & space complexity",
        "How do I debug a Wrong Answer verdict?",
      ],
    };
  }

  if (pathname === "/judge" || pathname.startsWith("/judge/contests")) {
    return {
      context: "judge_catalog",
      title: "Judge Advisor",
      badge: "Problem Solving",
      icon: Code2,
      promptHeadline: "Ready to practice algorithms?",
      promptDescription: "Choose problems strategically to build algorithmic intuition and deterministic precision.",
      suggestions: [
        "Which difficulty level should I start with?",
        "What are the most common coding interview patterns?",
        "Explain the judge execution lifecycle",
      ],
    };
  }

  if (/^\/courses\/[^/]+\/learn/.test(pathname)) {
    return {
      context: "course_lesson",
      title: "Lesson Companion",
      badge: "Interactive Study",
      icon: BookOpen,
      promptHeadline: "Working through this lesson?",
      promptDescription: "Reinforce key mental models, get concept analogies, or test your comprehension.",
      suggestions: [
        "Summarize the core concept of this lesson",
        "Give me a quick concept check question",
        "Explain this concept with a real-world analogy",
        "What common architectural trap should I avoid?",
      ],
    };
  }

  if (/^\/courses\/[^/]+/.test(pathname)) {
    return {
      context: "course_overview",
      title: "Curriculum Advisor",
      badge: "Course Syllabus",
      icon: BookOpen,
      promptHeadline: "Exploring this curriculum?",
      promptDescription: "Understand prerequisites, target skill milestones, and estimated completion effort.",
      suggestions: [
        "What are the prerequisites for this course?",
        "What practical projects will I complete?",
        "How does this course map to career certifications?",
      ],
    };
  }

  if (/^\/labs\/[^/]+\/(session|notebook)/.test(pathname)) {
    return {
      context: "lab_session",
      title: "Virtual Lab Copilot",
      badge: "Active Terminal",
      icon: FlaskConical,
      promptHeadline: "Inside the virtual sandbox?",
      promptDescription: "Ask for CLI syntax hints, verification strategies, or network troubleshooting.",
      suggestions: [
        "What is the recommended verification step?",
        "Explain the terminal command syntax",
        "How do I verify a port or service status in Linux?",
        "Troubleshoot target connection failure",
      ],
    };
  }

  if (/^\/labs/.test(pathname)) {
    return {
      context: "lab_overview",
      title: "Labs Navigator",
      badge: "Hands-on Practice",
      icon: FlaskConical,
      promptHeadline: "Hands-on cloud & security labs",
      promptDescription: "Choose between guided browser notebooks, Linux environments, and reconnaissance scenarios.",
      suggestions: [
        "Which virtual lab should I tackle first?",
        "How do browser-based lab sessions work?",
        "What tools come pre-installed in the containers?",
      ],
    };
  }

  if (/^\/assessments/.test(pathname)) {
    return {
      context: "assessment",
      title: "Assessment Coach",
      badge: "Skill Milestone",
      icon: Sparkles,
      promptHeadline: "Preparing for an assessment?",
      promptDescription: "Assessments test practical knowledge and award verifiable badge credentials.",
      suggestions: [
        "Tips for timed technical assessments",
        "How is passing score and XP calculated?",
        "What happens if I need to retake an attempt?",
      ],
    };
  }

  if (pathname === "/rank" || pathname === "/guilds") {
    return {
      context: "rank_progression",
      title: "Progression Guide",
      badge: "Rank & Guilds",
      icon: Trophy,
      promptHeadline: "Track your climb",
      promptDescription: "Learn how XP, daily streaks, badge credentials, and guild momentum work together.",
      suggestions: [
        "How do I earn enough XP for the next tier?",
        "How do streak freezes and multipliers work?",
        "What are guild quests and weekly milestones?",
      ],
    };
  }

  return {
    context: "dashboard",
    title: "Workspace Tutor",
    badge: "Daily Momentum",
    icon: Compass,
    promptHeadline: "Good to see you on the climb.",
    promptDescription: "Focus on one high-impact objective today to maintain your daily streak.",
    suggestions: [
      "What should I practice next based on my momentum?",
      "How should I balance courses and coding challenges?",
      "Give me a 20-minute focused study plan",
    ],
  };
}

function answerForContext(prompt: string, context: SurfaceContext): TutorMessage {
  const norm = prompt.toLowerCase();

  // 1. Judge Problem Guidance
  if (context === "judge_problem") {
    if (norm.includes("hint") || norm.includes("approach") || norm.includes("stuck")) {
      return {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "💡 **Step 1: Simplify the Problem**\n" +
          "Before coding, trace one small example manually on paper.\n\n" +
          "• **Data Structure Clue:** Can a Hash Map or Frequency Table give you O(1) lookups instead of nested loops?\n" +
          "• **Pattern:** If the array is sorted (or can be sorted), consider Two Pointers or Binary Search.\n" +
          "• **Invariance:** What stays true at every iteration of your loop?",
        related: "/judge",
        relatedLabel: "Back to judge problems",
      };
    }
    if (norm.includes("edge") || norm.includes("case") || norm.includes("test")) {
      return {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "⚠️ **Critical Edge Cases to Test:**\n\n" +
          "1. **Empty / Minimal input:** Length 0 or Length 1 array/string.\n" +
          "2. **Extremes & Parity:** All negative numbers, all duplicates, or maximum integer bounds ($10^9$).\n" +
          "3. **Order Assumptions:** Already sorted vs reverse sorted vs alternating.\n" +
          "4. **No Match:** Scenarios where no valid answer exists (return empty, -1, or None).\n\n" +
          "Run these in your head before clicking Submit!",
      };
    }
    if (norm.includes("complexity") || norm.includes("time") || norm.includes("big-o")) {
      return {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "⏱️ **Target Complexity Strategy:**\n\n" +
          "• If input size $N \\le 10^3$: An $O(N^2)$ solution will pass comfortably within the 2.0s sandbox limit.\n" +
          "• If input size $N \\le 10^5$: You must achieve $O(N \\log N)$ (sorting) or $O(N)$ (linear hash map / two pointers).\n" +
          "• If input size $N \\ge 10^9$: Only $O(\\log N)$ binary search or $O(1)$ mathematical formulations will pass.",
      };
    }
    if (norm.includes("wrong answer") || norm.includes("debug") || norm.includes("fail")) {
      return {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "🔍 **Debugging Checklist:**\n\n" +
          "1. Print intermediate variables before each branch condition.\n" +
          "2. Check off-by-one errors on boundary indices (`range(len(arr) - 1)` vs `range(len(arr))`)\n" +
          "3. Watch out for mutable default arguments or variable shadowing.\n" +
          "4. Ensure your return type strictly matches the problem signature.",
      };
    }
  }

  // 2. Course Lesson Guidance
  if (context === "course_lesson" || context === "course_overview") {
    if (norm.includes("summar") || norm.includes("concept") || norm.includes("key")) {
      return {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "🎯 **Core Concept Breakdown:**\n\n" +
          "Every high-quality engineering concept addresses three questions:\n" +
          "1. **The Core Pain Point:** What operational failure or security gap occurs without this technique?\n" +
          "2. **The Mechanism:** How does the data/control flow transform inputs into trusted state?\n" +
          "3. **The Tradeoff:** What cost do you pay (latency, memory, complexity, operational overhead)?\n\n" +
          "Jot down one sentence answering each question in your lesson notes panel!",
        related: "/courses",
        relatedLabel: "Explore more courses",
      };
    }
    if (norm.includes("analogy") || norm.includes("simply") || norm.includes("like i'm 5")) {
      return {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "🧩 **Real-World Analogy:**\n\n" +
          "Think of technical abstractions like modern airport security:\n" +
          "• **Authentication (AuthN):** Showing your passport at the border gate (proving *who* you are).\n" +
          "• **Authorization (AuthZ):** Your boarding pass checking if you are allowed into First Class (proving *what* you can do).\n" +
          "• **Audit Trail:** The flight manifest and security camera logs that prove what happened after the fact.",
      };
    }
    if (norm.includes("quiz") || norm.includes("check") || norm.includes("test")) {
      return {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "❓ **Quick Comprehension Check:**\n\n" +
          "If an attacker tampers with a signed payload in transit, which layer detects it first, and why?\n\n" +
          "*(Hint: Think about cryptographic checksums and HMAC validation before parsing untrusted payloads!)*",
      };
    }
  }

  // 3. Lab Guidance
  if (context === "lab_session" || context === "lab_overview") {
    if (norm.includes("command") || norm.includes("cli") || norm.includes("syntax")) {
      return {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "💻 **Essential Linux & Security Commands:**\n\n" +
          "• `ss -tulpn` — View all listening TCP/UDP ports and owning processes.\n" +
          "• `curl -Iv http://127.0.0.1:8080` — Inspect raw HTTP response headers & connection status.\n" +
          "• `grep -rn 'TODO' /app` — Search recursively through files with line numbers.\n" +
          "• `journalctl -u <service> -n 30 --no-pager` — Read recent service logs for errors.",
      };
    }
    if (norm.includes("troubleshoot") || norm.includes("connection") || norm.includes("stuck")) {
      return {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "🛠️ **Lab Troubleshooting Protocol:**\n\n" +
          "1. Verify the service is active: `systemctl status <service>` or `docker ps`\n" +
          "2. Check firewall or bind address: Ensure the daemon listens on `0.0.0.0`, not strictly `127.0.0.1` if connecting from another container.\n" +
          "3. Check permissions: `ls -la` to ensure the runtime user owns the configuration files.\n" +
          "4. In browser labs, the session auto-saves state every 30 seconds.",
      };
    }
  }

  // 4. Rank & Gamification
  if (context === "rank_progression") {
    return {
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        "🏆 **Climbing the Rank Ladder:**\n\n" +
        "• **Base XP:** Earned by completing course lessons and solving judge problems.\n" +
        "• **Mastery XP:** Earned by passing timed assessments and solving challenges on your first attempt.\n" +
        "• **Streak Multipliers:** Keeping a 3+ day streak multiplies daily quest rewards by up to 1.5x.\n" +
        "• **Guild Boosts:** Guild members pool XP toward weekly momentum crates that reward rare skill badges.",
      related: "/rank",
      relatedLabel: "View your rank ladder",
    };
  }

  // 5. Default General & Study Planning
  if (norm.includes("plan") || norm.includes("study") || norm.includes("focus") || norm.includes("review")) {
    return {
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        "⏱️ **Optimal 20-Minute Study Sprint:**\n\n" +
        "1. **5 Mins:** Review yesterday's core takeaway without opening notes (active recall).\n" +
        "2. **10 Mins:** Complete 1 short video lesson or solve 1 coding challenge in the Judge.\n" +
        "3. **5 Mins:** Summarize one key tradeoff in your personal notes.\n\n" +
        "Consistency beats marathon cramming: a 20-minute daily habit builds 10x more lasting retention.",
      related: "/dashboard",
      relatedLabel: "Go to your dashboard",
    };
  }

  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content:
      "A great engineer approaches every problem by clarifying the invariants first. " +
      "Identify the exact inputs and constraints, trace the path to the desired state, and test the edge cases where assumptions break down. " +
      "What specific step can I help break down with you right now?",
    related: "/judge",
    relatedLabel: "Practice a coding challenge",
  };
}

export function AiTutor() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [typing, setTyping] = React.useState(false);
  const [messages, setMessages] = React.useState<TutorMessage[]>([]);
  const [streaming, setStreaming] = React.useState(false);
  const [streamVisible, setStreamVisible] = React.useState(0);

  const contextConfig = React.useMemo(() => getSurfaceContext(pathname), [pathname]);
  const ContextIcon = contextConfig.icon;

  const isLearningCourse = pathname ? /^\/courses\/[^/]+\/learn/.test(pathname) : false;
  const hasBottomNav = !isLearningCourse;

  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  React.useEffect(() => {
    if (!streaming) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    if (streamVisible >= last.content.length) {
      const timer = window.setTimeout(() => setStreaming(false), 120);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(
      () => setStreamVisible((value) => Math.min(last.content.length, value + 3)),
      12,
    );
    return () => window.clearTimeout(timer);
  }, [streaming, streamVisible, messages]);

  React.useEffect(() => {
    const saved = window.sessionStorage.getItem("zapsters-tutor-session");
    if (!saved) return;
    try {
      React.startTransition(() => setMessages(JSON.parse(saved) as TutorMessage[]));
    } catch {
      window.sessionStorage.removeItem("zapsters-tutor-session");
    }
  }, []);

  React.useEffect(() => {
    const openTutor = () => setOpen(true);
    const completeLesson = () =>
      toast.success("Lesson marked complete", {
        description: "Your progress and XP preview will update on the next refresh.",
      });
    window.addEventListener("zapsters:open-tutor", openTutor);
    window.addEventListener("zapsters:mark-lesson-complete", completeLesson);
    return () => {
      window.removeEventListener("zapsters:open-tutor", openTutor);
      window.removeEventListener("zapsters:mark-lesson-complete", completeLesson);
    };
  }, []);

  React.useEffect(() => {
    if (messages.length) {
      window.sessionStorage.setItem("zapsters-tutor-session", JSON.stringify(messages));
    }
  }, [messages]);

  const clearMessages = () => {
    setMessages([]);
    window.sessionStorage.removeItem("zapsters-tutor-session");
    toast.info("Conversation reset");
  };

  const send = (value = draft) => {
    const prompt = value.trim();
    if (!prompt || typing) return;
    const userMessage: TutorMessage = { id: crypto.randomUUID(), role: "user", content: prompt };
    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setTyping(true);
    window.setTimeout(() => {
      const reply = answerForContext(prompt, contextConfig.context);
      setMessages((current) => [...current, reply]);
      setTyping(false);
      setStreamVisible(0);
      setStreaming(true);
    }, 600);
  };

  return (
    <>
      {/* Floating launcher trigger (rendered when closed) */}
      {!open ? (
        <div
          className={cn(
            "fixed z-40 transition-all duration-200",
            hasBottomNav
              ? "bottom-[calc(6.5rem+env(safe-area-inset-bottom,0px))] right-[calc(1rem+env(safe-area-inset-right,0px))] lg:bottom-6 lg:right-6"
              : "bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] right-[calc(1rem+env(safe-area-inset-right,0px))] sm:bottom-6 sm:right-6",
          )}
        >
          <Button
            onClick={() => setOpen(true)}
            size="lg"
            className="rounded-full px-4 shadow-lg focus-visible:ring-2 focus-visible:ring-ring gap-2 font-medium"
            aria-expanded={false}
            aria-label="Open AI Tutor"
          >
            <Sparkles className="size-4 shrink-0 text-primary-foreground" />
            <span className="hidden sm:inline">AI Tutor</span>
            <Badge
              variant="secondary"
              className="hidden lg:inline-flex text-[10px] uppercase tracking-wider py-0 px-1.5 bg-primary-foreground/20 text-primary-foreground border-none font-semibold"
            >
              {contextConfig.badge}
            </Badge>
            {messages.length ? <Check className="size-3.5 text-primary-foreground" /> : null}
          </Button>
        </div>
      ) : null}

      {/* Chatbot modal sheet & dialog (rendered when open) */}
      {open ? (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-none sm:justify-end sm:items-end sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Zapsters Tutor"
        >
          {/* Mobile dismissal backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs pointer-events-auto sm:hidden transition-opacity"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Chat Window Panel */}
          <section
            className={cn(
              "pointer-events-auto relative flex flex-col overflow-hidden bg-card border border-border shadow-2xl",
              // Mobile: docked bottom sheet respecting top/bottom safe areas
              "w-full h-[84dvh] max-h-[calc(100dvh-2.5rem-env(safe-area-inset-top,0px))] rounded-t-2xl border-b-0",
              // Desktop: floating widget in bottom-right corner
              "sm:w-[420px] sm:h-[620px] sm:max-h-[calc(100dvh-5rem)] sm:rounded-2xl sm:border-b",
            )}
          >
            <header className="flex items-center gap-3 border-b border-border bg-primary-deep px-4 py-3 text-primary-foreground shrink-0">
              <Bot className="size-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{contextConfig.title}</p>
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium tracking-wide text-white">
                    {contextConfig.badge}
                  </span>
                </div>
                <p className="text-[11px] text-white/70 truncate">
                  Contextual assistance for this surface
                </p>
              </div>

              {messages.length > 0 ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={clearMessages}
                  className="text-white/75 hover:bg-white/10 hover:text-white"
                  aria-label="Reset conversation"
                  title="Reset conversation"
                >
                  <RotateCcw className="size-3.5" />
                </Button>
              ) : null}

              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setOpen(false)}
                className="text-white/75 hover:bg-white/10 hover:text-white"
                aria-label="Close AI Tutor"
              >
                <X className="size-4" />
              </Button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 min-h-0" aria-live="polite">
              {!messages.length ? (
                <div className="flex min-h-full flex-col justify-center">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
                    <ContextIcon className="size-6 text-primary" />
                  </div>
                  <h2 className="mt-4 text-center font-display text-base font-semibold">
                    {contextConfig.promptHeadline}
                  </h2>
                  <p className="mt-1.5 text-center text-xs leading-5 text-muted-foreground px-2">
                    {contextConfig.promptDescription}
                  </p>
                  <div className="mt-5 grid gap-2">
                    {contextConfig.suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => send(suggestion)}
                        className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-left text-xs transition-colors hover:border-primary/40 hover:bg-primary/5 active:scale-[0.99]"
                      >
                        <MessageCircle className="size-3.5 shrink-0 text-primary" />
                        <span className="min-w-0 flex-1 leading-relaxed text-foreground">
                          {suggestion}
                        </span>
                        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message, index) => {
                    const isStreaming =
                      streaming && message.role === "assistant" && index === messages.length - 1;
                    return (
                      <div
                        key={message.id}
                        className={cn("flex gap-2", message.role === "user" && "justify-end")}
                      >
                        <div
                          className={cn(
                            "max-w-[88%] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed",
                            message.role === "user"
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "bg-surface-1 text-foreground border border-border/70",
                          )}
                        >
                          <div className="whitespace-pre-wrap">
                            {isStreaming
                              ? message.content.slice(0, streamVisible)
                              : message.content}
                            {isStreaming ? (
                              <span
                                aria-hidden="true"
                                className="ml-px inline-block w-[1ch] animate-pulse text-primary font-bold"
                              >
                                ▍
                              </span>
                            ) : null}
                          </div>
                          {message.related ? (
                            <Link
                              href={message.related}
                              className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                            >
                              {message.relatedLabel ?? "Open related surface"}{" "}
                              <ChevronRight className="size-3" />
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                  {typing ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Bot className="size-4 text-primary shrink-0" />
                      <LoaderCircle className="size-3.5 animate-spin" /> Analyzing context &
                      generating response...
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                send();
              }}
              className="flex items-center gap-2 border-t border-border p-3 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]"
            >
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                disabled={typing}
                placeholder={`Ask ${contextConfig.title.toLowerCase()}...`}
                aria-label="Ask the AI Tutor"
                className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
              <Button
                type="submit"
                size="icon-sm"
                disabled={typing || !draft.trim()}
                aria-label="Send message"
              >
                <Send className="size-4" />
              </Button>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}

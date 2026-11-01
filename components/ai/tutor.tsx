"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Check, ChevronRight, LoaderCircle, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TutorMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  related?: string;
}

const SUGGESTIONS = ["Explain the current concept", "Give me a practice prompt", "How should I review today?"];

function answerFor(prompt: string): TutorMessage {
  const normalized = prompt.toLowerCase();
  if (normalized.includes("review")) return { id: crypto.randomUUID(), role: "assistant", content: "Use a short loop: recall the idea without notes, apply it once in a small problem, then write one sentence about the tradeoff you noticed.", related: "/courses" };
  if (normalized.includes("practice")) return { id: crypto.randomUUID(), role: "assistant", content: "Try a constrained exercise: parse one security event, identify the signal, and explain why your rule would ignore a normal event. Start with correctness before optimising.", related: "/judge" };
  return { id: crypto.randomUUID(), role: "assistant", content: "Think of a concept as a tool with a job. First name the problem it solves, then trace one input through the tool, and finally test the edge case where its assumptions stop holding.", related: "/courses" };
}

export function AiTutor() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [typing, setTyping] = React.useState(false);
  const [messages, setMessages] = React.useState<TutorMessage[]>([]);
  const [streaming, setStreaming] = React.useState(false);
  const [streamVisible, setStreamVisible] = React.useState(0);

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
      () => setStreamVisible((value) => Math.min(last.content.length, value + 2)),
      14,
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
    const completeLesson = () => toast.success("Lesson marked complete", { description: "Your progress and XP preview will update on the next refresh." });
    window.addEventListener("zapsters:open-tutor", openTutor);
    window.addEventListener("zapsters:mark-lesson-complete", completeLesson);
    return () => {
      window.removeEventListener("zapsters:open-tutor", openTutor);
      window.removeEventListener("zapsters:mark-lesson-complete", completeLesson);
    };
  }, []);

  React.useEffect(() => {
    if (messages.length) window.sessionStorage.setItem("zapsters-tutor-session", JSON.stringify(messages));
  }, [messages]);

  const send = (value = draft) => {
    const prompt = value.trim();
    if (!prompt || typing) return;
    const userMessage: TutorMessage = { id: crypto.randomUUID(), role: "user", content: prompt };
    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setTyping(true);
    window.setTimeout(() => {
      const reply = answerFor(prompt);
      setMessages((current) => [...current, reply]);
      setTyping(false);
      setStreamVisible(0);
      setStreaming(true);
    }, 700);
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
            className="rounded-full px-4 shadow-lg focus-visible:ring-2 focus-visible:ring-ring"
            aria-expanded={false}
            aria-label="Open AI Tutor"
          >
            <Sparkles className="size-4 shrink-0" />
            <span className="hidden sm:inline">Tutor</span>
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
              "sm:w-[400px] sm:h-[600px] sm:max-h-[calc(100dvh-5rem)] sm:rounded-2xl sm:border-b",
            )}
          >
            <header className="flex items-center gap-3 border-b border-border bg-primary-deep px-4 py-3 text-primary-foreground shrink-0">
              <Bot className="size-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Zapsters Tutor</p>
                <p className="text-[11px] text-white/65">Deterministic help from your learning context</p>
              </div>
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
                  <Sparkles className="mx-auto size-7 text-primary" />
                  <h2 className="mt-4 text-center font-display text-lg font-semibold">What are you working through?</h2>
                  <p className="mt-2 text-center text-xs leading-5 text-muted-foreground">Ask for an explanation, a practice prompt, or a focused review plan.</p>
                  <div className="mt-6 grid gap-2">
                    {SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => send(suggestion)}
                        className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-left text-xs transition-colors hover:border-primary/30 hover:bg-primary/5"
                      >
                        <MessageCircle className="size-3.5 text-primary" />
                        {suggestion}
                        <ChevronRight className="ml-auto size-3.5 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message, index) => {
                    const isStreaming = streaming && message.role === "assistant" && index === messages.length - 1;
                    return (
                      <div key={message.id} className={cn("flex gap-2", message.role === "user" && "justify-end")}>
                        <div
                          className={cn(
                            "max-w-[85%] rounded-xl px-3 py-2.5 text-sm leading-5",
                            message.role === "user" ? "bg-primary text-primary-foreground" : "bg-surface-1 text-foreground",
                          )}
                        >
                          <p>
                            {isStreaming ? message.content.slice(0, streamVisible) : message.content}
                            {isStreaming ? <span aria-hidden="true" className="ml-px inline-block w-[1ch] animate-pulse text-primary">▍</span> : null}
                          </p>
                          {message.related ? (
                            <Link href={message.related} className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                              Open a related surface <ChevronRight className="size-3" />
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                  {typing ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Bot className="size-4 text-primary shrink-0" />
                      <LoaderCircle className="size-3.5 animate-spin" /> Generating response...
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <form
              onSubmit={(event) => { event.preventDefault(); send(); }}
              className="flex items-center gap-2 border-t border-border p-3 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]"
            >
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                disabled={typing}
                placeholder="Ask your tutor..."
                aria-label="Ask the AI Tutor"
                className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
              <Button type="submit" size="icon-sm" disabled={typing || !draft.trim()} aria-label="Send message">
                <Send />
              </Button>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}

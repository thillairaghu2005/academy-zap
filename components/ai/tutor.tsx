"use client";

import * as React from "react";
import Link from "next/link";
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
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [typing, setTyping] = React.useState(false);
  const [messages, setMessages] = React.useState<TutorMessage[]>([]);

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
      setMessages((current) => [...current, answerFor(prompt)]);
      setTyping(false);
    }, 700);
  };

  return (
    <div className="fixed bottom-24 right-4 z-40 sm:bottom-6 sm:right-6">
      {open ? <section className="mb-3 flex h-[min(600px,calc(100dvh-9rem))] w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_60px_rgb(23_23_23_/_16%)]" aria-label="AI Tutor">
        <header className="flex items-center gap-3 border-b border-border bg-primary-deep px-4 py-3 text-primary-foreground"><span className="grid size-8 place-items-center rounded-lg bg-white/10"><Bot className="size-4" /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">Zapsters Tutor</p><p className="text-[11px] text-white/65">Deterministic help from your learning context</p></div><Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)} className="text-white/75 hover:bg-white/10 hover:text-white" aria-label="Close AI Tutor"><X /></Button></header>
        <div className="flex-1 overflow-y-auto p-4" aria-live="polite">
          {!messages.length ? <div className="flex min-h-full flex-col justify-center"><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Sparkles className="size-5" /></div><h2 className="mt-4 text-center font-display text-lg font-semibold">What are you working through?</h2><p className="mt-2 text-center text-xs leading-5 text-muted-foreground">Ask for an explanation, a practice prompt, or a focused review plan.</p><div className="mt-6 grid gap-2">{SUGGESTIONS.map((suggestion) => <button key={suggestion} type="button" onClick={() => send(suggestion)} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-left text-xs transition-colors hover:border-primary/30 hover:bg-primary/5"><MessageCircle className="size-3.5 text-primary" />{suggestion}<ChevronRight className="ml-auto size-3.5 text-muted-foreground" /></button>)}</div></div> : <div className="space-y-4">{messages.map((message) => <div key={message.id} className={cn("flex gap-2", message.role === "user" && "justify-end")}><div className={cn("max-w-[85%] rounded-xl px-3 py-2.5 text-sm leading-5", message.role === "user" ? "bg-primary text-primary-foreground" : "bg-surface-1 text-foreground")}><p>{message.content}</p>{message.related ? <Link href={message.related} className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary hover:underline">Open a related surface <ChevronRight className="size-3" /></Link> : null}</div></div>)}{typing ? <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="grid size-7 place-items-center rounded-full bg-primary/10 text-primary"><Bot className="size-3.5" /></span><LoaderCircle className="size-3.5 animate-spin" /> Thinking through the demo context...</div> : null}</div>}
        </div>
        <form onSubmit={(event) => { event.preventDefault(); send(); }} className="flex items-center gap-2 border-t border-border p-3"><input value={draft} onChange={(event) => setDraft(event.target.value)} disabled={typing} placeholder="Ask your tutor..." aria-label="Ask the AI Tutor" className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10" /><Button type="submit" size="icon-sm" disabled={typing || !draft.trim()} aria-label="Send message"><Send /></Button></form>
      </section> : null}
      <Button onClick={() => setOpen((current) => !current)} size="lg" className="ml-auto rounded-full px-4 shadow-[0_10px_30px_rgb(142_3_26_/_25%)]" aria-expanded={open} aria-label={open ? "Close AI Tutor" : "Open AI Tutor"}><Sparkles className="size-4" /> <span className="hidden sm:inline">Tutor</span>{messages.length ? <span className="grid size-4 place-items-center rounded-full bg-white/20 text-[10px]"><Check className="size-3" /></span> : null}</Button>
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { Check, ChevronDown, Play, ShieldCheck, Star, Users } from "lucide-react";

import { MARKETING_FAQ, MARKETING_PLANS, MARKETING_TESTIMONIALS } from "@/lib/mocks/marketing";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { JsonLd } from "@/components/seo/json-ld";
import { cn } from "@/lib/utils";

const TRUSTED_NAMES = ["Northstar", "Meridian", "Orbital", "Fieldnote", "Cinder", "Signal Labs"];

function useLiveLearners() {
  const [learners, setLearners] = React.useState(1204);
  const [recent, setRecent] = React.useState(318);

  React.useEffect(() => {
    const stored = window.sessionStorage.getItem("zapsters-live-learners");
    if (stored) {
      try {
      const value = JSON.parse(stored) as { learners: number; recent: number };
        if (Number.isFinite(value.learners) && Number.isFinite(value.recent)) {
          React.startTransition(() => {
            setLearners(value.learners);
            setRecent(value.recent);
          });
        }
      } catch {
        // A stale session value should never block the marketing page.
      }
    }
    const timer = window.setInterval(() => {
      setLearners((value) => Math.max(1120, value + Math.floor(Math.random() * 15) - 7));
      setRecent((current) => Math.max(280, current + Math.floor(Math.random() * 9) - 4));
    }, 4500);
    return () => window.clearInterval(timer);
  }, []);

  React.useEffect(() => {
    window.sessionStorage.setItem("zapsters-live-learners", JSON.stringify({ learners, recent }));
  }, [learners, recent]);

  return { learners, recent };
}

export function LiveLearningTicker() {
  const { learners, recent } = useLiveLearners();

  return (
    <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 border-x border-border bg-surface-1 px-4 py-3 text-xs text-muted-foreground sm:gap-4">
      <span className="flex items-center gap-2 font-medium text-foreground">
        <span className="size-2 animate-pulse rounded-full bg-success" aria-hidden="true" />
        {learners.toLocaleString()} learners online now
      </span>
      <span className="hidden text-border-strong sm:inline">/</span>
      <span>{recent.toLocaleString()} started a session this hour</span>
    </div>
  );
}

export function TrustedByStrip() {
  return (
    <section aria-label="Trusted by teams" className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-7 sm:px-8 lg:flex-row lg:items-center lg:px-10">
        <p className="shrink-0 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Built for people who ship</p>
        <div className="flex min-w-0 gap-7 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]" aria-hidden="true">
          {[...TRUSTED_NAMES, ...TRUSTED_NAMES].map((name, index) => (
            <span key={`${name}-${index}`} className="shrink-0 font-display text-sm font-semibold tracking-[-0.02em] text-muted-foreground/65">{name}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PricingSection({ standalone = false }: { standalone?: boolean }) {
  const [yearly, setYearly] = React.useState(false);

  return (
    <section id="pricing" className={cn("border-y border-border bg-surface-1", standalone ? "min-h-[calc(100dvh-5rem)]" : "")}>
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Simple plans, serious practice</p>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">Choose the amount of structure you need.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Start free, build a rhythm, and upgrade when the next level of feedback is worth it.</p>
          </div>
          <div className="inline-flex w-fit items-center rounded-lg border border-border bg-card p-1 text-sm shadow-sm" role="group" aria-label="Billing interval">
            <button type="button" onClick={() => setYearly(false)} aria-pressed={!yearly} className={cn("rounded-md px-3 py-2 transition-colors", !yearly ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>Monthly</button>
            <button type="button" onClick={() => setYearly(true)} aria-pressed={yearly} className={cn("rounded-md px-3 py-2 transition-colors", yearly ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>Yearly <span className="ml-1 text-[10px] font-semibold">-20%</span></button>
          </div>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {MARKETING_PLANS.map((plan) => (
            <Card key={plan.name} className={cn("relative flex h-full flex-col p-6 sm:p-7", plan.highlighted && "border-primary shadow-[0_4px_12px_rgb(180_35_60_/_15%)]")}>
              {plan.highlighted ? <span className="absolute right-5 top-5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">Most popular</span> : null}
              <p className="text-sm font-semibold">{plan.name}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{plan.description}</p>
              <div className="mt-7 flex items-end gap-1">
                <span className="font-display text-4xl font-semibold tracking-[-0.06em]">{plan.monthly === 0 ? "Free" : `$${yearly ? plan.yearly : plan.monthly}`}</span>
                {plan.monthly > 0 ? <span className="mb-1 text-xs text-muted-foreground">/ month</span> : null}
              </div>
              <ul className="mt-7 grid gap-3 border-t border-border pt-6 text-sm text-muted-foreground">
                {plan.features.map((feature) => <li key={feature} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-primary" />{feature}</li>)}
              </ul>
              <Button className="mt-8 w-full" variant={plan.highlighted ? "default" : "outline"} asChild>
                <Link href={plan.name === "Starter" ? "/register" : `/checkout/billing?plan=${plan.name.toLowerCase()}&interval=${yearly ? "yearly" : "monthly"}`}>{plan.cta}</Link>
              </Button>
            </Card>
          ))}
        </div>
        <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground"><ShieldCheck className="size-4 text-success" /> 30-day money-back guarantee on paid plans. Cancel anytime.</p>
      </div>
    </section>
  );
}

export function TestimonialWall() {
  const [active, setActive] = React.useState<(typeof MARKETING_TESTIMONIALS)[number] | null>(null);
  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Learner signal</p><h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.045em]">Progress feels better when it is visible.</h2></div><p className="max-w-md text-sm leading-6 text-muted-foreground">A calmer learning loop for people who want to leave each session with something they can use.</p></div>
        <div className="mt-9 grid gap-4 lg:grid-cols-3">
          {MARKETING_TESTIMONIALS.map((testimonial) => (
            <Card key={testimonial.name} className={cn("p-6", testimonial.featured && "border-primary/30 bg-primary/[0.025]")}>
              <div className="flex items-center gap-1 text-primary" aria-label={`${testimonial.rating} out of 5 stars`}>{Array.from({ length: testimonial.rating }).map((_, index) => <Star key={index} className="size-3.5 fill-current" />)}</div>
              <p className="mt-5 font-display text-xl font-medium leading-8 tracking-[-0.025em]">&ldquo;{testimonial.quote}&rdquo;</p>
              <div className="mt-7 flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{testimonial.initials}</span><div><p className="text-sm font-semibold">{testimonial.name}</p><p className="text-xs text-muted-foreground">{testimonial.role}</p></div><button type="button" onClick={() => setActive(testimonial)} className="ml-auto inline-flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary" aria-label={`Play video testimonial from ${testimonial.name}`}><Play className="size-3.5 fill-current" /></button></div>
            </Card>
          ))}
        </div>
      </div>
      <Dialog open={Boolean(active)} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent><DialogHeader><DialogTitle>{active?.name}&apos;s Zapsters story</DialogTitle><DialogDescription>{active?.role}</DialogDescription></DialogHeader><div className="grid aspect-video place-items-center rounded-xl bg-primary-deep text-primary-foreground"><div className="grid size-14 place-items-center rounded-full border border-white/30 bg-white/10"><Play className="ml-1 fill-current" /></div><p className="sr-only">Demo testimonial video preview</p></div><p className="text-sm leading-6 text-muted-foreground">This video-style testimonial is a frontend demo preview. The real experience remains the same: focused lessons, practical work, and a record of progress.</p></DialogContent>
      </Dialog>
    </section>
  );
}

export function FaqSection() {
  const [open, setOpen] = React.useState(0);
  const jsonLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: MARKETING_FAQ.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) };
  return (
    <section className="border-b border-border bg-surface-1">
      <JsonLd data={jsonLd} />
      <div className="mx-auto max-w-4xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="text-center"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Questions, answered</p><h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.045em]">A clear start, without the fine print.</h2></div>
        <div className="mt-9 divide-y divide-border rounded-xl border border-border bg-card">
          {MARKETING_FAQ.map((item, index) => { const expanded = open === index; return <div key={item.question}><button type="button" aria-expanded={expanded} onClick={() => setOpen(expanded ? -1 : index)} className="flex min-h-14 w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-6"><span>{item.question}</span><ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180 text-primary")} /></button>{expanded ? <div className="px-5 pb-5 text-sm leading-6 text-muted-foreground sm:px-6">{item.answer}</div> : null}</div>; })}
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  const [email, setEmail] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);
  return <section className="bg-primary-deep text-primary-foreground"><div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 sm:py-16 lg:grid-cols-[1fr_auto] lg:items-center lg:px-10"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/65">Your next session is waiting</p><h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">Make the next hour count.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-white/70">Join the product updates and get a practical learning prompt in your inbox.</p></div><div className="w-full max-w-md">{submitted ? <div className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm"><Check className="size-4" /> You&apos;re on the list.</div> : <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); if (email.includes("@")) setSubmitted(true); }}><Input value={email} onChange={(event) => setEmail(event.target.value)} required type="email" placeholder="you@example.com" aria-label="Email address" className="border-white/20 bg-white text-foreground placeholder:text-muted-foreground" /><Button type="submit" variant="secondary">Get updates</Button></form>}<p className="mt-3 text-xs text-white/55">No credit card required. Cancel anytime.</p></div></div></section>;
}

export function MarketingProofBar() {
  return <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground"><span className="flex items-center gap-2"><Users className="size-4 text-primary" /> 12,000+ learners</span><span className="flex items-center gap-2"><ShieldCheck className="size-4 text-success" /> Demo-safe by design</span><span className="flex items-center gap-2"><Check className="size-4 text-primary" /> No credit card required</span></div>;
}

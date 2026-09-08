"use client";

import * as React from "react";
import Link from "next/link";
import { m as motion } from "framer-motion";
import { Check, ChevronDown, Play, ShieldCheck, Star, Users, MonitorPlay, Lightbulb, Award, ArrowRight, BadgeCheck, CreditCard, Info, Lock } from "lucide-react";

import { MARKETING_FAQ, MARKETING_TESTIMONIALS, MARKETING_PLANS } from "@/lib/mocks/marketing";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { JsonLd } from "@/components/seo/json-ld";
import { motionSprings } from "@/components/motion/motion-tokens";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { cn } from "@/lib/utils";



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
        {learners.toLocaleString()} learners online now
      </span>
      <span className="hidden text-border-strong sm:inline">/</span>
      <span>{recent.toLocaleString()} started a session this hour</span>
    </div>
  );
}



export function PricingSection({ standalone = false, headingAs: Heading = "h2" }: { standalone?: boolean; headingAs?: "h1" | "h2" }) {
  return (
    <section id="pricing" className={cn("bg-surface-1 py-10 sm:py-12", standalone ? "min-h-[calc(100dvh-5rem)] flex items-center" : "")}>
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10 w-full">
        <div className="relative overflow-hidden rounded-[2rem] bg-card text-card-foreground shadow-xl border border-border">
          <div className="flex flex-col md:flex-row gap-8 p-6 md:p-8 lg:p-12 md:items-center">
            {/* Left Column */}
            <div className="flex-1 flex flex-col gap-5 lg:gap-6 md:pr-4">
              <div>
                <Heading className="font-display font-semibold text-2xl md:text-3xl lg:text-4xl xl:text-[2.5rem] tracking-tight text-foreground mb-3 leading-tight">
                  Build your career with a<br />Personal Plan subscription
                </Heading>
                <p className="text-muted-foreground text-sm md:text-base leading-relaxed max-w-xl">
                  Subscribers save an average of ₹4,000+ in their first month, stop paying per course. Join 5 lakh+ learners, starting at ₹500/month.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-x-4 gap-y-4 lg:gap-x-6 lg:gap-y-5">
                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <MonitorPlay className="size-3.5" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    <strong className="text-foreground">Get access</strong> to 28,000+ top-rated courses
                  </span>
                </div>
                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success/10 text-success-strong">
                    <Lightbulb className="size-3.5" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    <strong className="text-foreground">Learn</strong> from 9,000+ expert instructors
                  </span>
                </div>
                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-info/10 text-info-strong">
                    <MonitorPlay className="size-3.5" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    Dev, IT, Business, Design and 50+ more topics
                  </span>
                </div>
                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning-strong">
                    <Award className="size-3.5" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    <strong className="text-foreground">Certification</strong> prep for AWS, Microsoft, PMI, and more
                  </span>
                </div>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <Button asChild className="w-full sm:w-auto px-8 py-5 text-sm font-semibold rounded-md transition-transform hover:scale-[1.02]">
                  <Link href="/pricing">Subscribe now</Link>
                </Button>
                <Link href="/pricing" className="text-sm font-bold underline underline-offset-4 hover:text-foreground/80 w-full sm:w-auto text-center sm:text-left pt-2 sm:pt-3 text-foreground">
                  Learn more
                </Link>
              </div>
            </div>

            {/* Right Column */}
            <div className="w-full md:w-[45%] lg:w-[45%] xl:w-[40%] flex gap-3 h-[280px] md:h-[340px] lg:h-[380px] mt-8 md:mt-0">
              {/* Main Image Block */}
              <div className="relative flex-1 rounded-2xl overflow-hidden bg-card flex items-end justify-center">
                {/* Abstract shapes using theme colors */}
                <div className="absolute top-10 -left-10 w-48 h-20 bg-primary/20 transform -rotate-12" />
                <div className="absolute bottom-16 -right-16 w-64 h-24 bg-primary/30 transform -rotate-45" />
                <div className="absolute top-1/2 right-6 w-24 h-48 bg-primary/20 transform rotate-12" />
                
                {/* Placeholder for the person (silhouette) */}
                <div className="relative z-10 w-[80%] h-[85%] bg-gradient-to-t from-primary-deep/50 to-primary-deep/10 rounded-t-full shadow-2xl border-b-0 border-border border" />
              </div>

              {/* Side Accent Block */}
              <div className="relative w-20 md:w-24 rounded-2xl overflow-hidden bg-gradient-to-b from-primary/80 via-primary-deep to-primary-deep">
                <div className="absolute -left-8 top-1/3 w-20 h-40 bg-white/10 blur-xl rounded-full transform rotate-45" />
                <div className="absolute -right-6 bottom-8 w-20 h-24 bg-primary/30 blur-xl rounded-full" />
                
                {/* Curving swoosh effect */}
                <div className="absolute -left-8 bottom-0 w-24 h-48 border-r-8 border-white/10 rounded-full transform -rotate-12 blur-[2px]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function TestimonialWall() {
  const [active, setActive] = React.useState<(typeof MARKETING_TESTIMONIALS)[number] | null>(null);
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Learner signal</p><h2 className="mt-3 font-display font-light text-3xl tracking-[-0.045em]">Progress is measured in shipped code and active defense.</h2></div><p className="max-w-md text-sm leading-6 text-muted-foreground">A rigorous environment for engineers who demand hands-on practice, verified skills, and absolute clarity on what to learn next.</p></div>
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
    <section className="bg-surface-1">
      <JsonLd data={jsonLd} />
      <div className="mx-auto max-w-4xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="text-center"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Questions, answered</p><h2 className="mt-3 font-display font-light text-3xl tracking-[-0.045em]">A clear start, without the fine print.</h2></div>
        <div className="mt-9 divide-y divide-border rounded-xl border border-border bg-card">
          {MARKETING_FAQ.map((item, index) => { const expanded = open === index; return <div key={item.question}><button type="button" aria-expanded={expanded} onClick={() => setOpen(expanded ? -1 : index)} className="flex min-h-14 w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-6"><span>{item.question}</span><ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180 text-primary")} /></button>{expanded ? <div className="px-5 pb-5 text-sm leading-6 text-muted-foreground sm:px-6">{item.answer}</div> : null}</div>; })}
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="bg-primary-deep text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 sm:py-16 lg:grid-cols-[1fr_auto] lg:items-center lg:px-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/65">Your next session is waiting</p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">Deploy your first lab.</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/70">Create a free account, spin up an isolated environment, and start building verified engineering skills today.</p>
        </div>
        <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row lg:w-auto lg:flex-row">
          <Button variant="secondary" size="lg" asChild className="w-full sm:w-auto" data-analytics-label="final-cta-start-free">
            <Link href="/register">Start free</Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            asChild
            className="w-full border-white/30 bg-transparent text-primary-foreground hover:bg-white/10 hover:text-primary-foreground sm:w-auto"
            data-analytics-label="final-cta-browse-catalog"
          >
            <Link href="/courses">Browse the catalog</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

export function MarketingProofBar() {
  return <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground"><span className="flex items-center gap-2"><Users className="size-4 text-primary" /> 12,000+ learners</span><span className="flex items-center gap-2"><ShieldCheck className="size-4 text-success" /> Demo-safe by design</span><span className="flex items-center gap-2"><Check className="size-4 text-primary" /> No credit card required</span></div>;
}

export function DetailedPricingSection({ standalone = false, headingAs: Heading = "h2" }: { standalone?: boolean; headingAs?: "h1" | "h2" }) {
  const [yearly, setYearly] = React.useState(false);

  return (
    <section id="pricing" className={cn("bg-surface-1", standalone ? "min-h-[calc(100dvh-5rem)]" : "")}>
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Simple plans, serious practice</p>
            <Heading
              className="mt-3 max-w-2xl font-display font-light text-3xl tracking-[-0.045em] sm:text-4xl"
            >Choose the amount of structure you need.</Heading>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Start free, build a rhythm, and upgrade when the next level of feedback is worth it.</p>
          </div>
          <div className="relative inline-flex w-fit items-center rounded-lg border border-border bg-card p-1 text-sm shadow-sm" role="group" aria-label="Billing interval">
            {(["Monthly", "Yearly"] as const).map((option) => {
              const active = yearly === (option === "Yearly");
              const button = (
                <button
                  key={option}
                  type="button"
                  onClick={() => setYearly(option === "Yearly")}
                  aria-pressed={active}
                  className={cn(
                    "relative z-10 rounded-md px-3 py-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {active ? (
                    <motion.span
                      layoutId="billing-pill"
                      className="absolute inset-0 -z-10 rounded-md bg-primary"
                      transition={motionSprings.default}
                    />
                  ) : null}
                  {option}
                  {option === "Yearly" ? <span className="ml-1 text-[10px] font-semibold">-20%</span> : null}
                </button>
              );
              return option === "Yearly" ? (
                <Tooltip key={option}>
                  <TooltipTrigger asChild>{button}</TooltipTrigger>
                  <TooltipContent side="bottom">Billed once per year — roughly two months free versus monthly.</TooltipContent>
                </Tooltip>
              ) : (
                button
              );
            })}
          </div>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {MARKETING_PLANS.map((plan) => {
            const planInterval = yearly ? "yearly" : "monthly";
            // Paid plans funnel through registration first; "next" returns the
            // learner to their intended surface (billing / support) after signup.
            const destination =
              plan.name === "Pro"
                ? "/checkout/billing?plan=pro&interval=${planInterval}"
                : plan.name === "Teams"
                  ? "/support/new"
                  : "/dashboard";
            const href =
              plan.name === "Starter"
                ? "/register"
                : "/register?next=${encodeURIComponent(destination)}";
            return (
              <Card key={plan.name} className={cn("relative flex h-full flex-col p-6 sm:p-7", plan.highlighted && "border-primary shadow-lg")}>
                {plan.highlighted ? <span className="absolute right-5 top-5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">Most popular</span> : null}
                <p className="text-sm font-semibold">{plan.name}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{plan.description}</p>
                <div className="mt-7 flex items-end gap-1">
                  <span className="font-display text-4xl font-semibold tracking-[-0.06em]">{plan.monthly === 0 ? "Free" : "$${yearly ? plan.yearly : plan.monthly}"}</span>
                  {plan.monthly > 0 ? <span className="mb-1 text-xs text-muted-foreground">/ month{yearly ? ", billed yearly" : ""}</span> : null}
                </div>
                <ul className="mt-7 grid flex-1 content-start gap-3 border-t border-border pt-6 text-sm text-muted-foreground">
                  {plan.features.map((feature) => <li key={feature} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-primary" />{feature}</li>)}
                </ul>
                <Button className="mt-8 w-full" variant={plan.highlighted ? "default" : "outline"} asChild>
                  <Link href={href}>
                    {plan.cta}
                    <ArrowRight />
                  </Link>
                </Button>
              </Card>
            );
          })}
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><ShieldCheck className="size-4 text-success" /> 30-day money-back guarantee</span>
          <span className="flex items-center gap-1.5"><Check className="size-4 text-success" /> Cancel anytime</span>
          <span className="flex items-center gap-1.5"><CreditCard className="size-4 text-muted-foreground" /> USD · taxes added at checkout</span>
          <span className="flex items-center gap-1.5"><BadgeCheck className="size-4 text-muted-foreground" /> Group plans for teams</span>
        </div>
        <div className="mx-auto mt-8 flex max-w-md items-center justify-center gap-3">
          <span className="h-px flex-1 bg-border" aria-hidden="true" />
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                tabIndex={0}
                role="note"
                aria-label="Payments are PCI-DSS compliant via our payment provider. Zapsters never stores card numbers."
                className="flex cursor-help items-center gap-1.5 rounded text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Lock className="size-3.5" /> PCI-DSS via our payment provider
                <Info className="size-3" aria-hidden="true" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-56 text-center normal-case tracking-normal">
              Card details are handled by our PCI-DSS compliant payment provider. Zapsters never sees or stores them.
            </TooltipContent>
          </Tooltip>
          <span className="h-px flex-1 bg-border" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}

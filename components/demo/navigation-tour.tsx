"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowRight,
  Award,
  BookOpen,
  FlaskConical,
  Gauge,
  Layers,
  Rocket,
  ShoppingCart,
  Sparkles,
} from "lucide-react";

import { DEMO_STORAGE_KEYS, writeDemoStorage } from "@/lib/demo/storage";
import { useAnnounce } from "@/components/providers/live-region-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * One-click navigation tour (Task 4 — demo flows). A step-through overlay of
 * the major modules, opened from /dashboard?tour=1 or the demo settings
 * surface. Completion is remembered in the browser so it doesn't replay on
 * every visit.
 */

interface TourStep {
  icon: typeof Layers;
  title: string;
  body: string;
  href: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    icon: Layers,
    title: "Your dashboard",
    body: "Every surface starts here — continue learning, jump into judge, labs, or commerce.",
    href: "/dashboard",
  },
  {
    icon: BookOpen,
    title: "Courses",
    body: "Enroll, watch lessons, mark them complete, and unlock your completion certificate.",
    href: "/courses",
  },
  {
    icon: Gauge,
    title: "Judge",
    body: "Solve coding problems and get deterministic verdicts from the mock judge engine.",
    href: "/judge",
  },
  {
    icon: FlaskConical,
    title: "Labs",
    body: "Provision virtual machines, chase flags in a terminal, and finish with verified objectives.",
    href: "/labs",
  },
  {
    icon: Award,
    title: "Rank & badges",
    body: "XP, streaks, and leagues — every credential links to a public verification page.",
    href: "/rank",
  },
  {
    icon: ShoppingCart,
    title: "Commerce",
    body: "Cart, demo coupons, hosted checkout, and downloadable receipts — all local.",
    href: "/cart",
  },
];

export function NavigationTour() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const announce = useAnnounce();
  // Open when the URL carries ?tour=1 — a clean link from demo settings.
  const tourRequested = searchParams.get("tour") === "1";
  const [open, setOpen] = React.useState(tourRequested);
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    if (!tourRequested) return;
    announce("Navigation tour started");
    // Drop the query param so revisits/back/forward don't reopen it.
    router.replace(window.location.pathname, { scroll: false });
  }, [tourRequested, router, announce]);

  const finish = () => {
    writeDemoStorage(DEMO_STORAGE_KEYS.tour, true);
    setOpen(false);
    announce("Tour finished");
  };

  const stepCount = TOUR_STEPS.length;
  const current = TOUR_STEPS[step] ?? TOUR_STEPS[0]!;
  const CurrentIcon = current.icon;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            {step + 1} of {stepCount} — {current.title}
          </DialogTitle>
          <DialogDescription>
            A quick walk through the major modules of the Zapsters demo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface-1 p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <CurrentIcon className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">{current.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {current.body}
              </p>
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5" aria-hidden="true">
            {TOUR_STEPS.map((item, index) => (
              <span
                key={item.title}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  index === step
                    ? "w-5 bg-primary"
                    : index < step
                      ? "w-1.5 bg-primary/40"
                      : "w-1.5 bg-border",
                )}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={step === 0}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
              >
                Back
              </Button>
              {step < stepCount - 1 ? (
                <Button variant="outline" size="sm" onClick={finish}>
                  Skip tour
                </Button>
              ) : null}
            </div>

            {step < stepCount - 1 ? (
              <Button size="sm" onClick={() => setStep((s) => Math.min(stepCount - 1, s + 1))}>
                Next
                <ArrowRight className="size-3.5" />
              </Button>
            ) : (
              <Button variant="gradient" size="sm" asChild onClick={finish}>
                <Link href={current.href}>
                  <Rocket className="size-3.5" />
                  Start exploring
                </Link>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

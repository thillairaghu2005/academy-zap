"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Compass, ExternalLink, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * In-app guided walkthrough for /admin (F7 Task 1) — a short, factual tour
 * of what is actually built, with one callout per surface pointing at the
 * real UI element (the admin sidebar). "Seen" state persists per user
 * (mock localStorage, see lib/mocks/walkthrough.ts) so it doesn't replay
 * every visit; a "Replay walkthrough" entry in the admin sidebar re-opens it.
 */

export interface WalkthroughStep {
  title: string;
  /** Where the surface lives in the real UI. */
  element: string;
  /** Short factual copy — documents what's built, not aspirational. */
  copy: string;
  href: string;
}

export const ADMIN_WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    title: "Dashboard",
    element: "The page you're on",
    copy: "Stat cards with live mock counts (courses, labs, problems, orders, users) plus the five most recent audit entries.",
    href: "/admin",
  },
  {
    title: "Courses",
    element: "Left sidebar → Courses",
    copy: "The authoring surface: create, edit and delete courses, submit drafts for review, and publish via a second reviewer. The preview button opens the real course page in preview mode.",
    href: "/admin/courses",
  },
  {
    title: "Problems",
    element: "Left sidebar → Problems",
    copy: "Manage-style list of judge problems — difficulty, language and acceptance rate. Read-only until problem authoring lands.",
    href: "/admin/problems",
  },
  {
    title: "Labs",
    element: "Left sidebar → Labs",
    copy: "Manage-style list of virtual labs with difficulty and objectives counts. Read-only list.",
    href: "/admin/labs",
  },
  {
    title: "Orders",
    element: "Left sidebar → Orders",
    copy: "Every mock order from the checkout flow, with paid / failed / refunded status badges.",
    href: "/admin/orders",
  },
  {
    title: "Users",
    element: "Left sidebar → Users",
    copy: "The platform's mock identities with role toggles (learner ⇄ admin). Frontend-only mock — real RBAC lives in the backend.",
    href: "/admin/users",
  },
  {
    title: "Audit log",
    element: "Left sidebar → Audit log",
    copy: "Append-only moderation trail. XP-affecting rows link to their ledger entry (expandable), and the reconciliation panel checks ledger sums against cached balances — the verdict is server-computed, never client math.",
    href: "/admin/audit",
  },
];

export function AdminWalkthrough({
  open,
  onOpenChange,
  onComplete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when the user finishes/skips — persists the "seen" state. */
  onComplete: () => void;
}) {
  const [stepIndex, setStepIndex] = React.useState(0);
  const step = ADMIN_WALKTHROUGH_STEPS[stepIndex]!;
  const isLast = stepIndex === ADMIN_WALKTHROUGH_STEPS.length - 1;

  const close = () => onOpenChange(false);

  const finish = () => {
    onComplete();
    close();
  };

  const skip = () => {
    onComplete();
    close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <Compass className="size-4.5" />
            </div>
            <div>
              <DialogTitle className="font-display text-base">
                Tour the admin console
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Step {stepIndex + 1} of {ADMIN_WALKTHROUGH_STEPS.length}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Step progress */}
        <div className="flex gap-1 px-6 pt-1">
          {ADMIN_WALKTHROUGH_STEPS.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                i <= stepIndex ? "bg-primary" : "bg-border",
              )}
            />
          ))}
        </div>

        <div className="px-6 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            {step.element}
          </p>
          <h3 className="mt-1 font-display text-lg font-bold tracking-tight">
            {step.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {step.copy}
          </p>
        </div>

        <DialogFooter className="flex-row items-center justify-between gap-2 border-t border-border px-6 py-4">
          <Button variant="ghost" size="sm" onClick={skip}>
            {isLast ? "Done" : "Skip tour"}
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={stepIndex === 0} asChild>
              <Link
                href={ADMIN_WALKTHROUGH_STEPS[stepIndex - 1]!.href}
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              >
                Back
              </Link>
            </Button>
            {isLast ? (
              <Button variant="gradient" size="sm" onClick={finish}>
                <Check className="size-4" />
                Finish
              </Button>
            ) : (
              <Button variant="gradient" size="sm" asChild>
                <Link
                  href={step.href}
                  onClick={() => setStepIndex((i) => i + 1)}
                >
                  Next
                  <ExternalLink className="size-3.5" />
                </Link>
              </Button>
            )}
          </div>
        </DialogFooter>

        <button
          onClick={close}
          className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Close tour"
        >
          <X className="size-4" />
        </button>
      </DialogContent>
    </Dialog>
  );
}

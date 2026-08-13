"use client";

import Link from "next/link";
import { m as motion, useReducedMotion } from "framer-motion";
import { Check, Circle } from "lucide-react";

import type { ProfileChecklistItem } from "@/lib/contracts/profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ProfileCompletion({
  checklist,
}: {
  checklist: ProfileChecklistItem[];
}) {
  const reducedMotion = useReducedMotion();
  const completed = checklist.filter((item) => item.completed).length;
  const percentage = checklist.length === 0 ? 0 : Math.round((completed / checklist.length) * 100);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <CardTitle>Profile strength</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Complete the checklist to make your learning path more useful.
            </p>
          </div>
          <span className="font-display text-h2 text-primary" aria-label={`${percentage}% complete`}>
            {percentage}%
          </span>
        </div>
        <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
          <motion.div
            initial={{ scaleX: reducedMotion ? 1 : 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: reducedMotion ? 0 : 0.3, ease: "easeOut" }}
            style={{ width: `${percentage}%`, originX: 0 }}
            className="h-full rounded-full bg-primary"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {completed} of {checklist.length} profile signals complete
        </p>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2 sm:grid-cols-2" aria-label="Profile completion checklist">
          {checklist.map((item) => {
            const content = (
              <>
                {item.completed ? (
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-success/15 text-success-strong">
                    <Check className="size-4" />
                  </span>
                ) : (
                  <Circle className="size-7 shrink-0 text-muted-foreground/50" />
                )}
                <span className="min-w-0">
                  <span className={cn("block text-sm font-medium", item.completed && "text-muted-foreground")}>{item.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{item.description}</span>
                </span>
              </>
            );

            return (
              <li key={item.id}>
                {item.href && !item.completed ? (
                  <Link href={item.href} className="flex min-h-11 items-start gap-3 rounded-lg border border-border p-3 outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
                    {content}
                  </Link>
                ) : (
                  <div className="flex min-h-11 items-start gap-3 rounded-lg border border-border p-3">
                    {content}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

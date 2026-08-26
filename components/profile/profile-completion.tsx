"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Circle } from "lucide-react";

import { AnimatedNumber } from "@/components/shared/animated-number";

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
          <span className="font-display text-h2 text-ink" aria-label={`${percentage}% complete`}>
            <AnimatedNumber value={percentage} />%
          </span>
        </div>
        <div className="relative mt-4 h-[1px] overflow-hidden rounded-full border border-ink-muted bg-surface-2" aria-hidden="true">
          <motion.div
            initial={{ scaleX: reducedMotion ? 1 : 0 }}
            animate={{ scaleX: 1 }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
            style={{ width: `${percentage}%`, originX: 0 }}
            className="h-full rounded-full bg-surface-inverse"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {completed} of {checklist.length} profile signals complete
        </p>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2 sm:grid-cols-2" aria-label="Profile completion checklist">
          {checklist.map((item, index) => {
            const content = (
              <>
                {item.completed ? (
                  <span className="grid size-7 shrink-0 place-items-center rounded-full text-ink">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-7">
                      <circle cx="12" cy="12" r="10" fill="currentColor" />
                      <motion.path
                        initial={{ pathLength: reducedMotion ? 1 : 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ delay: reducedMotion ? 0 : index * 0.08, duration: 0.4, ease: "easeOut" }}
                        d="M8 12.5L10.5 15L16 9"
                        stroke="var(--color-surface)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                ) : (
                  <motion.div
                    animate={reducedMotion ? {} : { opacity: [0.5, 0.8, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2, delay: index * 0.2 }}
                  >
                    <Circle className="size-7 shrink-0 text-ink-muted/50" />
                  </motion.div>
                )}
                <span className="min-w-0">
                  <span className={cn("block text-sm font-medium", item.completed && "text-muted-foreground")}>{item.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{item.description}</span>
                </span>
              </>
            );

            return (
              <motion.li
                key={item.id}
                initial={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: reducedMotion ? 0 : index * 0.08,
                  type: "spring",
                  stiffness: 120,
                  damping: 20
                }}
              >
                {item.href && !item.completed ? (
                  <motion.div whileHover={reducedMotion ? {} : { y: -2 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                    <Link href={item.href} className="flex min-h-11 items-start gap-3 rounded-lg border border-border p-3 outline-none transition-colors hover:bg-surface-hover hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring">
                      {content}
                    </Link>
                  </motion.div>
                ) : (
                  <div className="flex min-h-11 items-start gap-3 rounded-lg border border-border p-3">
                    {content}
                  </div>
                )}
              </motion.li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

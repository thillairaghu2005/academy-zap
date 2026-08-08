"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Flame, TrendingUp } from "lucide-react";

import { getComboCurve } from "@/lib/data/demo/assessment";
import { SkeletonLines } from "@/components/shared/skeletons";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Combo curve teaser — the ×1.0 → ×3.0 multiplier curve.             */
/*                                                                     */
/*  The curve comes from the demo service (getComboCurve), so what the detail */
/*  page advertises is exactly the formula the grader applies.         */
/* ------------------------------------------------------------------ */

export function ComboCurveTeaser() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["combo-curve"],
    queryFn: () => getComboCurve(),
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <SkeletonLines count={2} />
      </div>
    );
  }

  if (isError || !data) {
    return null;
  }

  const maxMultiplier = 3;
  const maxCount = data[data.length - 1]?.count ?? 8;

  return (
    <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 font-display text-small font-semibold">
          <Flame className="size-4 text-amber-700" />
          Combo curve
        </p>
          <span className="flex items-center gap-1 text-caption text-muted-foreground">
          <TrendingUp className="size-3" />
          server-verified multiplier
        </span>
      </div>

      {/* Step chart */}
      <div className="mt-3 flex h-16 items-end gap-1">
        {data.map((step, i) => {
          const heightPct = (step.multiplier / maxMultiplier) * 100;
          const maxed = step.multiplier >= maxMultiplier;
          return (
            <div
              key={step.count}
              className="group relative flex flex-1 flex-col items-center justify-end"
            >
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${heightPct}%` }}
                transition={{ delay: 0.03 * i, duration: 0.4, ease: "easeOut" }}
                className={cn(
                  "w-full rounded-t-sm",
                  maxed
                    ? "bg-gradient-to-t from-orange-500 to-amber-400"
                    : "bg-gradient-to-t from-amber-600/80 to-amber-400/70",
                )}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
        <span>0 correct</span>
        <span>
          ×{(data.find((s) => s.count === 4)?.multiplier ?? 2).toFixed(2)} at 4
        </span>
        <span className="text-amber-700">
          ×{maxMultiplier.toFixed(2)} at {maxCount}
        </span>
      </div>

      <p className="mt-2 text-caption leading-relaxed text-muted-foreground">
        Consecutive correct answers raise the multiplier up to{" "}
        <span className="font-semibold text-amber-700">
          ×{maxMultiplier.toFixed(2)}
        </span>
        . A wrong answer resets the run — the meter you see is a preview; the
        server applies the real value.
      </p>
    </div>
  );
}

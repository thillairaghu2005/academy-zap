"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";

import type { ComboState } from "@/lib/contracts/assessment";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Combo meter — "the dopamine layer" (build.md F4).                  */
/*                                                                     */
/*  In prod this is SSE-driven; the mock polls the server-derived      */
/*  combo state (getComboState) on an interval. The client PREVIEWS    */
/*  the meter — the server is the only thing that can turn it into XP  */
/*  (gamification §7.6 — the "client trusted itself" gap is closed).   */
/* ------------------------------------------------------------------ */

export function ComboMeter({ combo }: { combo: ComboState }) {
  const pct = Math.min(100, (combo.count / 8) * 100);
  const active = combo.count > 0;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-2.5">
      {/* Flame pulse */}
      <motion.div
        key={combo.count}
        initial={{ scale: active ? 1.4 : 1, rotate: active ? -8 : 0 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 14 }}
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-lg",
          active
            ? "bg-amber-500/20 text-amber-700"
            : "bg-muted text-muted-foreground",
        )}
      >
        <motion.span
          animate={
            active
              ? { scale: [1, 1.15, 1] }
              : { scale: 1 }
          }
          transition={
            active
              ? { duration: 1.1, repeat: Infinity, ease: "easeInOut" }
              : undefined
          }
        >
          <Flame className="size-4" />
        </motion.span>
      </motion.div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="font-display text-small font-semibold">
            {active ? `${combo.count}× combo` : "Combo"}
          </span>
          <span className="font-mono text-[11px] text-amber-700">
            ×{combo.multiplier.toFixed(2)}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
          <span className="text-caption text-muted-foreground">
          best: {combo.best} · server-verified preview
        </span>
      </div>
    </div>
  );
}

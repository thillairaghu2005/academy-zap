"use client";

import * as React from "react";
import { m as motion } from "framer-motion";
import { Flame } from "lucide-react";

import type { ComboState } from "@/lib/contracts/assessment";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Combo meter — "the dopamine layer" (build.md F4).                  */
/*                                                                     */
/*  The demo polls the service-derived                                  */
/*  combo state (getComboState) on an interval. The client PREVIEWS    */
/*  the meter — the server is the only thing that can turn it into XP  */
/*  (gamification §7.6 — the "client trusted itself" gap is closed).   */
/* ------------------------------------------------------------------ */

export function ComboMeter({ combo }: { combo: ComboState }) {
  const pct = Math.min(100, (combo.count / 8) * 100);
  const active = combo.count > 0;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5">
      <Flame className={cn("size-5 shrink-0", active ? "text-primary" : "text-muted-foreground")} />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="font-display text-small font-semibold">
            {active ? `${combo.count}× combo` : "Combo"}
          </span>
          <span className="font-mono text-[11px] font-semibold text-primary">
            ×{combo.multiplier.toFixed(2)}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{ width: `${pct}%`, originX: 0 }}
          />
        </div>
          <span className="text-caption text-muted-foreground">
          best: {combo.best} · server-verified preview
        </span>
      </div>
    </div>
  );
}

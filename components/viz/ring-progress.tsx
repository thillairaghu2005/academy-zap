"use client";

import * as React from "react";
import { m as motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

interface RingProgressProps {
  /** 0–100 */
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
  label?: React.ReactNode;
  sublabel?: React.ReactNode;
  /** Tone of the track ring. */
  tone?: "primary" | "success" | "mastery";
}

const TONE_FILL = {
  primary: "var(--color-primary)",
  success: "var(--color-success)",
  mastery: "var(--color-xp-mastery)",
} as const;

/** Radial progress ring with a spring settle — replaces flat `<Progress>`. */
export function RingProgress({
  value,
  size = 128,
  stroke = 10,
  className,
  label,
  sublabel,
  tone = "primary",
}: RingProgressProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div
      className={cn("flex items-center gap-4", className)}
      role="img"
      aria-label={`${clamped} percent complete`}
    >
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--color-primary-light)"
            strokeWidth={stroke}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={TONE_FILL[tone]}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={reducedMotion ? false : { strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={reducedMotion ? undefined : { type: "spring", bounce: 0, duration: 0.9 }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="font-display text-xl font-semibold tabular-nums">
            {Math.round(clamped)}%
          </span>
        </div>
      </div>
      {label || sublabel ? (
        <div className="min-w-0">
          {label ? <p className="text-sm font-semibold">{label}</p> : null}
          {sublabel ? (
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{sublabel}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
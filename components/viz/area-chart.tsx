"use client";

import * as React from "react";
import { m as motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

interface AreaChartProps {
  data: number[];
  labels?: string[];
  width?: number;
  height?: number;
  className?: string;
  strokeClassName?: string;
  ariaLabel?: string;
}

/** Smooth area chart with an animated draw — used for weekly activity. */
export function AreaChart({
  data,
  labels,
  width = 480,
  height = 160,
  className,
  strokeClassName = "stroke-primary",
  ariaLabel = "Trend chart",
}: AreaChartProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const gradientId = React.useId();
  const padX = 8;
  const padY = 8;
  const max = Math.max(...data, 1);
  const step = (width - padX * 2) / Math.max(1, data.length - 1);

  const points = data.map((value, index) => {
    const x = padX + index * step;
    const y = padY + (1 - value / max) * (height - padY * 2);
    return [x, y] as const;
  });

  // Catmull-Rom → Bézier smoothing for a premium curve.
  const d = points.reduce((acc, point, index) => {
    if (index === 0) return `M${point[0]},${point[1]}`;
    const prev = points[index - 1]!;
    const cx = (prev[0] + point[0]) / 2;
    return `${acc} C${cx},${prev[1]} ${cx},${point[1]} ${point[0]},${point[1]}`;
  }, "");

  const area = `${d} L${points[points.length - 1]![0]},${height} L${points[0]![0]},${height} Z`;

  return (
    <div className={cn("relative", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        className="overflow-visible"
        role="img"
        aria-label={ariaLabel}
      >
        <motion.path
          d={area}
          fill={`url(#${gradientId})`}
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.3 }}
        />
        <motion.path
          d={d}
          fill="none"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={strokeClassName}
          initial={reducedMotion ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.22} />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
      </svg>
      {labels ? (
        <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
          <span>{labels[0]}</span>
          <span>{labels[labels.length - 1]}</span>
        </div>
      ) : null}
    </div>
  );
}
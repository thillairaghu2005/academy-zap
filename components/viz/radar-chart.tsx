"use client";

import * as React from "react";
import { m as motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

interface RadarChartProps {
  axes: { label: string; value: number }[];
  size?: number;
  height?: number;
  className?: string;
}

/** Skill-coverage radar (UI §5.5) — drawn from the same tokens as the XP tracks. */
export function RadarChart({ axes, size = 260, height, className }: RadarChartProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const chartSize = height ?? size;
  const center = chartSize / 2;
  const radius = chartSize / 2 - 28;
  const levels = 4;

  const angleFor = (index: number) =>
    (Math.PI * 2 * index) / axes.length - Math.PI / 2;

  const point = (index: number, factor: number) => {
    const angle = angleFor(index);
    return [
      center + radius * factor * Math.cos(angle),
      center + radius * factor * Math.sin(angle),
    ] as const;
  };

  const polygonPoints = (factor: number) =>
    axes
      .map((_, index) => point(index, factor).join(","))
      .join(" ");

  const valuePolygon = axes
    .map((axis, index) => {
      const [x, y] = point(index, Math.max(0.08, Math.min(1, axis.value / 100)));
      return `${x},${y}`;
    })
    .join(" ");

  const labels = axes.map((axis, index) => {
    const angle = angleFor(index);
    const x = center + (radius + 26) * Math.cos(angle);
    const y = center + (radius + 26) * Math.sin(angle);
    return { x, y, label: axis.label, value: axis.value };
  });

  return (
    <div className={cn("relative", className)}>
      <svg viewBox={`0 0 ${chartSize} ${chartSize}`} width="100%" height={chartSize} role="img" aria-label="Skill coverage">
        {Array.from({ length: levels }).map((_, level) => (
          <polygon
            key={level}
            points={polygonPoints((level + 1) / levels)}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth={1}
          />
        ))}
        {axes.map((_, index) => {
          const [x, y] = point(index, 1);
          return <line key={index} x1={center} y1={center} x2={x} y2={y} stroke="var(--color-border)" strokeWidth={1} />;
        })}
        <motion.polygon
          points={valuePolygon}
          fill="var(--color-primary)"
          fillOpacity={0.16}
          stroke="var(--color-primary)"
          strokeWidth={2}
          strokeLinejoin="round"
          initial={reducedMotion ? false : { opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ transformOrigin: `${center}px ${center}px` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        {labels.map(({ x, y, label, value }) => (
          <span
            key={label}
            className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-medium text-muted-foreground"
            style={{ left: `${(x / chartSize) * 100}%`, top: `${(y / chartSize) * 100}%` }}
          >
            {label} {value}%
          </span>
        ))}
      </div>
    </div>
  );
}
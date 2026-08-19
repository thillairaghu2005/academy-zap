"use client";

import * as React from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

interface AnimatedNumberProps {
  value: number;
  className?: string;
  /** Count from zero the first time it scrolls into view. */
  countUpOnMount?: boolean;
}

/**
 * Live numbers ride a critically damped spring (SKILL §4, §11) instead of
 * jumping. `tabular-nums` prevents width jitter. Reduced motion swaps to an
 * instant value.
 */
export function AnimatedNumber({
  value,
  className,
  countUpOnMount = false,
}: AnimatedNumberProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: false, amount: 0.6 });
  const seenRef = React.useRef(false);
  const prevRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (reducedMotion) {
      node.textContent = value.toLocaleString();
      return;
    }

    // First paint shows the value immediately (SSR-safe); optionally count up
    // once when it scrolls into view.
    if (!seenRef.current) {
      seenRef.current = true;
      if (countUpOnMount && inView && value !== 0) {
        const controls = animate(0, value, {
          type: "spring",
          bounce: 0,
          duration: 0.6,
          onUpdate: (latest) => {
            node.textContent = Math.round(latest).toLocaleString();
          },
        });
        prevRef.current = value;
        return () => controls.stop();
      }
      prevRef.current = value;
      return;
    }

    const from = prevRef.current ?? value;
    prevRef.current = value;
    if (from === value) return;
    const controls = animate(from, value, {
      type: "spring",
      bounce: 0,
      duration: 0.5,
      onUpdate: (latest) => {
        node.textContent = Math.round(latest).toLocaleString();
      },
    });
    return () => controls.stop();
  }, [value, reducedMotion, countUpOnMount, inView]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {value.toLocaleString()}
    </span>
  );
}
"use client";

import * as React from "react";
import { useInView, useReducedMotion } from "framer-motion";

type CountUpProps = {
  value: number;
  duration?: number;
  format?: (value: number) => string;
  className?: string;
};

export function CountUp({ value, duration = 900, format, className }: CountUpProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reducedMotion = useReducedMotion() ?? false;
  const [current, setCurrent] = React.useState(reducedMotion ? value : 0);

  React.useEffect(() => {
    if (!inView || reducedMotion) {
      return;
    }

    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(value * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, inView, reducedMotion, value]);

  const displayValue = reducedMotion ? value : current;

  return <span ref={ref} className={className}>{format ? format(displayValue) : Math.round(displayValue).toLocaleString()}</span>;
}

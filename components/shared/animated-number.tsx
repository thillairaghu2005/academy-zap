"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useTransform, animate, useReducedMotion } from "motion/react";

export function AnimatedNumber({ value }: { value: number }) {
  const reducedMotion = useReducedMotion();
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest: number) => Math.round(latest));

  useEffect(() => {
    if (reducedMotion) {
      count.set(value);
      return;
    }
    const controls = animate(count, value, {
      type: "spring",
      stiffness: 120,
      damping: 20,
    });
    return controls.stop;
  }, [count, value, reducedMotion]);

  return <motion.span>{rounded}</motion.span>;
}

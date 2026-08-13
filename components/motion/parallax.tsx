"use client";

import * as React from "react";
import { m as motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

type ParallaxProps = {
  children: React.ReactNode;
  className?: string;
  from?: number;
  to?: number;
};

export function Parallax({ children, className, from = -24, to = 24 }: ParallaxProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion() ?? false;
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [from, to]);

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ y: reducedMotion ? 0 : y, willChange: reducedMotion ? "auto" : "transform" }}
    >
      {children}
    </motion.div>
  );
}

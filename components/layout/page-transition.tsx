"use client";

import * as React from "react";
import { m as motion, useReducedMotion } from "framer-motion";

import { motionSprings } from "@/components/motion/motion-tokens";

/**
 * Route transition (UI §8.2): a short fade + rise on every navigation.
 * Mounted as a root-level `template.tsx` so the animation replays on each
 * route change without exit-frame flashes.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion ? undefined : motionSprings.default}
    >
      {children}
    </motion.div>
  );
}
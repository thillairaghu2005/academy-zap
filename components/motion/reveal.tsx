"use client";

import * as React from "react";
import { m as motion, useReducedMotion } from "framer-motion";

import { motionDurations, motionEasings } from "./motion-tokens";

type RevealProps = Omit<React.ComponentProps<typeof motion.div>, "children"> & {
  children: React.ReactNode;
  delay?: number;
  scale?: boolean;
  amount?: number;
};

export function Reveal({
  children,
  delay = 0,
  scale = false,
  amount = 0.2,
  ...props
}: RevealProps) {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <motion.div
      {...props}
      initial={reducedMotion ? false : { opacity: 0, y: 24, scale: scale ? 0.98 : 1 }}
      whileInView={reducedMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount }}
      transition={
        reducedMotion
          ? undefined
          : { duration: motionDurations.slow, delay, ease: motionEasings.out }
      }
    >
      {children}
    </motion.div>
  );
}

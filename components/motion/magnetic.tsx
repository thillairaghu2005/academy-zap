"use client";

import * as React from "react";
import { m as motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";

import { motionEasings } from "./motion-tokens";

type MagneticProps = {
  children: React.ReactNode;
  className?: string;
  strength?: number;
};

export function Magnetic({ children, className, strength = 0.2 }: MagneticProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const x = useSpring(useMotionValue(0), motionEasings.softSpring);
  const y = useSpring(useMotionValue(0), motionEasings.softSpring);

  function handleMove(event: React.PointerEvent<HTMLDivElement>) {
    if (reducedMotion) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - (bounds.left + bounds.width / 2)) * strength);
    y.set((event.clientY - (bounds.top + bounds.height / 2)) * strength);
  }

  function reset() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      className={className}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      style={{ x: reducedMotion ? 0 : x, y: reducedMotion ? 0 : y }}
    >
      {children}
    </motion.div>
  );
}

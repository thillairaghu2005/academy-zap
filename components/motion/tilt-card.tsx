"use client";

import * as React from "react";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from "framer-motion";

import { cn } from "@/lib/utils";
import { motionEasings } from "./motion-tokens";

type TiltCardProps = {
  children: React.ReactNode;
  className?: string;
  max?: number;
};

export function TiltCard({ children, className, max = 6 }: TiltCardProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const rotateX = useSpring(useMotionValue(0), motionEasings.spring);
  const rotateY = useSpring(useMotionValue(0), motionEasings.spring);
  const glareX = useMotionValue(50);
  const glareY = useMotionValue(50);
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgb(255 255 255 / 16%), transparent 32%)`;

  function handleMove(event: React.PointerEvent<HTMLDivElement>) {
    if (reducedMotion) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    rotateX.set((0.5 - y) * max);
    rotateY.set((x - 0.5) * max);
    glareX.set(x * 100);
    glareY.set(y * 100);
  }

  function reset() {
    rotateX.set(0);
    rotateY.set(0);
    glareX.set(50);
    glareY.set(50);
  }

  return (
    <motion.div
      className={cn("group relative transform-gpu", className)}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      style={{ rotateX: reducedMotion ? 0 : rotateX, rotateY: reducedMotion ? 0 : rotateY, transformPerspective: 1000 }}
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: glare }}
      />
      {children}
    </motion.div>
  );
}

"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

import { motionDurations, motionEasings, motionStagger } from "./motion-tokens";

type TextRevealProps = {
  text: string;
  className?: string;
  mode?: "words" | "lines";
  delay?: number;
};

export function TextReveal({ text, className, mode = "words", delay = 0 }: TextRevealProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const parts = mode === "lines" ? text.split("\n") : text.split(" ");

  return (
    <motion.span
      aria-label={text}
      className={className}
      initial={reducedMotion ? false : "hidden"}
      animate={reducedMotion ? undefined : "visible"}
      variants={{
        hidden: {},
        visible: { transition: { delayChildren: delay, staggerChildren: motionStagger.tight } },
      }}
    >
      {parts.map((part, index) => (
        <span key={`${part}-${index}`} className={mode === "lines" ? "block overflow-hidden" : "inline-block overflow-hidden"}>
          <motion.span
            aria-hidden="true"
            className="inline-block"
            variants={{
              hidden: { opacity: 0, y: "100%" },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: motionDurations.cinematic, ease: motionEasings.out }}
          >
            {part}
          </motion.span>
          {mode === "words" && index < parts.length - 1 ? " " : null}
        </span>
      ))}
    </motion.span>
  );
}

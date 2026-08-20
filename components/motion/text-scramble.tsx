"use client";

import * as React from "react";
import { useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

const GLYPHS = "!<>-_\\/[]{}—=+*^?#@$_%&";

interface TextScrambleProps {
  text: string;
  className?: string;
  /** Start scrambling shortly after mount. */
  delay?: number;
  duration?: number;
  as?: React.ElementType;
}

/** Scramble-then-settle text effect (motion-primitives style, UI §2.6). */
export function TextScramble({
  text,
  className,
  delay = 0.4,
  duration = 0.9,
  as: Tag = "span",
}: TextScrambleProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const [display, setDisplay] = React.useState(() => (reducedMotion ? text : ""));

  React.useEffect(() => {
    if (reducedMotion) {
      return;
    }
    let frame = 0;
    let raf = 0;
    const start = performance.now() + delay * 1000;

    const tick = (now: number) => {
      if (now < start) {
        raf = requestAnimationFrame(tick);
        return;
      }
      frame += 1;
      const progress = (now - start) / (duration * 1000);
      const reveal = Math.min(text.length, Math.floor(progress * text.length));

      let out = "";
      for (let i = 0; i < text.length; i += 1) {
        if (i < reveal || text[i] === " ") {
          out += text[i];
        } else if (frame % 2 === 0) {
          out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        } else {
          out += text[i];
        }
      }
      setDisplay(out);
      if (progress < 1) raf = requestAnimationFrame(tick);
      else setDisplay(text);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, delay, duration, reducedMotion]);

  return (
    <Tag className={cn("tabular-nums", className)} aria-label={text}>
      {display}
    </Tag>
  );
}
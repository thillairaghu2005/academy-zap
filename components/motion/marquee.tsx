"use client";

import * as React from "react";
import {
  m as motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useVelocity,
} from "framer-motion";

type MarqueeProps = {
  children: React.ReactNode;
  className?: string;
  direction?: "left" | "right";
  speed?: number;
};

export function Marquee({
  children,
  className,
  direction = "left",
  speed = 42,
}: MarqueeProps) {
  const measureRef = React.useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const reducedMotion = useReducedMotion() ?? false;
  const [width, setWidth] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    const element = measureRef.current;
    if (!element) return;
    const update = () => setWidth(element.getBoundingClientRect().width);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (direction === "right" && width > 0) x.set(-width);
  }, [direction, width, x]);

  useAnimationFrame((_, delta) => {
    if (reducedMotion || paused || width === 0) return;
    const scrollBoost = Math.min(Math.abs(scrollVelocity.get()) / 1600, 1.5);
    const distance = (speed * (1 + scrollBoost) * delta) / 1000;
    const next = x.get() + (direction === "left" ? -distance : distance);
    if (direction === "left" && next <= -width) x.set(0);
    else if (direction === "right" && next >= 0) x.set(-width);
    else x.set(next);
  });

  return (
    <div
      className={className}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      style={{ overflow: "hidden" }}
    >
      <motion.div className="flex w-max" style={{ x }}>
        <div ref={measureRef} className="flex w-max shrink-0">{children}</div>
        <div aria-hidden="true" className="flex w-max shrink-0">{children}</div>
      </motion.div>
    </div>
  );
}

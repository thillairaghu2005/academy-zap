"use client";

import * as React from "react";
import { MotionConfig } from "framer-motion";

/** Lets Framer Motion honor the user's reduced-motion preference globally. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

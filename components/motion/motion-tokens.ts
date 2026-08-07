export const motionDurations = {
  fast: 0.16,
  base: 0.32,
  slow: 0.64,
  cinematic: 1.1,
} as const;

export const motionEasings = {
  out: [0.22, 1, 0.36, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
  spring: { stiffness: 180, damping: 24, mass: 0.8 },
  softSpring: { stiffness: 110, damping: 22, mass: 1 },
} as const;

export const motionStagger = {
  tight: 0.04,
  base: 0.08,
  relaxed: 0.14,
} as const;

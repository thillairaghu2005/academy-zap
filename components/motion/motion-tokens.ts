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

/* ------------------------------------------------------------------ */
/* Spring house style (SKILL §3–4).                                   */
/*   - `default`  : damping ~1.0 (critically damped) — no overshoot.  */
/*   - `momentum` : damping ~0.8, a little bounce — ONLY for gestures  */
/*                  that carried real momentum (a flick, a throw).     */
/* Framer Motion's `bounce`/`duration` API maps to Apple's damping +   */
/* response: damping 1.0 ≈ bounce 0, response 0.3–0.4 ≈ duration.     */
/* ------------------------------------------------------------------ */
export const motionSprings = {
  default: { type: "spring", bounce: 0, duration: 0.35 },
  fast: { type: "spring", bounce: 0, duration: 0.25 },
  momentum: { type: "spring", bounce: 0.2, duration: 0.4 },
} as const;

/* ------------------------------------------------------------------ */
/* Momentum projection (SKILL §6).                                     */
/* Exponential-decay form — NOT the physics v²/(2·decel):              */
/*   projected = current + (velocity / 1000) · deceleration / (1 − d)  */
/* d ≈ 0.998 for normal scroll feel, 0.99 for snappier.                */
/* Hand the raw px/s velocity to the spring's `velocity` option.       */
/* ------------------------------------------------------------------ */
export function projectVelocity(
  initialVelocity: number,
  decelerationRate = 0.998,
): number {
  return (
    (initialVelocity / 1000) * (decelerationRate / (1 - decelerationRate))
  );
}

export const motionStagger = {
  tight: 0.04,
  base: 0.08,
  relaxed: 0.14,
} as const;
/**
 * Shared mock-network helpers. Every lib/api function is async/network-shaped
 * (Promise + realistic latency) so it can be wired to TanStack Query today
 * and swapped for a real fetch later with zero component changes.
 */

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Random jitter around a base latency, to feel like real networking. */
export function jitter(baseMs: number, rangeMs = 120): number {
  return baseMs + Math.floor(Math.random() * rangeMs);
}

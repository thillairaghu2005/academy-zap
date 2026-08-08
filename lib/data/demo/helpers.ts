/**
 * Shared local-demo helpers. Async behavior keeps loading and error states
 * realistic when services are consumed through TanStack Query.
 */

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Random jitter around a base latency for realistic UI loading states. */
export function jitter(baseMs: number, rangeMs = 120): number {
  return baseMs + Math.floor(Math.random() * rangeMs);
}

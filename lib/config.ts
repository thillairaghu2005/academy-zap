/**
 * Client-side config constants (build.md §0 mock discipline).
 *
 * CHECKOUT_DEMO_503 — demo toggle for the simulated payment-provider
 * outage. Defaults to FALSE, so checkout behaves exactly as normal with no
 * added latency. Set NEXT_PUBLIC_CHECKOUT_DEMO_503=true at build/dev time to
 * make every create_checkout / buy_now call short-circuit with a simulated
 * 503, surfacing the dedicated maintenance state. This is the frontend
 * stand-in for a feature flag — no flags service exists yet.
 */
export const CHECKOUT_DEMO_503 =
  process.env.NEXT_PUBLIC_CHECKOUT_DEMO_503 === "true";

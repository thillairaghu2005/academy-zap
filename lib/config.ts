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

/**
 * DEMO_MODE — product-audit fix: gate every piece of demo scaffolding that
 * would otherwise leak into the default user journey.
 *
 * When `NEXT_PUBLIC_DEMO_MODE=true`:
 *   - the /rank "Demo state" switcher, the judge verdict-demo markers and
 *     mock hints, the cart/checkout demo-state strips, the "boom"/"zzzz"
 *     search placeholders, and the various "Mock note" footnotes render.
 *   - the auth proxy is lenient and GET /api/auth/session auto-issues
 *     the demo learner session (the guided-demo experience).
 *
 * When false (the default — production-shaped): all of the above are hidden,
 * the middleware enforces real route protection, and anonymous visitors are
 * sent to /login. The mock backend hooks themselves are untouched — they
 * stay deterministic for tests; only their user-facing affordances are
 * gated.
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

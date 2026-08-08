export const CHECKOUT_DEMO_503 =
  process.env.NEXT_PUBLIC_CHECKOUT_DEMO_503 === "true";

const requestedDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const productionLikeRuntime =
  process.env.NODE_ENV === "production" ||
  process.env.VERCEL_ENV === "production" ||
  process.env.APP_ENV === "production" ||
  process.env.APP_ENV === "staging";

if (requestedDemoMode && productionLikeRuntime) {
  throw new Error(
    "NEXT_PUBLIC_DEMO_MODE must not be enabled in a production-like runtime.",
  );
}

/** Demo scaffolding is available only during an explicit local development run. */
export const DEMO_MODE =
  requestedDemoMode && process.env.NODE_ENV === "development";

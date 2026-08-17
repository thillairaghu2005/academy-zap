export const CHECKOUT_DEMO_503 =
  process.env.NEXT_PUBLIC_CHECKOUT_DEMO_503 === "true";

/** Optional demo-state controls are disabled unless explicitly enabled. */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export const AUTH_MODE =
  process.env.NEXT_PUBLIC_AUTH_MODE === "demo" ? "demo" : "backend";

if (
  process.env.NODE_ENV === "production" &&
  AUTH_MODE === "demo" &&
  process.env.NEXT_PUBLIC_ALLOW_DEMO !== "true"
) {
  throw new Error(
    "Production cannot run in demo mode without NEXT_PUBLIC_ALLOW_DEMO=true",
  );
}

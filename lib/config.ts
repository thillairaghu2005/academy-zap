export const CHECKOUT_DEMO_503 =
  process.env.NEXT_PUBLIC_CHECKOUT_DEMO_503 === "true";

/** Optional demo-state controls are disabled unless explicitly enabled. */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

/**
 * Frontend-only demo authentication is the default so the app runs standalone
 * with no backend, no env file, and no API server. Backend auth must be opted
 * into explicitly.
 */
const requestedAuthMode = process.env.NEXT_PUBLIC_AUTH_MODE;

export const AUTH_MODE = requestedAuthMode === "backend" ? "backend" : "demo";

if (
  process.env.NODE_ENV === "production" &&
  requestedAuthMode === "demo" &&
  process.env.NEXT_PUBLIC_ALLOW_DEMO !== "true"
) {
  throw new Error(
    "Production cannot run in demo mode without NEXT_PUBLIC_ALLOW_DEMO=true",
  );
}

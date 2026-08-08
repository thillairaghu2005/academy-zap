export const CHECKOUT_DEMO_503 =
  process.env.NEXT_PUBLIC_CHECKOUT_DEMO_503 === "true";

/** The application is a frontend-only demo in every runtime. */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

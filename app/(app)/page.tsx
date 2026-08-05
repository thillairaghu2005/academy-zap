import { redirect } from "next/navigation";

export const metadata = {
  title: "Courses",
  description: "Zapsters course catalog — the landing experience.",
};

/**
 * Landing page — "/" is the anonymous entry point, so it serves the public
 * course catalog. The catalog lives at /courses (its own route, linked from
 * the nav), so the root just redirects there. The dashboard moved to
 * /dashboard and stays session-gated.
 */
export default function LandingPage() {
  redirect("/courses");
}

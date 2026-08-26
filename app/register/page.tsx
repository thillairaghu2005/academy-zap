import type { Metadata } from "next";

import { RegisterForm } from "@/components/auth/register-form";
import { AuthBackdrop } from "@/components/auth/auth-backdrop";

export const metadata: Metadata = {
  title: "Create account",
  description:
    "Create a free Zapsters account to enroll in courses, solve judge problems, run virtual labs, and track verifiable progress.",
  alternates: { canonical: "/register" },
  robots: { index: false, follow: false },
};

/**
 * /register — mirrors /login: an optional ?next=<path> returns the new
 * learner to their intended surface after signup instead of the generic
 * thank-you step.
 */
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <AuthBackdrop>
      <RegisterForm next={next} />
    </AuthBackdrop>
  );
}

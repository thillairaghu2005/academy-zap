import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";
import { AuthBackdrop } from "@/components/auth/auth-backdrop";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Zapsters.",
};

/**
 * /login — anonymous visitors redirected here by proxy.ts (Next 16's
 * middleware convention) with
 * ?next=<path> so they land back where they were headed after signing in.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <AuthBackdrop>
      <LoginForm next={next} />
    </AuthBackdrop>
  );
}

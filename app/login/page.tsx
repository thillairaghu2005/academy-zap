import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";
import { AuthBackdrop } from "@/components/auth/auth-backdrop";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Zapsters.",
};

export default function LoginPage() {
  return (
    <AuthBackdrop>
      <LoginForm />
    </AuthBackdrop>
  );
}

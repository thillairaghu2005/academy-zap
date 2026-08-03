import type { Metadata } from "next";

import { RegisterForm } from "@/components/auth/register-form";
import { AuthBackdrop } from "@/components/auth/auth-backdrop";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create your Zapsters account.",
};

export default function RegisterPage() {
  return (
    <AuthBackdrop>
      <RegisterForm />
    </AuthBackdrop>
  );
}

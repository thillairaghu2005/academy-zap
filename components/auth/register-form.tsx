"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Eye, EyeOff, GitBranch, Globe2, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Logo } from "@/src/components/Logo/Logo";
import { useSession } from "@/components/providers/session-provider";
import { apiErrorMessage } from "@/lib/api/client";

const registerSchema = z.object({
  display_name: z
    .string()
    .min(2, "Display name must be at least 2 characters.")
    .max(48, "Display name is too long."),
  email: z.email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password is too long."),
});

type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const { register, session, isLoading } = useSession();
  const [pending, setPending] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { display_name: "", email: "", password: "" },
  });

  React.useEffect(() => {
    if (!isLoading && session.status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [isLoading, session.status, router]);

  const onSubmit = async (values: RegisterValues) => {
    setPending(true);
    try {
      await register(values);
      router.push("/dashboard");
    } catch (err) {
      form.setError("email", {
        message: apiErrorMessage(err, "Sign up failed. Please try again later."),
      });
    } finally {
      setPending(false);
    }
  };

  const password = useWatch({ control: form.control, name: "password", defaultValue: "" });
  const checks = [
    { label: "8+ characters", valid: password.length >= 8 },
    { label: "Uppercase letter", valid: /[A-Z]/.test(password) },
    { label: "Number", valid: /\d/.test(password) },
    { label: "Special character", valid: /[^A-Za-z0-9]/.test(password) },
  ];
  const strength = checks.filter((check) => check.valid).length;
  const strengthLabel = strength <= 1 ? "Weak" : strength === 2 ? "Fair" : strength === 3 ? "Good" : "Strong";

  return (
    <Card className="w-full max-w-md border-border bg-card shadow-[0_12px_36px_rgb(23_23_23_/_8%)]">
      <CardHeader className="items-center gap-2 pb-6 pt-8 text-center">
        <Logo size="lg" linkTo={null} />
        <CardTitle as="h1" className="mt-2 text-xl">Join the climb</CardTitle>
          <CardDescription>Start with a guided path, then make your progress visible through practice.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" variant="outline" disabled>
                <Globe2 /> Google sign-in (coming soon)
              </Button>
              <Button type="button" variant="outline" disabled>
                <GitBranch /> GitHub sign-in (coming soon)
              </Button>
            </div>
            <div className="relative py-1 text-center text-[11px] text-muted-foreground before:absolute before:left-0 before:right-0 before:top-1/2 before:border-t before:border-border"><span className="relative bg-card px-3">or use your email</span></div>
            <FormField
              control={form.control}
              name="display_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ada Zap"
                      autoComplete="name"
                      className="h-10"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@zapsters.dev"
                      autoComplete="email"
                      className="h-10"
                      {...field}
                    />
                  </FormControl>
                   <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="At least 8 characters"
                        autoComplete="new-password"
                        className="h-10 pr-10"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                  {field.value ? <div className="mt-3" aria-live="polite"><div className="flex items-center justify-between text-[11px]"><span className="text-muted-foreground">Password strength</span><span className={strength >= 3 ? "font-semibold text-success-strong" : "font-semibold text-warning-strong"}>{strengthLabel}</span></div><div className="mt-1.5 grid grid-cols-4 gap-1" aria-hidden="true">{checks.map((check) => <span key={check.label} className={`h-1 rounded-full ${check.valid ? strength === 4 ? "bg-success" : "bg-warning" : "bg-border"}`} />)}</div><div className="mt-2 flex flex-wrap gap-1.5">{checks.map((check) => <span key={check.label} className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] ${check.valid ? "border-success/20 bg-success/5 text-success-strong" : "border-border text-muted-foreground"}`}><Check className="size-3" />{check.label}</span>)}</div></div> : null}
                </FormItem>
              )}
            />
            <Button type="submit" variant="gradient" className="mt-1 h-10 w-full" disabled={pending}>
              {pending && <LoaderCircle className="animate-spin" />}
              {pending ? "Creating account…" : "Create account"}
            </Button>
          </form>
        </Form>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>

      </CardContent>
    </Card>
  );
}

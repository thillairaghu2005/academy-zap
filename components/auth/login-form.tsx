"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Sparkles } from "lucide-react";

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
import { PasswordInput } from "@/components/ui/password-input";
import { Logo } from "@/src/components/Logo/Logo";
import { useSession } from "@/components/providers/session-provider";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter a valid email address.")
    .email("Enter a valid email address.")
    .max(254, "Email address is too long."),
  password: z
    .string()
    .min(1, "Password is required.")
    .max(128, "Password is too long."),
});

type LoginValues = z.infer<typeof loginSchema>;

/**
 * Accept only a normalized same-origin path. Reject URL parser edge cases
 * such as protocol-relative, backslash, encoded-slash, and control values.
 */
export function safeNext(next: string | undefined): string {
  if (
    !next ||
    next.length > 2048 ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(next)
  ) {
    return "/dashboard";
  }

  try {
    const base = "https://zapsters.invalid";
    const target = new URL(next, base);
    const decodedPath = decodeURIComponent(target.pathname);
    if (
      target.origin !== base ||
      decodedPath.startsWith("//") ||
      decodedPath.includes("\\") ||
      /[\u0000-\u001f\u007f]/.test(decodedPath)
    ) {
      return "/dashboard";
    }
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return "/dashboard";
  }
}

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const { login, session, isLoading } = useSession();
  const [pending, setPending] = React.useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Already signed in? Straight back to where they were headed.
  React.useEffect(() => {
    if (!isLoading && session.status === "authenticated") {
      router.replace(safeNext(next));
    }
  }, [isLoading, session.status, router, next]);

  const onSubmit = async (values: LoginValues) => {
    setPending(true);
    try {
      await login(values);
      router.replace(safeNext(next));
    } catch (err) {
      form.setError("password", {
        message:
          err instanceof Error ? err.message : "Sign in failed. Please try again later.",
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-border bg-card shadow-[0_12px_36px_rgb(23_23_23_/_8%)]">
      <CardHeader className="items-center gap-2 pb-6 pt-8 text-center">
        <Logo size="lg" linkTo={null} />
         <CardTitle as="h1" className="mt-2 text-xl">Welcome back</CardTitle>
        <CardDescription>
          Sign in to continue climbing the ladder.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
                      onChange={(event) => {
                        field.onChange(event);
                        form.clearErrors();
                      }}
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
                    <PasswordInput
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="h-10"
                      {...field}
                      onChange={(event) => {
                        field.onChange(event);
                        form.clearErrors();
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="rounded-lg border border-border bg-surface-2 p-3.5">
              <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-warning-strong" />
                <span>
                  <span className="font-medium text-foreground">Secure session</span>
                  <br />
                   Your demo session is stored securely in this browser.
                </span>
              </p>
            </div>
            <Button type="submit" variant="gradient" className="mt-1 h-10 w-full" disabled={pending}>
              {pending && <LoaderCircle className="animate-spin" />}
              {pending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </Form>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          New here?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </p>

      </CardContent>
    </Card>
  );
}

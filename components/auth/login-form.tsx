"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LoaderCircle, Sparkles } from "lucide-react";

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
import { Logo } from "@/components/layout/logo";
import { useSession } from "@/components/providers/session-provider";

const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const { login, session, isLoading } = useSession();
  const [pending, setPending] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // Already signed in? Straight back to the dashboard.
  React.useEffect(() => {
    if (!isLoading && session.status === "authenticated") {
      router.replace("/");
    }
  }, [isLoading, session.status, router]);

  const onSubmit = async (values: LoginValues) => {
    setPending(true);
    try {
      await login(values);
      router.push("/");
    } catch (err) {
      form.setError("password", {
        message: err instanceof Error ? err.message : "Sign in failed.",
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-border/80 bg-card/80 backdrop-blur-xl">
      <CardHeader className="items-center gap-2 pb-6 pt-8 text-center">
        <Logo />
        <CardTitle className="mt-2 text-xl">Welcome back</CardTitle>
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
                        placeholder="••••••••"
                        autoComplete="current-password"
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
                </FormItem>
              )}
            />
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

        <div className="mt-6 rounded-lg border border-border bg-secondary/50 p-3.5">
          <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <Sparkles className="mt-0.5 size-3.5 shrink-0 text-warning" />
            <span>
              <span className="font-medium text-foreground">Mock auth.</span> Any email
              + password of 8+ characters signs you in. Email ending in
              <code className="mx-1 rounded bg-secondary px-1 font-mono">@error.zapsters.dev</code>
              demos the error state.
            </span>
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => form.setValue("email", "aarav@zapsters.dev")}
            >
              Learner demo
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => form.setValue("email", "priya@admin.zapsters.dev")}
            >
              Admin demo
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => form.setValue("email", "error@zapsters.dev")}
            >
              Error demo
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

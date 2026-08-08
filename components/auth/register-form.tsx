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
import { Logo } from "@/src/components/Logo/Logo";
import { useSession } from "@/components/providers/session-provider";
import { authErrorMessage } from "@/lib/api/auth";
import { DEMO_MODE } from "@/lib/config";

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
      router.replace("/");
    }
  }, [isLoading, session.status, router]);

  const onSubmit = async (values: RegisterValues) => {
    setPending(true);
    try {
      await register(values);
      router.push("/");
    } catch (err) {
      form.setError("email", {
        message: authErrorMessage(err, "Sign up failed. Please try again later."),
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-border/80 bg-card/80 backdrop-blur-xl">
      <CardHeader className="items-center gap-2 pb-6 pt-8 text-center">
        <Logo size="lg" linkTo={null} />
        <CardTitle as="h1" className="mt-2 text-xl">Join the climb</CardTitle>
        <CardDescription>
          One account across courses, judge, labs and ranks.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
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

        {DEMO_MODE && (
          <div className="mt-6 rounded-lg border border-border bg-secondary/50 p-3.5">
            <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <Sparkles className="mt-0.5 size-3.5 shrink-0 text-warning-strong" />
              <span>
                <span className="font-medium text-foreground">Demo mode.</span> Any
                password of 8+ characters works. Email{" "}
                <code className="rounded bg-secondary px-1 font-mono">taken@zapsters.dev</code>{" "}
                demos the duplicate-account error.
              </span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

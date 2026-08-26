"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/shared/page-container";
import { Sparkles } from "lucide-react";

import { trackEvent } from "@/lib/analytics";

/**
 * Post-signup confirmation. Registration routes here (unless a `next`
 * destination was set) so the conversion moment is explicit and measurable.
 */
export function ThankYouClient() {
  React.useEffect(() => {
    trackEvent("signup_confirmed");
  }, []);

  return (
    <PageContainer className="flex items-center justify-center min-h-[70vh]" as="main" id="main-content">
      <div className="text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-6">
          <Sparkles className="size-8" />
        </div>
        <h1 className="font-display text-4xl font-bold">You&apos;re all set!</h1>
        <p className="mt-4 text-muted-foreground max-w-sm mx-auto">
          Your Zapsters account is ready. A good first move: pick a course and finish lesson one today.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/dashboard">Go to your dashboard</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/courses">Browse courses</Link>
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}

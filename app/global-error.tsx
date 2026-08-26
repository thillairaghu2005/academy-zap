"use client";

import * as React from "react";

// global-error replaces the root layout when it renders, so it must pull in
// the design tokens itself and define its own <html>/<body>.
import "./globals.css";
import { ErrorState } from "@/components/shared/error-state";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-background">
        <React.Fragment>
          <title>Something went wrong · Zapsters</title>
        </React.Fragment>
        <main className="mx-auto flex min-h-dvh w-full max-w-xl items-center px-5">
          <ErrorState
            title="Zapsters hit an unexpected error"
            message="The application failed to load. Retrying reloads the current page; if the problem persists, come back in a few minutes."
            onRetry={unstable_retry}
          />
        </main>
      </body>
    </html>
  );
}

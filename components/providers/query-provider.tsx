"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * App-wide TanStack Query provider (locked stack, build.md §1).
 * Defaults keep the mock layer snappy and polling-friendly for the
 * SSE-shaped flows that arrive in F2–F5.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 3 * 60_000, // Fresh for 3 minutes to eliminate skeleton flashing across tabs
            gcTime: 15 * 60_000, // Retain in memory for 15 minutes
            retry: (failureCount, error) => {
              if (failureCount >= 1) return false;
              if (
                error &&
                typeof error === "object" &&
                "status" in error &&
                [401, 403, 404].includes((error as { status: number }).status)
              ) {
                return false;
              }
              return true;
            },
            refetchOnWindowFocus: false,
            refetchOnReconnect: "always",
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

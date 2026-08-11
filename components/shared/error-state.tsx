"use client";

import * as React from "react";
import { RotateCw, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  /** Error code shown as a mono chip (e.g. MockDataError.code) */
  code?: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * Global error-state primitive (build.md F0). Mirrors the error envelope of
 * local demo data service; every surface renders its
 * error state through this.
 */
export function ErrorState({
  title = "Something went wrong",
  message,
  code,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "flex animate-fade-up flex-col items-center justify-center rounded-xl border border-destructive/25 bg-[#fff7f7] px-6 py-14 text-center",
        className,
      )}
    >
      <div className="mb-4 grid size-12 place-items-center rounded-full border border-destructive/25 bg-destructive/10 text-destructive">
        <TriangleAlert className="size-5" />
      </div>
      <h3 className="font-display text-h3">
        {title}
      </h3>
      {message ? (
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
          {message}
        </p>
      ) : null}
      {code ? (
        <code className="mt-3 rounded-md bg-secondary px-2 py-1 font-mono text-caption text-muted-foreground">
          {code}
        </code>
      ) : null}
      {onRetry ? (
        <Button
          variant="outline"
          size="sm"
          className="mt-5"
          onClick={onRetry}
        >
          <RotateCw />
          Retry
        </Button>
      ) : null}
    </div>
  );
}

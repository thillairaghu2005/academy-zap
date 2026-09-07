"use client";

import * as React from "react";
import Link from "next/link";
import { LogIn, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AuthPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * The path to return to after the user signs in or registers.
   * Defaults to the current page if omitted.
   */
  next?: string;
  /**
   * Optional context line shown below the title explaining why auth is needed.
   * E.g. "Create a free account to enroll in this course and track your progress."
   */
  message?: string;
}

/**
 * In-context sign-in prompt shown when a guest triggers a protected action.
 * Uses the existing `Dialog` component and `?next=<path>` return-to mechanism —
 * no new design tokens or component variants.
 */
export function AuthPromptDialog({
  open,
  onOpenChange,
  next,
  message = "Create a free account to access this and track your progress.",
}: AuthPromptDialogProps) {
  const nextParam = next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm text-center" showCloseButton>
        <DialogHeader className="items-center">
          <DialogTitle>Sign in to continue</DialogTitle>
          <DialogDescription className="mt-1">{message}</DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex flex-col gap-3">
          <Button variant="gradient" asChild className="w-full">
            <Link href={`/register${nextParam}`}>
              <UserPlus className="size-4" />
              Create a free account
            </Link>
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link href={`/login${nextParam}`}>
              <LogIn className="size-4" />
              Sign in
            </Link>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          No credit card required.
        </p>
      </DialogContent>
    </Dialog>
  );
}

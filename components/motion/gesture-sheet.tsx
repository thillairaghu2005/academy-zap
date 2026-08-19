"use client";

import * as React from "react";
import { m as motion } from "framer-motion";

import { useGestureSheet } from "@/components/motion/use-gesture-sheet";
import { cn } from "@/lib/utils";

interface GestureSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Rendered inside the drag handle (below the grabber). */
  header?: React.ReactNode;
  labelledBy?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Bottom sheet with drag-to-dismiss (SKILL §2–§6, §9–§10).
 * The grabber + `header` form the drag handle; content scrolls beneath.
 */
export function GestureSheet({
  open,
  onOpenChange,
  header,
  labelledBy,
  className,
  children,
}: GestureSheetProps) {
  const sheet = useGestureSheet({
    open,
    onDismiss: () => onOpenChange(false),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-foreground/30 backdrop-blur-[2px]"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <motion.div
        // eslint-disable-next-line react-hooks/refs
        ref={sheet.ref}
        // eslint-disable-next-line react-hooks/refs
        style={{ y: sheet.y }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cn(
          "frosted-heavy absolute inset-x-0 bottom-0 flex max-h-[min(85dvh,48rem)] flex-col overflow-hidden rounded-t-2xl border border-border/70 shadow-[0_-12px_40px_rgb(23_23_23_/_14%)]",
          className,
        )}
      >
        <div
          // eslint-disable-next-line react-hooks/refs
          ref={sheet.handleRef}
          // eslint-disable-next-line react-hooks/refs
          {...sheet.handleProps}
          className="flex shrink-0 touch-none flex-col"
        >
          <span
            aria-hidden="true"
            className="mx-auto mt-2.5 h-1.5 w-9 shrink-0 rounded-full bg-foreground/15"
          />
          {header}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </motion.div>
    </div>
  );
}
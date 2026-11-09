import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const customTwMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        "text-caption",
        "text-small",
        "text-body",
        "text-h1",
        "text-h2",
        "text-h3",
        "text-display",
      ],
      "text-color": [
        "text-primary",
        "text-primary-foreground",
        "text-secondary-foreground",
        "text-muted-foreground",
        "text-foreground",
        "text-destructive",
        "text-destructive-foreground",
        "text-surface-1",
        "text-surface-2",
        "text-surface-3",
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return customTwMerge(clsx(inputs));
}

/** Uppercase initials from a display name, e.g. "Ada Zap" → "AZ". */
export function getInitials(name: string): string {
  return (
    name
      .split(" ")
      .map((part) => part[0] ?? "")
      .slice(0, 2)
      .join("")
      .toUpperCase() || "Z"
  );
}

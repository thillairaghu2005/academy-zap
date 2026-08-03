import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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

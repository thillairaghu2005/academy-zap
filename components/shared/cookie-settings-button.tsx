"use client";

import { RotateCcw } from "lucide-react";

import { CONSENT_RESET_EVENT } from "@/lib/analytics";

/** Re-opens the cookie consent banner so visitors can change their choice. */
export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(CONSENT_RESET_EVENT))}
      className={className}
    >
      <RotateCcw className="size-3" aria-hidden="true" />
      Cookie settings
    </button>
  );
}

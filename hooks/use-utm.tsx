"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;

export function useUtmTracker() {
  const searchParams = useSearchParams();

  React.useEffect(() => {
    if (!searchParams) return;

    let hasUtm = false;
    const utmData: Record<string, string> = {};

    UTM_KEYS.forEach((key) => {
      const value = searchParams.get(key);
      if (value) {
        hasUtm = true;
        utmData[key] = value;
      }
    });

    if (hasUtm) {
      try {
        sessionStorage.setItem("zapsters-utm", JSON.stringify(utmData));
      } catch {
        // Ignore quota or privacy mode errors
      }
    }
  }, [searchParams]);
}

export function UtmTracker() {
  useUtmTracker();
  return null;
}

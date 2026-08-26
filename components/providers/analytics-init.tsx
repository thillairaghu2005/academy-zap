"use client";

import * as React from "react";

import { initAnalytics } from "@/lib/analytics";

/** Deferred, consent-gated analytics bootstrap. Renders nothing. */
export function AnalyticsInit() {
  React.useEffect(() => {
    initAnalytics();
  }, []);
  return null;
}

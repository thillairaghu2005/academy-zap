"use client";

import * as React from "react";

/** Registers the production PWA shell without affecting local development. */
export function ServiceWorkerProvider() {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker.register("/sw.js", { scope: "/" });
  }, []);

  return null;
}

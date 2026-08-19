"use client";

import * as React from "react";

const THEME_FLIP_MS = 400;

/**
 * Eases the theme flip (SKILL §14): instead of an abrupt brightness jump,
 * the shell adds `.theme-flip` for ~400ms whenever `html[data-theme]`
 * changes so colors cross-fade via the CSS transition in globals.css.
 *
 * Light is the only product theme today; the mechanism is dark-mode ready —
 * swap `data-theme` anywhere (storage / system preference) and the flip
 * just works.
 */
export function ThemeManager() {
  React.useEffect(() => {
    const root = document.documentElement;
    if (!root.dataset.theme) root.dataset.theme = "light";

    let timer: number | undefined;
    const observer = new MutationObserver(() => {
      root.classList.add("theme-flip");
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => root.classList.remove("theme-flip"), THEME_FLIP_MS);
    });
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      observer.disconnect();
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  return null;
}
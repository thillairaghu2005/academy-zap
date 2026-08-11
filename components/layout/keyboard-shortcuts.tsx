"use client";

import * as React from "react";
import { Keyboard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const SHORTCUTS = [
  ["Ctrl / Cmd + K", "Open global search"],
  ["?", "Open keyboard shortcuts"],
  ["Esc", "Close dialogs and menus"],
  ["Arrow keys", "Move through command results"],
] as const;

export function KeyboardShortcuts() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      if (event.key === "?") {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => setOpen(true)} aria-label="View keyboard shortcuts">
        <Keyboard />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Keyboard shortcuts</DialogTitle>
            <DialogDescription>Move around Zapsters without leaving your keyboard.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {SHORTCUTS.map(([shortcut, description]) => (
              <div key={shortcut} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface-1 px-3 py-3 text-sm">
                <span className="text-muted-foreground">{description}</span>
                <kbd className="shrink-0 rounded-md border border-border bg-card px-2 py-1 font-mono text-xs text-foreground">{shortcut}</kbd>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

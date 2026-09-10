"use client";

import * as React from "react";
import { Command } from "cmdk";
import { Check, Command as CommandIcon, Keyboard } from "lucide-react";

import styles from "../ide.module.css";

// COMMAND_ICONS lives in ./command-icons.ts so this file is a pure component
// module for Vite/react-refresh Fast Refresh. Import it from there.
// CommandPaletteAction is a type-only export — types never affect Fast Refresh.

export interface CommandPaletteAction {
  id: string;
  label: string;
  shortcut?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  onSelect: () => void;
}

export function CommandPalette({ open, onOpenChange, actions }: { open: boolean; onOpenChange: (open: boolean) => void; actions: CommandPaletteAction[] }) {
  return (
    <Command.Dialog open={open} onOpenChange={onOpenChange} label="IDE command palette" className={styles.commandPalette}>
      <div className={styles.commandPaletteHeader}><CommandIcon size={15} /><Command.Input placeholder="Search IDE actions..." autoFocus /><kbd>Esc</kbd></div>
      <Command.List>
        <Command.Empty>No matching action.</Command.Empty>
        <Command.Group heading="Workspace">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Command.Item key={action.id} value={`${action.label} ${action.shortcut ?? ""}`} onSelect={() => { action.onSelect(); onOpenChange(false); }}>
                <Icon size={15} aria-hidden="true" />
                <span>{action.label}</span>
                {action.shortcut ? <kbd>{action.shortcut}</kbd> : null}
              </Command.Item>
            );
          })}
        </Command.Group>
        <Command.Group heading="Keyboard map">
          <Command.Item value="keyboard map run submit save palette monaco">
            <Keyboard size={15} aria-hidden="true" />
            <span>⌘Enter run · ⌘⇧Enter submit · ⌘S save · F1 Monaco palette</span>
            <Check size={13} aria-hidden="true" />
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}

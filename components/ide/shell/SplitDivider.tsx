"use client";

import * as React from "react";
import { GripVertical } from "lucide-react";

import styles from "../ide.module.css";

interface SplitDividerProps {
  value: number;
  onChange: (value: number) => void;
  onDragEnd: () => void;
  onDraggingChange: (dragging: boolean) => void;
}

function clamp(value: number, width: number): number {
  const min = Math.max(34, (320 / width) * 100);
  const max = Math.min(55, 100 - (600 / width) * 100);
  return Math.min(max, Math.max(min, value));
}

export function SplitDivider({ value, onChange, onDragEnd, onDraggingChange }: SplitDividerProps) {
  const dividerRef = React.useRef<HTMLButtonElement>(null);

  const changeByKeyboard = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const width = dividerRef.current?.parentElement?.getBoundingClientRect().width ?? window.innerWidth;
    onChange(clamp(value + direction * (event.shiftKey ? 10 : 2), width));
    onDragEnd();
  };

  const startDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    dividerRef.current?.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startValue = value;
    const layout = dividerRef.current?.parentElement;
    const width = layout?.getBoundingClientRect().width ?? window.innerWidth;
    onDraggingChange(true);

    const move = (nextEvent: PointerEvent) => {
      onChange(clamp(startValue + ((nextEvent.clientX - startX) / width) * 100, width));
    };
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      onDraggingChange(false);
      onDragEnd();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end, { once: true });
  };

  return (
    <button
      ref={dividerRef}
      type="button"
      className={styles.splitDivider}
      onPointerDown={startDrag}
      onDoubleClick={() => { const width = dividerRef.current?.parentElement?.getBoundingClientRect().width ?? window.innerWidth; onChange(clamp(42, width)); onDragEnd(); }}
      onKeyDown={changeByKeyboard}
      role="separator"
      aria-orientation="vertical"
      aria-valuemin={34}
      aria-valuemax={55}
      aria-valuenow={Math.round(value)}
      aria-label="Resize statement and code panes"
      title="Drag to resize. Double-click to reset."
    >
      <GripVertical size={13} aria-hidden="true" />
    </button>
  );
}

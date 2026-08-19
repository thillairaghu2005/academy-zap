"use client";

import * as React from "react";

type SpotlightStyle = React.CSSProperties & {
  "--spotlight-x": string;
  "--spotlight-y": string;
};

type SpotlightProps = {
  children: React.ReactNode;
  className?: string;
};

export function Spotlight({ children, className }: SpotlightProps) {
  const [position, setPosition] = React.useState({ x: "50%", y: "50%" });

  function handleMove(event: React.PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    setPosition({
      x: `${((event.clientX - bounds.left) / bounds.width) * 100}%`,
      y: `${((event.clientY - bounds.top) / bounds.height) * 100}%`,
    });
  }

  const style: SpotlightStyle = {
    "--spotlight-x": position.x,
    "--spotlight-y": position.y,
  };

  return (
    <div className={`group relative ${className ?? ""}`} onPointerMove={handleMove} style={style}>
      {children}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: "radial-gradient(360px circle at var(--spotlight-x) var(--spotlight-y), color-mix(in oklab, var(--color-primary-glow) 18%, transparent), transparent 68%)" }}
      />
    </div>
  );
}

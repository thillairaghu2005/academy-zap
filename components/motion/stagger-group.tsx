"use client";

import * as React from "react";

import { Reveal } from "./reveal";
import { motionStagger } from "./motion-tokens";

type StaggerGroupProps = {
  children: React.ReactNode;
  className?: string;
  childClassName?: string;
  step?: number;
};

export function StaggerGroup({
  children,
  className,
  childClassName,
  step = motionStagger.base,
}: StaggerGroupProps) {
  return (
    <div className={className}>
      {React.Children.toArray(children).map((child, index) => {
        const childKey = React.isValidElement(child) ? child.key : String(child);
        return (
          <Reveal key={childKey} className={childClassName} delay={index * step}>
            {child}
          </Reveal>
        );
      })}
    </div>
  );
}

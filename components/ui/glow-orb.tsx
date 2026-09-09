import * as React from "react";

type GlowOrbProps = React.ComponentProps<"div"> & {
  size?: number | string;
};

export function GlowOrb({ className: _className, size: _size = 360, style: _style, ...props }: GlowOrbProps) {
  void props;
  return null;
}

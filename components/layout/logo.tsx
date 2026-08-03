import Link from "next/link";
import { Zap } from "lucide-react";

import { cn } from "@/lib/utils";

interface LogoProps {
  href?: string;
  className?: string;
  /** Hide the wordmark (icon-only logo) */
  iconOnly?: boolean;
}

export function Logo({ href = "/", className, iconOnly = false }: LogoProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex shrink-0 items-center gap-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md",
        className,
      )}
      aria-label="Zapsters home"
    >
      <span className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 shadow-lg shadow-violet-500/30 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-105">
        <Zap className="size-5 fill-white text-white" strokeWidth={0} />
        <span className="absolute inset-0 bg-white/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </span>
      {!iconOnly && (
        <span className="font-display text-lg font-bold tracking-tight text-foreground">
          Zap
          <span className="bg-gradient-to-r from-violet-400 to-cyan-300 bg-clip-text text-transparent">
            sters
          </span>
        </span>
      )}
    </Link>
  );
}

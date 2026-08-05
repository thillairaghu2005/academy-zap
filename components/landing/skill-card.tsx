import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export interface SkillCardProps {
  name: string;
  description: string;
  icon: LucideIcon;
  tone: string;
  href: string;
}

/** Skill link card uses only subjects present in the seeded learning catalog. */
export function SkillCard({ name, description, icon: Icon, tone, href }: SkillCardProps) {
  return (
    <Link
      href={href}
      className="group flex min-h-36 items-start gap-4 rounded-2xl border border-border bg-card p-5 outline-none transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none motion-reduce:transition-none"
    >
      <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl text-primary-foreground", tone)}>
        <Icon className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2 font-display font-semibold">
          {name}
          <ArrowRight className="size-3.5 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1" />
        </span>
        <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">{description}</span>
      </span>
    </Link>
  );
}

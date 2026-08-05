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

/** Compact topic row for real course and lab subjects. */
export function SkillCard({ name, description, icon: Icon, tone, href }: SkillCardProps) {
  return (
    <Link
      href={href}
      className="group grid grid-cols-[auto_1fr_auto] items-start gap-4 border-t border-border py-5 outline-none transition-colors duration-200 hover:border-foreground focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
    >
      <Icon className={cn("mt-0.5 size-5", tone)} />
      <span className="min-w-0">
        <span className="block font-display font-semibold">{name}</span>
        <span className="mt-1.5 block text-sm leading-relaxed text-muted-foreground">{description}</span>
      </span>
      <ArrowRight className="mt-1 size-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1" />
    </Link>
  );
}

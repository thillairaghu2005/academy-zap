"use client";

import * as React from "react";
import {
  Binary,
  Bot,
  BrainCircuit,
  Braces,
  Bug,
  Cloud,
  Code2,
  Container,
  Cpu,
  Eye,
  FileSearch,
  FlaskConical,
  GitBranch,
  Globe,
  HardDrive,
  Layers,
  Lock,
  MonitorSmartphone,
  Network,
  Radar,
  Search,
  Server,
  ShieldCheck,
  Terminal,
  Workflow,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { hueForId } from "@/lib/visual";

/**
 * Generated course cover art.
 *
 * The catalog has no photographic assets — instead every course gets
 * deterministic, category-tinted vector cover art built from the design
 * system's OKLCH palette. The same course always renders the same art on
 * every surface (cards, rails, previews), which reads as intentional
 * "cover design" rather than placeholder decoration.
 */

interface CategoryArt {
  /** Gradient stops — dark base → lighter tint of the same hue family. */
  from: string;
  to: string;
  /** Accent used for glows and decorative strokes. */
  accent: string;
  icon: LucideIcon;
}

const CATEGORY_ART: Record<string, CategoryArt> = {
  Cybersecurity: {
    from: "oklch(0.26 0.055 20)",
    to: "oklch(0.40 0.13 24)",
    accent: "oklch(0.62 0.19 26)",
    icon: ShieldCheck,
  },
  "Web Development": {
    from: "oklch(0.27 0.07 268)",
    to: "oklch(0.41 0.14 273)",
    accent: "oklch(0.64 0.17 280)",
    icon: Code2,
  },
  Programming: {
    from: "oklch(0.25 0.06 156)",
    to: "oklch(0.38 0.11 160)",
    accent: "oklch(0.66 0.15 163)",
    icon: Braces,
  },
  "Cloud & DevOps": {
    from: "oklch(0.28 0.06 233)",
    to: "oklch(0.43 0.11 238)",
    accent: "oklch(0.68 0.13 245)",
    icon: Cloud,
  },
  "AI & ML": {
    from: "oklch(0.27 0.09 292)",
    to: "oklch(0.41 0.16 296)",
    accent: "oklch(0.65 0.21 300)",
    icon: BrainCircuit,
  },
  Networking: {
    from: "oklch(0.27 0.055 202)",
    to: "oklch(0.41 0.10 207)",
    accent: "oklch(0.68 0.13 212)",
    icon: Network,
  },
  Systems: {
    from: "oklch(0.27 0.05 52)",
    to: "oklch(0.41 0.09 58)",
    accent: "oklch(0.70 0.13 66)",
    icon: Cpu,
  },
  "Software Engineering": {
    from: "oklch(0.28 0.07 338)",
    to: "oklch(0.42 0.13 342)",
    accent: "oklch(0.66 0.18 350)",
    icon: GitBranch,
  },
};

/** Course-specific icon overrides on top of the category default. */
const COURSE_ICONS: Record<string, LucideIcon> = {
  "d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a": Terminal,
  "linux-administration": Terminal,
  "bash-scripting-for-engineers": Terminal,
  "docker-and-kubernetes": Container,
  "network-traffic-analysis": Radar,
  "wireshark-packet-mastery": Radar,
  "tcp-ip-deep-dive": Network,
  "network-automation-python": Workflow,
  "digital-forensics-fundamentals": FileSearch,
  "practical-osint-recon": Search,
  "malware-analysis-basics": Bug,
  "soc-analyst-fundamentals": Eye,
  "machine-learning-foundations": BrainCircuit,
  "deep-learning-pytorch": Layers,
  "ai-agents-automation": Bot,
  "generative-ai-engineering": Zap,
  "operating-systems-internals": HardDrive,
  "system-design-interview-prep": Layers,
  "full-stack-nextjs": Globe,
  "modern-javascript": MonitorSmartphone,
  "accessibility-first-frontend": Eye,
  "aws-cloud-foundations": Server,
  "cicd-engineering": Workflow,
  "terraform-infrastructure-as-code": Layers,
  "git-version-control-workflows": GitBranch,
  "go-concurrency-in-practice": Binary,
  "clean-code-software-architecture": FlaskConical,
  "web-performance-engineering": Zap,
  "nodejs-backend-engineering": Server,
  "java-programming-foundations": Braces,
  "advanced-java-oop": Braces,
  "python-programming-masterclass": Terminal,
  "computer-vision": Eye,
  "lock-icon-demo": Lock,
};

export function CourseThumbnail({
  courseId,
  category,
  className,
}: {
  courseId: string;
  category: string;
  className?: string;
}) {
  const art = CATEGORY_ART[category] ?? CATEGORY_ART.Cybersecurity!;
  const Icon = COURSE_ICONS[courseId] ?? art.icon;
  // Subtle deterministic variation within a category so rails don't read as
  // identical tiles, while staying stable across renders.
  const drift = (hueForId(courseId) % 9) - 4;

  return (
    <div
      aria-hidden="true"
      className={cn("relative h-full w-full overflow-hidden", className)}
      style={{
        background: `linear-gradient(128deg, ${art.from} 0%, ${art.to} 100%)`,
        filter: drift === 0 ? undefined : `hue-rotate(${drift}deg)`,
      }}
    >
      {/* Fine engineering grid */}
      <div className="absolute inset-0 bg-grid-dark opacity-[0.35]" />
      {/* Removed soft accent glows */}
      {/* Decorative rings */}
      <div
        className="absolute -bottom-10 -right-6 size-36 rounded-full border opacity-25"
        style={{ borderColor: art.accent }}
      />
      <div
        className="absolute -bottom-4 -right-1 size-20 rounded-full border opacity-20"
        style={{ borderColor: art.accent }}
      />
      {/* Cover mark */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="grid size-[74px] place-items-center rounded-2xl border border-white/15 bg-white/10 shadow-[0_10px_30px_rgb(0_0_0/0.35)] backdrop-blur-[2px]"
          style={{ boxShadow: `inset 0 1px 0 rgb(255 255 255 / 0.18), 0 12px 28px rgb(0 0 0 / 0.35)` }}
        >
          <Icon className="size-9 text-white/90" strokeWidth={1.6} />
        </div>
      </div>
      {/* Bottom sheen for depth */}
      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/25 to-transparent" />
    </div>
  );
}

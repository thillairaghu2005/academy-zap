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

/**
 * Enterprise course thumbnail / category visual.
 *
 * Designed to provide a clean, restrained, monochromatic visual identity
 * inspired by AWS Skill Builder and IBM SkillsBuild course catalogs.
 * Uses subtle neutral surfaces, engineering gridlines, and monochrome iconography
 * instead of colorful rainbow gradients.
 */

const CATEGORY_DEFAULT_ICONS: Record<string, LucideIcon> = {
  Cybersecurity: ShieldCheck,
  "Web Development": Code2,
  Programming: Braces,
  "Cloud & DevOps": Cloud,
  "AI & ML": BrainCircuit,
  Networking: Network,
  Systems: Cpu,
  "Software Engineering": GitBranch,
};

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
  const Icon = COURSE_ICONS[courseId] ?? CATEGORY_DEFAULT_ICONS[category] ?? ShieldCheck;
  const catCode = category ? category.toUpperCase().slice(0, 3) : "ZAP";

  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative h-full w-full overflow-hidden bg-neutral-900 border-b border-border/40 select-none",
        className,
      )}
    >
      {/* Subtle architectural grid pattern */}
      <div className="absolute inset-0 bg-grid-dark opacity-20" />

      {/* Monogram / watermark in background */}
      <div className="absolute right-3 top-2 text-[10px] font-mono tracking-widest text-neutral-600 font-semibold uppercase">
        {catCode}
      </div>

      {/* Center brand mark container */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="grid size-12 place-items-center rounded-xl border border-neutral-800 bg-neutral-950/80 text-neutral-300 shadow-sm transition-transform duration-200 group-hover:scale-105">
          <Icon className="size-6 text-neutral-200" strokeWidth={1.75} />
        </div>
      </div>

      {/* Subtle bottom line indicator */}
      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-neutral-800" />
    </div>
  );
}

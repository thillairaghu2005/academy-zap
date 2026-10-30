"use client";

import * as React from "react";

import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface SkillDomain {
  domain: string;
  level: "Foundational" | "Associate" | "Professional";
  percentage: number;
  subskills: string[];
  recommendation: string;
}

const SKILL_DOMAINS: SkillDomain[] = [
  {
    domain: "Cloud Architecture & Distributed Systems",
    level: "Professional",
    percentage: 94,
    subskills: ["Multi-Region HA", "Microservices Mesh", "Consensus Algorithms", "Terraform"],
    recommendation: "Capstone Complete: Ready for Cloud Principal Review",
  },
  {
    domain: "High-Concurrency Backend Systems",
    level: "Professional",
    percentage: 90,
    subskills: ["FastAPI", "Redis Streams", "PostgreSQL Sharding", "Atomic Idempotency"],
    recommendation: "Advanced: Recommended Next: Advanced Database Partitioning",
  },
  {
    domain: "Cyber Defense & Threat Intelligence",
    level: "Professional",
    percentage: 88,
    subskills: ["Zero-Trust Security", "Ed25519 Cryptography", "Sandboxed Isolation", "Audit Log"],
    recommendation: "High Proficiency: Conduct Red-Team Sandbox Challenge 4",
  },
  {
    domain: "Generative AI & LLM Systems",
    level: "Associate",
    percentage: 82,
    subskills: ["RAG Architecture", "Vector Indices", "Agent Workflows", "Prompt Tuning"],
    recommendation: "Intermediate: Advance to Fine-Tuning Distributed Clusters",
  },
  {
    domain: "Cloud-Native DevOps & SRE",
    level: "Associate",
    percentage: 76,
    subskills: ["Kubernetes", "Prometheus & Grafana", "GitOps", "Chaos Engineering"],
    recommendation: "Intermediate: Complete Chaos Mesh Simulation Lab",
  },
];

export function ProfileSkillsMatrix() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border/70 bg-card/60 p-5">
        <div className="space-y-1">
          <h3 className="font-display text-base font-bold text-foreground">
            Enterprise Skill Competency Matrix
          </h3>
          <p className="text-xs text-muted-foreground">
            Synthesized in real-time from verified course completions, hands-on lab achievements, and deterministic assessment checkpoints.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {SKILL_DOMAINS.map((domain) => (
          <Card
            key={domain.domain}
            className="border border-border/70 bg-card/80 p-5 space-y-3 transition-all hover:border-primary/40"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-display font-bold text-sm text-foreground">
                  {domain.domain}
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Target: {domain.recommendation}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Badge
                  variant="outline"
                  className="border-primary/30 text-primary bg-primary/5 font-mono text-[10px] uppercase"
                >
                  {domain.level}
                </Badge>
                <span className="font-mono text-xs font-bold text-primary">
                  {domain.percentage}%
                </span>
              </div>
            </div>

            <Progress
              value={domain.percentage}
              className="h-2 bg-surface-1"
              indicatorClassName="bg-primary"
            />

            <div className="flex flex-wrap gap-1.5 pt-1">
              {domain.subskills.map((sub) => (
                <span
                  key={sub}
                  className="rounded bg-surface-1 px-2 py-0.5 text-[10px] font-mono text-muted-foreground border border-border/40"
                >
                  {sub}
                </span>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

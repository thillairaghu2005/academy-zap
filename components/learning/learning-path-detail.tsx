"use client";

import * as React from "react";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  FlaskConical,
  GraduationCap,
  Layers,
  Lock,
  Sparkles,
  Star,
} from "lucide-react";
import Link from "next/link";

import { PageContainer } from "@/components/shared/page-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface MilestoneItem {
  id: string;
  title: string;
  description: string;
  duration: string;
  type: "course" | "lab" | "assessment" | "challenge";
  status: "completed" | "in-progress" | "locked";
  xp: number;
  url: string;
}

interface MilestoneStage {
  stageNumber: number;
  title: string;
  subtitle: string;
  items: MilestoneItem[];
}

const STAGES: MilestoneStage[] = [
  {
    stageNumber: 1,
    title: "Core Fundamentals & Architectural Baseline",
    subtitle: "Establish baseline proficiency in distributed architectures and pass the initial diagnostic check.",
    items: [
      {
        id: "m-1",
        title: "Distributed Systems Core Foundations",
        description: "Consistency models, CAP theorem, partition tolerance, and consensus algorithms.",
        duration: "4h 15m",
        type: "course",
        status: "completed",
        xp: 1200,
        url: "/courses/backend-systems-core",
      },
      {
        id: "m-2",
        title: "Baseline Systems Architecture Diagnostic Check",
        description: "Adaptive 30-question diagnostic assessment to benchmark foundational gaps.",
        duration: "45m",
        type: "assessment",
        status: "completed",
        xp: 800,
        url: "/assessments/asm-sys-diag",
      },
    ],
  },
  {
    stageNumber: 2,
    title: "Enterprise Cloud Implementation & High-Availability",
    subtitle: "Deep-dive into microservices, asynchronous message queues, and distributed databases.",
    items: [
      {
        id: "m-3",
        title: "High-Throughput Microservices & Event-Driven Pipelines",
        description: "FastAPI, asynchronous event streaming with Redis Streams, and worker idempotency.",
        duration: "6h 30m",
        type: "course",
        status: "completed",
        xp: 2000,
        url: "/courses/event-driven-architecture",
      },
      {
        id: "m-4",
        title: "Distributed PostgreSQL Design & Multi-Tenant Sharding",
        description: "Connection pooling, read-replica routing, zero-downtime migrations, and partition keys.",
        duration: "5h 45m",
        type: "course",
        status: "in-progress",
        xp: 1800,
        url: "/courses/distributed-databases-pg",
      },
    ],
  },
  {
    stageNumber: 3,
    title: "Hands-on Cloud Sandboxes & Failure Injection",
    subtitle: "Provision isolated environments and resolve real-world latency, failover, and data synchronization failures.",
    items: [
      {
        id: "m-5",
        title: "Redis Distributed Caching & Rate-Limiter Sandbox",
        description: "Configure distributed token-bucket rate limiters with atomic Lua scripts in Docker.",
        duration: "2h 30m",
        type: "lab",
        status: "locked",
        xp: 1500,
        url: "/labs/lab-redis-ratelimit",
      },
      {
        id: "m-6",
        title: "Multi-Region Cloud Failover & Disaster Recovery Lab",
        description: "Simulate datacenter severance, test automated DNS failover, and verify RPO/RTO metrics.",
        duration: "3h 15m",
        type: "lab",
        status: "locked",
        xp: 1800,
        url: "/labs/lab-cloud-failover",
      },
    ],
  },
  {
    stageNumber: 4,
    title: "Capstone Challenge & Official Credential Exam",
    subtitle: "Deliver the verified system design capstone and pass the timed certification practice exam.",
    items: [
      {
        id: "m-7",
        title: "Enterprise Architecture Capstone Design Review",
        description: "Submit a complete architecture RFC addressing a 100k req/s high-concurrency commerce workload.",
        duration: "4h 00m",
        type: "challenge",
        status: "locked",
        xp: 2500,
        url: "/challenges/chal-arch-capstone",
      },
      {
        id: "m-8",
        title: "Official Cloud Solutions Architect Certification Exam",
        description: "65-question timed simulation exam (75% passing score required to unlock Credly badge).",
        duration: "2h 30m",
        type: "assessment",
        status: "locked",
        xp: 3000,
        url: "/assessments/asm-cloud-architect-pro",
      },
    ],
  },
];

export function LearningPathDetail({ id: _id }: { id: string }) {
  const totalMilestones = STAGES.flatMap((s) => s.items);
  const completedCount = totalMilestones.filter((m) => m.status === "completed").length;
  const progressPct = Math.round((completedCount / totalMilestones.length) * 100);

  return (
    <PageContainer className="pt-6 sm:pt-8 pb-16">
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href="/learning-paths"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to Role Pathways
        </Link>
      </div>

      {/* Hero Overview */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-card p-6 sm:p-8 mb-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8">
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="size-3.5" />
                Accredited by Zapsters Engineering Council
              </span>
              <Badge variant="outline" className="border-border bg-secondary text-foreground text-[11px] font-mono">
                Professional Level
              </Badge>
            </div>

            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-4xl text-foreground">
              Enterprise Cloud Solutions Architecture Pathway
            </h1>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Master distributed systems architecture, high-availability multi-region patterns, data replication, and zero-trust security. Culminates in a verifiable Credly digital badge accredited under the Zapsters Enterprise Verified Standard.
            </p>

            {/* Pathway Metadata Bar */}
            <div className="flex flex-wrap items-center gap-6 pt-3 border-t border-border/40 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Clock className="size-4 text-primary" />
                <span>38 Hours Total</span>
              </div>
              <div className="flex items-center gap-1.5">
                <BookOpen className="size-4 text-primary" />
                <span>5 Courses</span>
              </div>
              <div className="flex items-center gap-1.5">
                <FlaskConical className="size-4 text-primary" />
                <span>3 Hands-on Labs</span>
              </div>
              <div className="flex items-center gap-1.5">
                <GraduationCap className="size-4 text-primary" />
                <span>2 Assessments</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Award className="size-4 text-primary" />
                <span>3.8 CEU Credits</span>
              </div>
            </div>
          </div>

          {/* Right: Progress Card & Digital Badge Unlocker */}
          <Card className="w-full lg:w-80 shrink-0 border-primary/25 bg-primary/5 shadow-md">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-foreground">
                  Pathway Progress
                </CardTitle>
                <span className="text-xs font-mono font-bold text-primary">{progressPct}%</span>
              </div>
              <Progress value={progressPct} className="h-2 bg-primary/20" indicatorClassName="bg-primary" />
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-4">
              <div className="rounded-xl border border-primary/20 bg-card/80 p-3 flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Award className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-foreground truncate">
                    Cloud Architect Pro
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Verifiable Credly Badge
                  </p>
                </div>
              </div>

              <Button className="w-full text-xs font-semibold h-10 shadow-none bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                <Link href="/courses/distributed-databases-pg">Resume Active Module</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs: Visual Roadmap vs Ramp-Up Guide */}
      <Tabs defaultValue="roadmap" className="space-y-8">
        <TabsList className="bg-surface-1 border border-border/50 p-1">
          <TabsTrigger value="roadmap" className="text-xs font-semibold gap-1.5">
            <Layers className="size-3.5" />
            Milestone Journey Roadmap
          </TabsTrigger>
          <TabsTrigger value="rampup" className="text-xs font-semibold gap-1.5">
            <FileText className="size-3.5" />
            Ramp-Up Guide &amp; Syllabus
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: 4-Stage Milestone Journey */}
        <TabsContent value="roadmap" className="space-y-10">
          {STAGES.map((stage) => (
            <div key={stage.stageNumber} className="space-y-4">
              {/* Stage Header */}
              <div className="flex items-start gap-3 border-b border-border/40 pb-3">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 font-mono text-xs font-bold text-primary">
                  0{stage.stageNumber}
                </div>
                <div>
                  <h2 className="font-display text-base font-bold text-foreground">
                    Stage {stage.stageNumber}: {stage.title}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{stage.subtitle}</p>
                </div>
              </div>

              {/* Stage Milestones Grid */}
              <div className="grid gap-4 md:grid-cols-2">
                {stage.items.map((item) => {
                  const isCompleted = item.status === "completed";
                  const isInProgress = item.status === "in-progress";
                  const isLocked = item.status === "locked";

                  return (
                    <Card
                      key={item.id}
                      className={cn(
                        "relative flex flex-col justify-between overflow-hidden border p-5 transition-all",
                        isInProgress
                          ? "border-primary/60 bg-primary/5 shadow-md shadow-primary/5"
                          : isCompleted
                          ? "border-border/60 bg-card/70"
                          : "border-border/30 bg-card/30 opacity-75",
                      )}
                    >
                      <div>
                        {/* Status + Type Row */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] uppercase font-mono font-medium px-2 py-0 border border-border bg-secondary text-foreground",
                              )}
                            >
                              {item.type}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                              <Clock className="size-3" />
                              {item.duration}
                            </span>
                          </div>

                          {isCompleted ? (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-foreground">
                              <CheckCircle2 className="size-3.5 text-primary" />
                              Completed
                            </span>
                          ) : isInProgress ? (
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-primary">
                              In Progress
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground/60">
                              <Lock className="size-3" />
                              Locked
                            </span>
                          )}
                        </div>

                        <h3
                          className={cn(
                            "font-semibold text-sm leading-snug",
                            isLocked ? "text-muted-foreground" : "text-foreground",
                          )}
                        >
                          {item.title}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {item.description}
                        </p>
                      </div>

                      {/* Footer */}
                      <div className="mt-4 flex items-center justify-between border-t border-border/30 pt-3">
                        <span className="text-[11px] font-mono text-primary font-semibold flex items-center gap-1">
                          <Star className="size-3" />
                          +{item.xp} XP
                        </span>

                        {isCompleted ? (
                          <Button variant="ghost" size="sm" className="h-8 px-3 text-xs" asChild>
                            <Link href={item.url}>Review</Link>
                          </Button>
                        ) : isInProgress ? (
                          <Button size="sm" className="h-8 px-3 text-xs font-semibold shadow-none bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                            <Link href={item.url}>
                              <span>Resume</span>
                              <ArrowRight className="ml-1 size-3" />
                            </Link>
                          </Button>
                        ) : (
                          <Button variant="secondary" size="sm" disabled className="h-8 px-3 text-xs opacity-50">
                            Prerequisites Req.
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </TabsContent>

        {/* Tab 2: Ramp-Up Guide & Syllabus */}
        <TabsContent value="rampup">
          <Card className="border-border/60 bg-card/60 p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-6">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Official Ramp-Up Guide &amp; Exam Blueprint
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Recommended pacing: 6–8 hours/week over 5 weeks. Includes architecture design patterns and exam preparation checklists.
                </p>
              </div>
              <Button variant="outline" size="sm" className="gap-2 text-xs font-semibold shrink-0">
                <Download className="size-3.5 text-primary" />
                Download PDF Syllabus
              </Button>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-primary font-mono">
                  Target Competencies Tested
                </h4>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                    <span>Domain 1: Multi-tier high-availability microservice design (30%)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                    <span>Domain 2: Distributed consensus, event streaming, and outbox queues (28%)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                    <span>Domain 3: Zero-trust network policy and cryptographic identity (22%)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                    <span>Domain 4: Performance optimization, database sharding &amp; SRE (20%)</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-primary font-mono">
                  Prerequisites &amp; Prior Knowledge
                </h4>
                <ul className="space-y-2 text-xs text-muted-foreground list-disc pl-4">
                  <li>Familiarity with HTTP/2, REST APIs, and relational SQL database modeling.</li>
                  <li>Working knowledge of containerization concepts (Docker runtime, port bindings).</li>
                  <li>Basic comprehension of public key cryptography (Ed25519, TLS certificates).</li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}

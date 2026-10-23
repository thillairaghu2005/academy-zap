"use client";

import * as React from "react";
import { m as motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  Clock,
  FlaskConical,
  GraduationCap,
  Search,
  Sparkles,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/shared/page-container";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface RoleLearningPath {
  id: string;
  role: string;
  title: string;
  description: string;
  category: "cloud" | "ai" | "security" | "devops" | "fullstack";
  difficulty: "Foundational" | "Associate" | "Professional";
  hours: number;
  coursesCount: number;
  labsCount: number;
  examsCount: number;
  ceus: number;
  xpReward: number;
  badgeName: string;
  skills: string[];
  status: "in-progress" | "available" | "completed";
  progress: number;
}

const ROLE_PATHS: RoleLearningPath[] = [
  {
    id: "path-cloud-architect",
    role: "Cloud Solutions Architect",
    title: "Enterprise Cloud Solutions Architecture Pathway",
    description:
      "Master high-availability distributed systems, multi-region failover, cost optimization, and enterprise infrastructure design according to the Zapsters Cloud-Native Architecture Framework.",
    category: "cloud",
    difficulty: "Professional",
    hours: 38,
    coursesCount: 5,
    labsCount: 3,
    examsCount: 1,
    ceus: 3.8,
    xpReward: 8500,
    badgeName: "Cloud Architect Professional",
    skills: ["Distributed Systems", "Multi-Region", "Terraform", "SRE"],
    status: "in-progress",
    progress: 45,
  },
  {
    id: "path-ai-engineer",
    role: "AI & LLM Systems Engineer",
    title: "Generative AI Systems & Enterprise Agent Architecture",
    description:
      "Build production-grade LLM applications, RAG pipelines with vector databases, fine-tuning infrastructure, and resilient agentic workflows with low-latency inferencing.",
    category: "ai",
    difficulty: "Associate",
    hours: 32,
    coursesCount: 4,
    labsCount: 4,
    examsCount: 1,
    ceus: 3.2,
    xpReward: 7800,
    badgeName: "Enterprise AI Engineer Specialist",
    skills: ["RAG Pipelines", "Vector DBs", "Agentic Workflows", "PyTorch"],
    status: "available",
    progress: 0,
  },
  {
    id: "path-cyber-defense",
    role: "Security & Threat Specialist",
    title: "Zero-Trust Security & Cloud Cyber Defense Pathway",
    description:
      "Design zero-trust perimeters, automate intrusion detection, orchestrate cryptographic credential chains, and conduct red-team sandbox penetrations across enterprise infrastructure.",
    category: "security",
    difficulty: "Professional",
    hours: 42,
    coursesCount: 6,
    labsCount: 4,
    examsCount: 1,
    ceus: 4.2,
    xpReward: 9200,
    badgeName: "Cyber Defense Certified Specialist",
    skills: ["Zero-Trust", "Cryptography", "Penetration Testing", "Audit Log"],
    status: "available",
    progress: 0,
  },
  {
    id: "path-devops-sre",
    role: "DevOps & Cloud SRE",
    title: "Enterprise Cloud-Native DevOps & Reliability Engineering",
    description:
      "Implement zero-downtime CI/CD pipelines, GitOps workflows with ArgoCD, Kubernetes cluster mesh orchestration, Prometheus/Grafana observability, and chaos engineering.",
    category: "devops",
    difficulty: "Associate",
    hours: 28,
    coursesCount: 4,
    labsCount: 3,
    examsCount: 1,
    ceus: 2.8,
    xpReward: 6500,
    badgeName: "Cloud-Native DevOps SRE",
    skills: ["Kubernetes", "GitOps", "Chaos Engineering", "Observability"],
    status: "available",
    progress: 0,
  },
  {
    id: "path-fullstack-systems",
    role: "Full-Stack Distributed Engineer",
    title: "Modern Full-Stack Systems & High-Concurrency APIs",
    description:
      "From event-driven asynchronous microservices in FastAPI/PostgreSQL to modern reactive interfaces with Next.js App Router, WebSockets, and state hydration.",
    category: "fullstack",
    difficulty: "Foundational",
    hours: 30,
    coursesCount: 4,
    labsCount: 2,
    examsCount: 1,
    ceus: 3.0,
    xpReward: 6000,
    badgeName: "Full-Stack Distributed Engineer",
    skills: ["FastAPI", "Next.js", "PostgreSQL", "WebSockets"],
    status: "available",
    progress: 0,
  },
];

const CATEGORIES = [
  { id: "all", label: "All Career Pathways" },
  { id: "cloud", label: "Cloud Architecture" },
  { id: "ai", label: "Generative AI & ML" },
  { id: "security", label: "Cyber Defense" },
  { id: "devops", label: "DevOps & SRE" },
  { id: "fullstack", label: "Full-Stack" },
];

export function LearningPaths() {
  const reducedMotion = useReducedMotion() ?? false;
  const [selectedCategory, setSelectedCategory] = React.useState("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredPaths = React.useMemo(() => {
    return ROLE_PATHS.filter((p) => {
      if (selectedCategory !== "all" && p.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const match =
          p.title.toLowerCase().includes(query) ||
          p.role.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.skills.some((s) => s.toLowerCase().includes(query));
        if (!match) return false;
      }
      return true;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <PageContainer className="pt-6 sm:pt-8 pb-16">
      {/* Enterprise Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-card via-background to-card p-6 sm:p-10 mb-8 shadow-sm">
        <div className="relative z-10 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="size-3.5" />
              Zapsters Enterprise Standard
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              Accredited Role-Based Curricula
            </span>
          </div>

          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
            Role-Based Learning Pathways
          </h1>

          <p className="mt-3 text-base text-muted-foreground leading-relaxed">
            Follow end-to-end curriculums engineered to take you from foundational competencies to verified professional mastery. Each pathway integrates digital coursework, hands-on cloud sandboxes, and capstone certification exams unlocking verifiable Credly digital badges.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-6 text-xs text-muted-foreground border-t border-border/40 pt-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="size-4 text-primary" />
              <span>Verifiable Credly Badges</span>
            </div>
            <div className="flex items-center gap-2">
              <FlaskConical className="size-4 text-primary" />
              <span>Interactive Cloud Sandboxes</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-primary" />
              <span>Accredited CEU / CPE Credits</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-medium transition-all whitespace-nowrap",
                selectedCategory === cat.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-surface-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground border border-border/40",
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search role pathways or skills..."
            className="pl-9 h-9 text-xs rounded-full bg-surface-1 border-border/50"
          />
        </div>
      </div>

      {/* Role Pathway Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredPaths.map((path, idx) => {
          return (
            <motion.div
              key={path.id}
              initial={reducedMotion ? false : { opacity: 0, y: 16 }}
              animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={reducedMotion ? undefined : { duration: 0.35, delay: idx * 0.06 }}
            >
              <Card className="group relative h-full flex flex-col overflow-hidden border border-border/70 bg-card/90 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-[0_12px_36px_rgba(245,158,11,0.1)]">
                {/* Top Role Header */}
                <div className="border-b border-border/40 bg-surface-1/50 px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-primary font-semibold">
                      {path.role}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] uppercase font-mono font-medium px-2 py-0 border",
                      path.difficulty === "Professional"
                        ? "border-primary/40 text-primary bg-primary/5 font-semibold"
                        : "border-border text-muted-foreground bg-surface-1",
                    )}
                  >
                    {path.difficulty}
                  </Badge>
                </div>

                <CardHeader className="p-5 pb-3">
                  <CardTitle className="text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                    {path.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-3 text-xs leading-relaxed mt-1.5">
                    {path.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col justify-end p-5 pt-0">
                  {/* Curriculum Stats */}
                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-border/40 my-3 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Clock className="size-3.5 text-primary" />
                      <span>{path.hours} Hours</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="size-3.5 text-primary" />
                      <span>{path.coursesCount} Courses</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FlaskConical className="size-3.5 text-primary" />
                      <span>{path.labsCount} Labs</span>
                    </div>
                  </div>

                  {/* Skills Chips */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {path.skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded bg-surface-1 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground border border-border/40"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>

                  {/* Digital Badge Callout */}
                  <div className="mb-4 flex items-center gap-2 rounded-lg bg-primary/5 p-2 border border-primary/20 text-xs">
                    <Award className="size-4 text-primary shrink-0" />
                    <span className="truncate text-[11px] text-foreground font-medium">
                      Badge: <strong className="text-primary">{path.badgeName}</strong>
                    </span>
                  </div>

                  {/* Actions / Progress */}
                  {path.status === "in-progress" ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-primary font-semibold">Pathway Progress</span>
                        <span className="text-foreground">{path.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-1">
                        <div
                          className="h-full bg-primary transition-all duration-500"
                          style={{ width: `${path.progress}%` }}
                        />
                      </div>
                      <Button className="w-full mt-2 h-9 text-xs font-semibold shadow-none" asChild>
                        <Link href={`/learning-paths/${path.id}`}>Resume Pathway</Link>
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full justify-between h-9 text-xs font-semibold group/btn hover:border-primary/50 hover:bg-primary/5"
                      asChild
                    >
                      <Link href={`/learning-paths/${path.id}`}>
                        <span>Explore Curriculum</span>
                        <ArrowRight className="size-3.5 transition-transform group-hover/btn:translate-x-1" />
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </PageContainer>
  );
}

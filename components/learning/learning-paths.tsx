"use client";

import { m as motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, BookOpen, GitBranch, ShieldCheck, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/shared/page-container";
import { Badge } from "@/components/ui/badge";

const MOCK_PATHS = [
  {
    id: "path-1",
    title: "Backend Engineering Foundation",
    description: "Master the fundamentals of server-side architecture, APIs, and databases.",
    modules: 12,
    xpReward: 5000,
    icon: GitBranch,
    difficulty: "Beginner",
    status: "in-progress",
    progress: 45,
  },
  {
    id: "path-2",
    title: "Advanced System Design",
    description: "Learn how to build scalable, fault-tolerant distributed systems.",
    modules: 8,
    xpReward: 8000,
    icon: ShieldCheck,
    difficulty: "Advanced",
    status: "available",
    progress: 0,
  },
  {
    id: "path-3",
    title: "Full-Stack Web Development",
    description: "From React on the frontend to Next.js and PostgreSQL on the backend.",
    modules: 15,
    xpReward: 10000,
    icon: BookOpen,
    difficulty: "Intermediate",
    status: "available",
    progress: 0,
  }
];

export function LearningPaths() {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <PageContainer className="pt-8 sm:pt-10">
      <div className="mb-8 max-w-2xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Learning Paths
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Structured roadmaps designed to take you from fundamentals to mastery. Follow a curated sequence of courses, labs, and challenges to reach your career goals.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {MOCK_PATHS.map((path, idx) => {
          const Icon = path.icon;
          return (
            <motion.div
              key={path.id}
              initial={reducedMotion ? false : { opacity: 0, y: 20 }}
              animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={reducedMotion ? undefined : { duration: 0.4, delay: idx * 0.1 }}
            >
              <Card className="group relative h-full flex flex-col overflow-hidden transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/50 to-primary/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
                      <Icon className="size-5" />
                    </div>
                    <Badge variant={path.difficulty === "Advanced" ? "destructive" : path.difficulty === "Intermediate" ? "default" : "secondary"}>
                      {path.difficulty}
                    </Badge>
                  </div>
                  <CardTitle className="mt-4 text-xl">{path.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{path.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-end pt-0">
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1"><BookOpen className="size-4" /> {path.modules} Modules</span>
                    <span className="flex items-center gap-1 font-medium" style={{ color: "var(--color-xp-mastery)" }}><Star className="size-4" style={{ color: "var(--color-xp-mastery)" }} /> {path.xpReward} XP</span>
                  </div>
                  {path.status === "in-progress" ? (
                    <Link href={`/learning-paths/${path.id}`} className="w-full block hover:opacity-80 transition-opacity">
                      <div className="flex justify-between text-xs font-medium mb-1.5">
                        <span className="text-primary">Continue Path</span>
                        <span>{path.progress}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${path.progress}%` }} />
                      </div>
                    </Link>
                  ) : (
                    <Button variant="outline" className="w-full justify-between group/btn" asChild>
                      <Link href={`/learning-paths/${path.id}`}>
                        Start Path
                        <ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-1" />
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

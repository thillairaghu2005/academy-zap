"use client";

import { m as motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, PlayCircle, CheckCircle2, Lock, BookOpen } from "lucide-react";
import Link from "next/link";
import { PageContainer } from "@/components/shared/page-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const MOCK_PATH_DETAIL = {
  id: "path-1",
  title: "Backend Engineering Foundation",
  description: "Master the fundamentals of server-side architecture, APIs, and databases.",
  progress: 45,
  totalModules: 5,
  modules: [
    { id: "mod-1", title: "Introduction to Backend Architecture", duration: "2h 15m", status: "completed", type: "course" },
    { id: "mod-2", title: "Building RESTful APIs with FastAPI", duration: "4h 30m", status: "completed", type: "course" },
    { id: "mod-3", title: "PostgreSQL Database Design", duration: "3h 45m", status: "in-progress", type: "course" },
    { id: "mod-4", title: "Redis Caching Strategies", duration: "1h 50m", status: "locked", type: "lab" },
    { id: "mod-5", title: "Final Project: E-Commerce API", duration: "6h 00m", status: "locked", type: "challenge" },
  ]
};

export function LearningPathDetail({ id: _id }: { id: string }) {
  const reducedMotion = useReducedMotion() ?? false;
  // Use id to fetch real data in production

  return (
    <PageContainer className="pt-8 sm:pt-10">
      <div className="mb-6">
        <Link href="/learning-paths" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="size-4" />
          Back to Paths
        </Link>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="max-w-3xl">
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl mb-3">
              {MOCK_PATH_DETAIL.title}
            </h1>
            <p className="text-lg text-muted-foreground">
              {MOCK_PATH_DETAIL.description}
            </p>
          </div>
          
          <Card className="shrink-0 w-full md:w-72 border-primary/20 bg-primary/5">
            <CardContent className="p-5">
              <h3 className="font-semibold mb-2 flex items-center justify-between">
                Path Progress
                <span className="text-primary">{MOCK_PATH_DETAIL.progress}%</span>
              </h3>
              <Progress value={MOCK_PATH_DETAIL.progress} className="h-2 mb-4 bg-primary/20" indicatorClassName="bg-primary" />
              <Button className="w-full">Continue Path</Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <BookOpen className="size-5" />
          Curriculum
        </h2>
        <div className="relative border-l-2 border-border ml-3 md:ml-4 space-y-8 pb-8">
          {MOCK_PATH_DETAIL.modules.map((mod, idx) => {
            const isCompleted = mod.status === "completed";
            const isInProgress = mod.status === "in-progress";
            const isLocked = mod.status === "locked";

            return (
              <motion.div
                key={mod.id}
                initial={reducedMotion ? false : { opacity: 0, x: -20 }}
                animate={reducedMotion ? undefined : { opacity: 1, x: 0 }}
                transition={reducedMotion ? undefined : { duration: 0.3, delay: idx * 0.1 }}
                className="relative pl-8 md:pl-10"
              >
                {/* Timeline node */}
                <div className={`absolute -left-[11px] top-1.5 size-5 rounded-full border-4 border-background ${
                  isCompleted ? "bg-success" : isInProgress ? "bg-primary ring-2 ring-primary/30" : "bg-muted"
                }`} />
                
                <Card className={`transition-colors ${isLocked ? "opacity-60" : "hover:border-primary/40"} ${isInProgress ? "border-primary/50 shadow-md" : ""}`}>
                  <CardContent className="p-5 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="uppercase text-[10px] tracking-wider font-semibold">
                          {mod.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{mod.duration}</span>
                      </div>
                      <h3 className={`font-semibold text-lg ${isLocked ? "text-muted-foreground" : "text-foreground"}`}>
                        {idx + 1}. {mod.title}
                      </h3>
                    </div>
                    
                    <div className="shrink-0 mt-4 md:mt-0">
                      {isCompleted ? (
                        <span className="flex items-center gap-2 text-sm font-medium text-success-strong">
                          <CheckCircle2 className="size-5" /> Completed
                        </span>
                      ) : isLocked ? (
                        <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <Lock className="size-5" /> Locked
                        </span>
                      ) : (
                        <Button variant="default" size="sm" className="gap-2">
                          <PlayCircle className="size-4" /> Start
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </PageContainer>
  );
}

"use client";

import { m as motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, CodeXml, Trophy, Flame, Play, ChartColumn, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/shared/page-container";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const MOCK_CHALLENGES = [
  {
    id: "chal-1",
    title: "Reverse a Linked List",
    description: "Given the head of a singly linked list, reverse the list, and return the reversed list.",
    difficulty: "Easy",
    xpReward: 100,
    tags: ["Data Structures", "Pointers"],
    status: "completed",
    completions: 12543,
  },
  {
    id: "chal-2",
    title: "LRU Cache Implementation",
    description: "Design a data structure that follows the constraints of a Least Recently Used (LRU) cache.",
    difficulty: "Medium",
    xpReward: 350,
    tags: ["System Design", "Hash Map"],
    status: "attempted",
    completions: 4892,
  },
  {
    id: "chal-3",
    title: "Distributed Lock with Redis",
    description: "Implement a robust distributed lock mechanism using Redis with automatic TTL extension.",
    difficulty: "Hard",
    xpReward: 800,
    tags: ["Redis", "Distributed Systems"],
    status: "available",
    completions: 984,
  }
];

export function Challenges() {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <PageContainer className="pt-8 sm:pt-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning-strong uppercase tracking-wider">
              <Flame className="size-3.5" />
              Season 4 Active
            </span>
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Coding Challenges
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            Prove your skills in isolated environments. Earn mastery XP, climb the leaderboards, and unlock exclusive badges.
          </p>
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          <Button variant="outline" className="gap-2">
            <ChartColumn className="size-4" />
            Leaderboards
          </Button>
          <Button className="gap-2">
            <Play className="size-4" />
            Daily Challenge
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CodeXml className="size-5 text-primary" />
            Problem Set
          </h2>
          {MOCK_CHALLENGES.map((chal, idx) => (
            <motion.div
              key={chal.id}
              initial={reducedMotion ? false : { opacity: 0, x: -20 }}
              animate={reducedMotion ? undefined : { opacity: 1, x: 0 }}
              transition={reducedMotion ? undefined : { duration: 0.3, delay: idx * 0.05 }}
            >
              <Card className="group transition-colors hover:border-primary/40 hover:bg-muted/50 cursor-pointer">
                <CardContent className="p-5 flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge variant={chal.difficulty === "Hard" ? "destructive" : chal.difficulty === "Medium" ? "default" : "secondary"}>
                        {chal.difficulty}
                      </Badge>
                      {chal.tags.map(tag => (
                        <span key={tag} className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h3 className="font-semibold text-base mb-1 truncate flex items-center gap-2">
                      {chal.title}
                      {chal.status === "completed" && <CheckCircle2 className="size-4 text-success-strong" />}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">{chal.description}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto justify-between sm:justify-end border-t border-border sm:border-0 pt-4 sm:pt-0">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-0.5">Reward</p>
                      <p className="font-semibold text-mastery flex items-center gap-1 text-sm">
                        +{chal.xpReward} XP
                      </p>
                    </div>
                    <Button variant={chal.status === "completed" ? "outline" : "default"} size="sm" className="gap-2 shrink-0" asChild>
                      <Link href={`/challenges/${chal.id}`}>
                        {chal.status === "completed" ? "Review" : chal.status === "attempted" ? "Resume" : "Solve"}
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Sidebar / Leaderboard Preview */}
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Trophy className="size-5 text-warning-strong" />
            Top Hackers (This Week)
          </h2>
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {[
                  { rank: 1, name: "Alex Chen", xp: 12450, avatar: "AC" },
                  { rank: 2, name: "Samira Jones", xp: 11200, avatar: "SJ" },
                  { rank: 3, name: "David Kim", xp: 10850, avatar: "DK" },
                  { rank: 4, name: "Elena R.", xp: 9500, avatar: "ER" },
                  { rank: 5, name: "Michael T.", xp: 8900, avatar: "MT" },
                ].map((user) => (
                  <div key={user.rank} className="flex items-center gap-3 p-3 transition-colors hover:bg-muted/50">
                    <span className={`w-5 text-center font-mono text-xs font-semibold ${user.rank <= 3 ? "text-warning-strong" : "text-muted-foreground"}`}>
                      {user.rank}
                    </span>
                    <Avatar className="size-8 rounded-lg">
                      <AvatarFallback className="rounded-lg text-[10px]">{user.avatar}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                    </div>
                    <span className="text-xs font-semibold text-mastery">{user.xp}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}

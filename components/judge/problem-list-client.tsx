"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { m as motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  BarChart3,
  Brackets,
  Check,
  CheckCircle2,
  Database,
  Flame,
  GitBranch,
  Layers3,
  Network,
  Search,
  Settings2,
  Target,
  Timer,
  Type,
  Trophy,
  Zap,
  CalendarDays,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { Problem, ProblemDifficulty } from "@/lib/contracts/judge";
import { listProblems, listSolvedProblemIds } from "@/lib/data/demo/judge";
import { getProgressContext } from "@/lib/data/demo/gamification";
import { useSession } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageContainer } from "@/components/shared/page-container";
import { SkeletonProblemRows } from "@/components/shared/skeletons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "solved" | "unsolved";
type SortKey = "recommended" | "title" | "difficulty" | "acceptance" | "time";

const DIFFICULTY_ORDER: Record<ProblemDifficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "title", label: "Title" },
  { value: "difficulty", label: "Difficulty" },
  { value: "acceptance", label: "Acceptance rate" },
  { value: "time", label: "Estimated time" },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All problems" },
  { value: "unsolved", label: "To do" },
  { value: "solved", label: "Solved" },
];

const PROBLEM_META: Record<string, { companies: string[]; solves: number; xp: number }> = {
  "p-two-sum": { companies: ["Google", "Amazon"], solves: 1842, xp: 100 },
  "p-valid-parens": { companies: ["Meta", "Microsoft"], solves: 1294, xp: 100 },
  "p-max-subarray": { companies: ["Google", "Stripe"], solves: 987, xp: 160 },
  "p-reverse-linked-list": { companies: ["Amazon", "Apple"], solves: 821, xp: 100 },
  "p-binary-tree-inorder": { companies: ["Meta", "Netflix"], solves: 706, xp: 100 },
  "p-median-two-sorted": { companies: ["Google", "Uber"], solves: 364, xp: 240 },
  "p-trapping-rain-water": { companies: ["Amazon", "Adobe"], solves: 298, xp: 240 },
};

const DIFFICULTY_STYLES: Record<ProblemDifficulty, { badge: string; dot: string }> = {
  easy: { badge: "border-success/30 bg-success/15 text-success-strong", dot: "bg-success" },
  medium: { badge: "border-warning/35 bg-warning/15 text-warning-strong", dot: "bg-warning" },
  hard: { badge: "border-danger/30 bg-danger/15 text-danger-strong", dot: "bg-danger" },
};

const CATEGORY_BY_TOPIC: Record<string, { icon: LucideIcon; label: string }> = {
  arrays: { icon: Brackets, label: "Arrays" },
  "hash-maps": { icon: Database, label: "Hash maps" },
  strings: { icon: Type, label: "Strings" },
  stack: { icon: Layers3, label: "Stack" },
  "linked-list": { icon: Network, label: "Linked list" },
  tree: { icon: GitBranch, label: "Trees" },
  dfs: { icon: GitBranch, label: "Trees" },
  "binary-search": { icon: Search, label: "Binary search" },
  "two-pointers": { icon: Network, label: "Two pointers" },
  dp: { icon: Layers3, label: "Dynamic programming" },
  "divide-and-conquer": { icon: GitBranch, label: "Divide and conquer" },
};

function problemMeta(problem: Problem) {
  return PROBLEM_META[problem.id] ?? { companies: ["Zapsters"], solves: 0, xp: 100 };
}

const NUMBER_FORMATTER = new Intl.NumberFormat("en-US");

function formatNumber(value: number) {
  return NUMBER_FORMATTER.format(value);
}

function categoryFor(problem: Problem) {
  return problem.topics.map((topic) => CATEGORY_BY_TOPIC[topic]).find(Boolean) ?? {
    icon: Brackets,
    label: "Algorithms",
  };
}

function ProblemCard({ problem, index, solved }: { problem: Problem; index: number; solved: boolean }) {
  const reducedMotion = useReducedMotion() ?? false;
  const meta = problemMeta(problem);
  const description = problem.statement.split("\n")[0];
  const category = categoryFor(problem);
  const CategoryIcon = category.icon;
  const visibleTopics = problem.topics.slice(0, 2);
  const hiddenTopicCount = Math.max(problem.topics.length - visibleTopics.length, 0);
  const difficultyStyle = DIFFICULTY_STYLES[problem.difficulty];

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 14 }}
      animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      transition={reducedMotion ? undefined : { delay: Math.min(index * 0.045, 0.3), duration: 0.25, ease: "easeOut" }}
      className="h-full group relative"
    >
      <Link href={`/judge/${problem.id}`} className="block h-full rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4">
        <Card className="flex h-full flex-col justify-between overflow-hidden rounded-2xl border-border bg-card p-5 shadow-[0_8px_30px_rgb(17_24_39_/_4%)] transition-all duration-200 group-hover:-translate-y-1 group-hover:border-primary/30 group-hover:shadow-[0_16px_40px_rgb(17_24_39_/_9%)]">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-4 min-w-0">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-border bg-surface-1 text-muted-foreground transition-transform duration-200 group-hover:scale-[1.03]" aria-label={`${category.label} category`}>
                  <CategoryIcon className="size-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate font-display text-[18px] font-semibold tracking-tight text-foreground transition-colors duration-200 group-hover:text-primary" title={problem.title}>
                    {problem.title}
                  </h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2.5 text-[13px]">
                    {solved ? (
                      <span className="flex items-center gap-1 font-semibold text-success-strong">
                        <Check className="size-3.5" /> Solved
                      </span>
                    ) : null}
                    <span className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border", difficultyStyle.badge)}>
                      <span className={cn("size-1.5 rounded-full", difficultyStyle.dot)} aria-hidden="true" />
                      {problem.difficulty}
                    </span>
                    <span className="text-muted-foreground font-medium truncate">{visibleTopics.join(", ")}{hiddenTopicCount > 0 && `, +${hiddenTopicCount}`}</span>
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground" title={description}>{description}</p>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-border/80 pt-4">
            <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
              <div className="flex items-center gap-1.5" title="Acceptance Rate"><CheckCircle2 className="size-4" /> {problem.success_rate_pct}%</div>
              <div className="flex items-center gap-1.5" title="Estimated Time"><Timer className="size-4" /> ~{problem.estimated_minutes}m</div>
              <div className="flex items-center gap-1.5 text-xp-mastery font-semibold" title="XP Reward"><Zap className="size-4" /> +{meta.xp}</div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-4 pr-3 text-xs font-medium text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:flex">
                 <span className="flex items-center gap-1.5"><BarChart3 className="size-3.5" />{problem.time_limit_ms}ms</span>
                 <span className="flex items-center gap-1.5"><Database className="size-3.5" />{(problem.memory_limit_kb/1024).toFixed(0)}MB</span>
              </div>
              <span className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-surface-2 px-4 text-[13px] font-semibold text-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground shadow-sm">
                Solve <ArrowUpRight className="size-3.5" />
              </span>
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}

function PathCard({ title, progress, total }: { title: string; progress: number; total: number; label?: string }) {
  const percentage = Math.round((progress / total) * 100);
  return (
    <Card className="p-4 bg-surface-1 border-border/60 shadow-sm transition-all hover:border-primary/30 hover:shadow-md cursor-pointer group">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-semibold text-sm truncate pr-4 text-foreground group-hover:text-primary transition-colors">{title}</h4>
        <span className="text-xs font-semibold text-muted-foreground shrink-0 bg-surface-2 px-2 py-0.5 rounded-full">{progress}/{total}</span>
      </div>
      <div className="h-1.5 w-full bg-surface-3 rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${percentage}%` }} />
      </div>
      <p className="mt-2.5 text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">{percentage}% complete</p>
    </Card>
  );
}

export function ProblemListClient() {
  const { user } = useSession();
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [tag, setTag] = React.useState("all");
  const [company, setCompany] = React.useState("all");
  const [sort, setSort] = React.useState<SortKey>("recommended");
  const [showFilters, setShowFilters] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"all" | "recommended" | "easy" | "medium" | "hard">("all");

  const difficulty = activeTab === "all" || activeTab === "recommended" ? "all" : (activeTab as ProblemDifficulty);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["judge-problems"],
    queryFn: listProblems,
  });
  const solvedQuery = useQuery({
    queryKey: ["solved-problems", user?.id ?? "anonymous"],
    queryFn: () => listSolvedProblemIds(user?.id ?? ""),
    enabled: Boolean(user),
  });
  const progressQuery = useQuery({
    queryKey: ["progress-context", user?.id ?? "anonymous"],
    queryFn: () => getProgressContext(user?.id ?? ""),
    enabled: Boolean(user),
  });

  const solvedIds = React.useMemo(() => solvedQuery.data ?? [], [solvedQuery.data]);
  const solvedIdSet = React.useMemo(() => new Set(solvedIds), [solvedIds]);
  
  const tags = React.useMemo(
    () => [...new Set((data ?? []).flatMap((problem) => problem.topics))].sort(),
    [data],
  );
  const companies = React.useMemo(
    () => [...new Set((data ?? []).flatMap((problem) => problemMeta(problem).companies))].sort(),
    [data],
  );

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = (data ?? []).filter((problem) => {
      const meta = problemMeta(problem);
      const matchesSearch = !query || [problem.title, problem.slug, problem.statement, ...problem.topics].join(" ").toLowerCase().includes(query);
      const matchesDifficulty = difficulty === "all" || problem.difficulty === difficulty;
      const matchesStatus = status === "all" || (status === "solved" ? solvedIdSet.has(problem.id) : !solvedIdSet.has(problem.id));
      const matchesTag = tag === "all" || problem.topics.includes(tag);
      const matchesCompany = company === "all" || meta.companies.includes(company);
      
      const isRecommended = activeTab === "recommended" ? !solvedIdSet.has(problem.id) : true;
      
      return matchesSearch && matchesDifficulty && matchesStatus && matchesTag && matchesCompany && isRecommended;
    });

    return [...result].sort((a, b) => {
      switch (sort) {
        case "title": return a.title.localeCompare(b.title);
        case "difficulty": return DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty];
        case "acceptance": return b.success_rate_pct - a.success_rate_pct;
        case "time": return a.estimated_minutes - b.estimated_minutes;
        default: return 0;
      }
    });
  }, [company, data, difficulty, search, solvedIdSet, sort, status, tag, activeTab]);

  const resetFilters = () => {
    setSearch("");
    setStatus("all");
    setTag("all");
    setCompany("all");
    setSort("recommended");
    setActiveTab("all");
  };

  const activeFilters = [
    status !== "all" ? { label: STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status, clear: () => setStatus("all") } : null,
    tag !== "all" ? { label: `Topic: ${tag}`, clear: () => setTag("all") } : null,
    company !== "all" ? { label: `Company: ${company}`, clear: () => setCompany("all") } : null,
  ].filter((item): item is { label: string; clear: () => void } => item !== null);

  const problemsLoading = isLoading || solvedQuery.isLoading;
  const solvedCount = solvedIds.length;
  const totalXp = progressQuery.data
    ? progressQuery.data.rank.completion_xp + progressQuery.data.rank.mastery_xp
    : 0;
  const streak = progressQuery.data?.streak.current_streak_days ?? 0;
  const readiness = 74; // Mocked for redesign

  const nextProblem = React.useMemo(() => {
    if (!data) return null;
    return data.find((problem) => !solvedIdSet.has(problem.id)) ?? data[0];
  }, [data, solvedIdSet]);

  return (
    <PageContainer className="max-w-[1440px] px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
      
      {/* 1. Header */}
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl mb-2">
          Ready to level up, {user?.display_name?.split(' ')[0] || "Student"}?
        </h1>
        <p className="text-lg text-muted-foreground font-medium">
          Your next breakthrough is just one problem away.
        </p>
      </header>

      {/* 2. Hero Next Action + Stats Strip */}
      <section className="mb-14">
        <Card className="relative overflow-hidden rounded-3xl border-primary/20 bg-primary/5 shadow-sm">
          <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-primary/10 to-transparent blur-3xl pointer-events-none" />
          <div className="relative p-7 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-[13px] font-semibold text-primary mb-5 shadow-sm">
                <Target className="size-4" /> Your next challenge
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold text-foreground truncate">
                {nextProblem ? nextProblem.title : "Loading next challenge..."}
              </h2>
              
              {nextProblem && (
                <>
                  <div className="mt-4 flex flex-wrap items-center gap-3.5 text-sm">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold border", DIFFICULTY_STYLES[nextProblem.difficulty].badge)}>
                      <span className={cn("size-2 rounded-full", DIFFICULTY_STYLES[nextProblem.difficulty].dot)} />
                      {nextProblem.difficulty}
                    </span>
                    <span className="text-muted-foreground font-medium">{nextProblem.topics.slice(0, 2).join(", ")}</span>
                    <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                      <Timer className="size-4.5" /> ~{nextProblem.estimated_minutes} min
                    </span>
                  </div>
                  <p className="mt-5 text-[15px] text-foreground-muted max-w-xl leading-relaxed">
                    You haven&apos;t practiced <strong className="text-foreground font-medium">{nextProblem.topics[0] ?? "Hash Maps"}</strong> recently — builds your <strong className="text-foreground font-medium">{nextProblem.topics[1] ?? "Array"}</strong> fundamentals.
                  </p>
                </>
              )}
            </div>
            
            <div className="shrink-0 w-full sm:w-auto">
              {nextProblem ? (
                <Button asChild size="lg" className="w-full sm:w-auto h-14 px-8 text-base font-semibold shadow-xl shadow-primary/20 bg-primary hover:bg-primary-hover text-primary-foreground group transition-all">
                  <Link href={`/judge/${nextProblem.id}`}>
                    Continue Challenge <ArrowUpRight className="ml-2 size-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                  </Link>
                </Button>
              ) : (
                <SkeletonProblemRows count={1} />
              )}
            </div>
          </div>
        </Card>

        <div className="mt-6 flex flex-wrap items-center gap-x-10 gap-y-4 px-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="size-5 text-muted-foreground" />
            <span className="font-semibold text-foreground text-base">{solvedCount}</span>
            <span className="text-sm font-medium text-muted-foreground">Solved</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Flame className="size-5 text-muted-foreground" />
            <span className="font-semibold text-foreground text-base">{streak} days</span>
            <span className="text-sm font-medium text-muted-foreground">Streak</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Trophy className="size-5 text-muted-foreground" />
            <span className="font-semibold text-foreground text-base">{formatNumber(totalXp)}</span>
            <span className="text-sm font-medium text-muted-foreground">XP</span>
          </div>
          <div className="flex items-center gap-2.5">
            <BarChart3 className="size-5 text-muted-foreground" />
            <span className="font-semibold text-foreground text-base">{readiness}%</span>
            <span className="text-sm font-medium text-muted-foreground">Interview Readiness</span>
          </div>
        </div>
      </section>

      {/* 3. Upcoming Contests/Events */}
      <section className="mb-20">
        <h3 className="font-display text-2xl font-semibold mb-6 text-foreground flex items-center gap-2">
          <Trophy className="size-6 text-primary" /> Upcoming Events
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Event Card 1 */}
          <Card className="relative overflow-hidden group border-primary/20 bg-gradient-to-br from-surface-1 to-surface-2 shadow-sm hover:shadow-md transition-all">
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="p-6 relative z-10 flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <div className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
                  Weekly Contest
                </div>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-danger bg-danger/10 px-2.5 py-1 rounded-md">
                  <Timer className="size-4" /> 2d 14h
                </div>
              </div>
              <h4 className="font-display text-xl font-semibold mb-2">Zapster Weekly 142</h4>
              <p className="text-[14px] text-muted-foreground mb-6 flex-1">
                4 problems, 90 minutes. Compete with peers and improve your global ranking!
              </p>
              <div className="flex items-center justify-between mt-auto">
                <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                  <CalendarDays className="size-4" /> Sat, 8:00 PM
                </div>
                <Button variant="outline" size="sm" className="font-semibold h-8 rounded-lg group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
                  Register
                </Button>
              </div>
            </div>
          </Card>

          {/* Event Card 2 */}
          <Card className="relative overflow-hidden group border-border bg-gradient-to-br from-surface-1 to-surface-2 shadow-sm hover:shadow-md transition-all">
            <div className="p-6 relative z-10 flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <div className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-secondary-foreground">
                  Mock Interview
                </div>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground bg-surface-3/50 px-2.5 py-1 rounded-md">
                  <Timer className="size-4" /> 5d 10h
                </div>
              </div>
              <h4 className="font-display text-xl font-semibold mb-2">System Design: Chat App</h4>
              <p className="text-[14px] text-muted-foreground mb-6 flex-1">
                Live mock interview session focusing on scalable architecture and real-time data.
              </p>
              <div className="flex items-center justify-between mt-auto">
                <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                  <CalendarDays className="size-4" /> Tue, 6:30 PM
                </div>
                <Button variant="outline" size="sm" className="font-semibold h-8 rounded-lg hover:bg-foreground hover:text-background transition-colors">
                  Join Waitlist
                </Button>
              </div>
            </div>
          </Card>

          {/* Event Card 3 */}
          <Card className="relative overflow-hidden group border-border bg-gradient-to-br from-surface-1 to-surface-2 shadow-sm hover:shadow-md transition-all hidden lg:flex flex-col">
            <div className="p-6 relative z-10 flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <div className="inline-flex items-center gap-1.5 rounded-md bg-success/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-success">
                  Hackathon
                </div>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground bg-surface-3/50 px-2.5 py-1 rounded-md">
                  <Timer className="size-4" /> 12d 0h
                </div>
              </div>
              <h4 className="font-display text-xl font-semibold mb-2">Build with AI</h4>
              <p className="text-[14px] text-muted-foreground mb-6 flex-1">
                A 48-hour hackathon to build the most innovative AI-powered productivity tool.
              </p>
              <div className="flex items-center justify-between mt-auto">
                <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                  <CalendarDays className="size-4" /> Sep 15 - Sep 17
                </div>
                <Button variant="outline" size="sm" className="font-semibold h-8 rounded-lg hover:bg-success hover:text-success-foreground hover:border-success transition-colors">
                  Explore
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* 4. Practice Library */}
      <section className="mb-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 mb-8">
          <h3 className="font-display text-3xl font-semibold">Practice Library</h3>
          
          <div className="flex items-center p-1.5 rounded-xl bg-surface-2 border border-border/60 overflow-x-auto rail-scroll">
            {(["all", "recommended", "easy", "medium", "hard"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-5 py-2 rounded-lg text-[13px] font-semibold whitespace-nowrap transition-all",
                  activeTab === tab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-surface-3/50"
                )}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3 w-full max-w-3xl">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search problems, topics..."
                className="pl-11 h-12 rounded-xl border-border bg-card shadow-sm focus-visible:ring-primary text-[15px]"
              />
            </div>
            <Button
              variant={activeFilters.length > 0 || showFilters ? "secondary" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
              className="h-12 px-5 rounded-xl gap-2.5 whitespace-nowrap font-semibold"
            >
              <Settings2 className="size-4.5" /> 
              <span className="hidden sm:inline">Filters</span>
              {activeFilters.length > 0 && (
                <span className="ml-1 rounded-full bg-foreground text-background px-2 py-0.5 text-[11px] font-bold leading-none">
                  {activeFilters.length}
                </span>
              )}
            </Button>
          </div>

          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-5 p-6 rounded-2xl border border-border bg-surface-1 shadow-sm max-w-4xl"
            >
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</span>
                <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
                  <SelectTrigger className="h-11 rounded-lg bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Topic</span>
                <Select value={tag} onValueChange={setTag}>
                  <SelectTrigger className="h-11 rounded-lg bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Topics</SelectItem>
                    {tags.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Company</span>
                <Select value={company} onValueChange={setCompany}>
                  <SelectTrigger className="h-11 rounded-lg bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Companies</SelectItem>
                    {companies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sort By</span>
                <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                  <SelectTrigger className="h-11 rounded-lg bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </motion.div>
          )}

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2.5 mt-1">
              {activeFilters.map(filter => (
                <div key={filter.label} className="flex items-center gap-2 rounded-full border border-border bg-surface-1 px-3.5 py-1.5 text-[13px] font-medium text-foreground shadow-sm">
                  {filter.label}
                  <button onClick={filter.clear} className="text-muted-foreground hover:text-danger p-0.5 rounded-full transition-colors">
                    <X className="size-4" />
                  </button>
                </div>
              ))}
              <button onClick={resetFilters} className="text-[13px] text-muted-foreground font-semibold hover:text-foreground px-2 py-1 transition-colors ml-1">
                Clear all filters
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 grid md:grid-cols-2 gap-5 xl:gap-6">
          {problemsLoading ? (
             <div className="md:col-span-2"><SkeletonProblemRows count={6} /></div>
          ) : isError ? (
             <div className="md:col-span-2"><ErrorState title="Judge unavailable" message={error instanceof Error ? error.message : "The judge demo data is unavailable."} onRetry={() => refetch()} /></div>
          ) : filtered.length === 0 ? (
             <div className="md:col-span-2">
               <EmptyState icon={Search} title="No problems found" description="Try adjusting your filters or search query." primaryAction={<Button onClick={resetFilters}>Clear filters</Button>} />
             </div>
          ) : (
            filtered.map((problem, index) => (
              <ProblemCard key={problem.id} problem={problem} index={index} solved={solvedIdSet.has(problem.id)} />
            ))
          )}
        </div>
      </section>


    </PageContainer>
  );
}

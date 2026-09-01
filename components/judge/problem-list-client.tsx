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
  CircleDot,
  Database,
  Flame,
  GitBranch,
  Layers3,
  ListFilter,
  Network,
  RotateCcw,
  Search,
  Sparkles,
  SquareTerminal,
  Tag,
  Timer,
  Type,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { Problem, ProblemDifficulty } from "@/lib/contracts/judge";
import { listProblems, listSolvedProblemIds } from "@/lib/data/demo/judge";
import { getProgressContext } from "@/lib/data/demo/gamification";
import { DEMO_MODE } from "@/lib/config";
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

const DIFFICULTIES: { value: ProblemDifficulty | "all"; label: string }[] = [
  { value: "all", label: "All difficulties" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

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
  easy: { badge: "border-success/20 bg-success/10 text-success-strong", dot: "bg-success" },
  medium: { badge: "border-warning/25 bg-warning/10 text-warning-strong", dot: "bg-warning" },
  hard: { badge: "border-danger/20 bg-danger/10 text-danger-strong", dot: "bg-danger" },
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

function Metric({
  icon: Icon,
  value,
  label,
  valueClassName,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className={cn("truncate text-sm font-semibold leading-4 text-foreground", valueClassName)}>{value}</p>
        <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function AcceptanceMetric({ rate }: { rate: number }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <svg className="size-9 shrink-0 -rotate-90" viewBox="0 0 40 40" aria-label={`${rate}% acceptance rate`} role="img">
        <circle cx="20" cy="20" r="15" fill="none" stroke="var(--color-muted)" strokeWidth="5" />
        <circle cx="20" cy="20" r="15" fill="none" stroke="var(--color-success)" strokeWidth="5" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - rate} strokeLinecap="round" />
      </svg>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-4 text-foreground">{rate}%</p>
        <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Acceptance</p>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  icon: Icon,
  value,
  onValueChange,
  options,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex min-w-[148px] flex-1 flex-col gap-1.5 sm:flex-none">
      <span className="flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white/80 text-sm shadow-none hover:border-slate-300 hover:bg-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-white/80 p-4 backdrop-blur-sm">
      <div className={cn("grid size-10 shrink-0 place-items-center rounded-xl", tone)}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
        <div className="mt-0.5 flex items-baseline gap-2">
          <p className="font-display text-xl font-semibold tracking-tight text-foreground">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function ProblemCard({
  problem,
  index,
  solved,
}: {
  problem: Problem;
  index: number;
  solved: boolean;
}) {
  const reducedMotion = useReducedMotion() ?? false;
  const meta = problemMeta(problem);
  const description = problem.statement.split("\n")[0];
  const category = categoryFor(problem);
  const CategoryIcon = category.icon;
  const visibleTopics = problem.topics.slice(0, 3);
  const hiddenTopicCount = Math.max(problem.topics.length - visibleTopics.length, 0);
  const difficultyStyle = DIFFICULTY_STYLES[problem.difficulty];

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 14 }}
      animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      transition={reducedMotion ? undefined : { delay: Math.min(index * 0.045, 0.3), duration: 0.25, ease: "easeOut" }}
      className="h-full"
    >
      <Link
        href={`/judge/${problem.id}`}
        className="group block h-full rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4"
      >
          <Card className="relative flex h-full flex-col overflow-hidden rounded-2xl border-border bg-card p-6 shadow-[0_8px_30px_rgb(17_24_39_/_4%)] transition-[transform,box-shadow,border-color] duration-200 ease-out group-hover:-translate-y-1 group-hover:border-primary/30 group-hover:shadow-[0_16px_40px_rgb(17_24_39_/_9%)] sm:p-6">
          <div className="flex items-start gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-xl border border-border bg-surface-1 text-muted-foreground transition-transform duration-200 ease-out group-hover:scale-[1.03]" aria-label={`${category.label} category`}>
              <CategoryIcon className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex min-h-5 flex-wrap items-center gap-2">
                {solved ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success-strong">
                    <Check className="size-3.5" /> Solved
                  </span>
                ) : null}
                <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold", difficultyStyle.badge)}>
                  <span className={cn("size-1.5 rounded-full", difficultyStyle.dot)} aria-hidden="true" />
                  {problem.difficulty}
                </span>
              </div>
              <h3 className="mt-2 truncate font-display text-[21px] font-semibold leading-7 tracking-[-0.025em] text-foreground transition-colors duration-200 group-hover:text-primary" title={problem.title}>
                {problem.title}
              </h3>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex min-w-0 items-center gap-2 overflow-hidden">
              {visibleTopics.map((topic) => (
                <span key={topic} className="max-w-[42%] truncate rounded-lg border border-border bg-surface-1 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                  {topic}
                </span>
              ))}
              {hiddenTopicCount > 0 ? (
                <span className="shrink-0 rounded-lg border border-border bg-surface-1 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">+{hiddenTopicCount}</span>
              ) : null}
            </div>
            <p className="mt-2 truncate text-sm leading-5 text-muted-foreground" title={description}>{description}</p>
          </div>

          <div className="mt-6 rounded-xl border border-border/80 bg-surface-1/70 p-4">
            <div className="mb-4 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">Problem signals</p>
              <span className="text-[11px] font-medium text-muted-foreground">{formatNumber(meta.solves)} solves</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
              <AcceptanceMetric rate={problem.success_rate_pct} />
              <Metric icon={Timer} value={`~${problem.estimated_minutes} min`} label="Solve time" />
              <Metric icon={Zap} value={`+${meta.xp} XP`} label="Reward" valueClassName="text-xp-mastery" />
              <Metric icon={BarChart3} value={`${problem.time_limit_ms} ms`} label="Runtime limit" />
              <Metric icon={Database} value={`${(problem.memory_limit_kb / 1024).toFixed(0)} MB`} label="Memory limit" />
              <Metric icon={CircleDot} value={`${problem.hidden_test_count} tests`} label="Test cases" />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 border-t border-border/80 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
              <Users className="size-3.5 shrink-0" />
              <span className="truncate">Asked at {meta.companies.join(" / ")}</span>
            </div>
            <span className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-[background-color,box-shadow] duration-200 ease-out group-hover:bg-primary-hover group-hover:shadow-lg sm:w-auto">
              Solve Challenge
              <ArrowUpRight className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-1" />
            </span>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}

export function ProblemListClient() {
  const { user } = useSession();
  const [search, setSearch] = React.useState("");
  const [difficulty, setDifficulty] = React.useState<ProblemDifficulty | "all">("all");
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [tag, setTag] = React.useState("all");
  const [company, setCompany] = React.useState("all");
  const [sort, setSort] = React.useState<SortKey>("recommended");

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
  const counts = React.useMemo(() => {
    const result: Record<ProblemDifficulty, number> = { easy: 0, medium: 0, hard: 0 };
    for (const problem of data ?? []) result[problem.difficulty]++;
    return result;
  }, [data]);

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
      return matchesSearch && matchesDifficulty && matchesStatus && matchesTag && matchesCompany;
    });

    return [...result].sort((a, b) => {
      switch (sort) {
        case "title":
          return a.title.localeCompare(b.title);
        case "difficulty":
          return DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty];
        case "acceptance":
          return b.success_rate_pct - a.success_rate_pct;
        case "time":
          return a.estimated_minutes - b.estimated_minutes;
        default:
          return 0;
      }
    });
  }, [company, data, difficulty, search, solvedIdSet, sort, status, tag]);

  const resetFilters = () => {
    setSearch("");
    setDifficulty("all");
    setStatus("all");
    setTag("all");
    setCompany("all");
    setSort("recommended");
  };

  const activeFilters = [
    search ? { label: `Search: ${search}`, clear: () => setSearch("") } : null,
    difficulty !== "all" ? { label: DIFFICULTIES.find((item) => item.value === difficulty)?.label ?? difficulty, clear: () => setDifficulty("all") } : null,
    status !== "all" ? { label: STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status, clear: () => setStatus("all") } : null,
    tag !== "all" ? { label: `Tag: ${tag}`, clear: () => setTag("all") } : null,
    company !== "all" ? { label: `Company: ${company}`, clear: () => setCompany("all") } : null,
  ].filter((item): item is { label: string; clear: () => void } => item !== null);

  const problemsLoading = isLoading || solvedQuery.isLoading;
  const totalProblems = data?.length ?? 0;
  const solvedCount = solvedIds.length;
  const totalXp = progressQuery.data
    ? progressQuery.data.rank.completion_xp + progressQuery.data.rank.mastery_xp
    : null;

  return (
    <PageContainer className="max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card px-5 py-7 shadow-[0_20px_60px_rgb(17_24_39_/_7%)] sm:px-8 sm:py-9 lg:px-10 lg:py-10">
        <div className="pointer-events-none absolute -right-20 -top-32 size-96 rounded-full bg-primary/8 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 left-1/3 size-96 rounded-full bg-primary-light/60 blur-3xl" />
        <div className="relative">
          <div className="flex flex-col justify-between gap-7 xl:flex-row xl:items-end">
            <div className="max-w-2xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary">
                <Sparkles className="size-3.5" /> Practice with purpose
              </div>
              <h1 className="font-display text-4xl font-semibold tracking-[-0.045em] text-foreground sm:text-5xl">Judge Engine</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                Sharpen your problem-solving instincts with real interview patterns, instant feedback, and a focused Python workspace.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="size-2 rounded-full bg-success" />
              Judge queue operational
            </div>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total Problems" value={isLoading ? "—" : formatNumber(totalProblems)} detail="in the library" icon={Layers3} tone="bg-primary/10 text-primary" />
            <StatCard label="Solved" value={solvedQuery.isLoading ? "—" : formatNumber(solvedCount)} detail={solvedCount === 1 ? "challenge" : "challenges"} icon={CheckCircle2} tone="bg-success/10 text-success-strong" />
            <StatCard label="XP" value={progressQuery.isLoading || totalXp === null ? "—" : formatNumber(totalXp)} detail="total earned" icon={Trophy} tone="bg-secondary text-primary" />
            <StatCard label="Current Streak" value={progressQuery.isLoading || !progressQuery.data ? "—" : `${progressQuery.data.streak.current_streak_days} days`} detail="keep it going" icon={Flame} tone="bg-warning/10 text-warning-strong" />
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200/90 bg-slate-50/80 p-4 shadow-sm sm:p-5" aria-label="Problem filters">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
          <label className="relative block min-w-0 flex-1 xl:max-w-[360px]">
            <span className="mb-1.5 block px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Search</span>
            <Search className="pointer-events-none absolute left-3 top-[calc(50%+10px)] size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search problems, topics..." className="h-10 rounded-xl border-border bg-white pl-9 shadow-none placeholder:text-muted-foreground focus-visible:ring-primary" />
          </label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:flex xl:flex-1 xl:justify-end">
            <FilterSelect label="Difficulty" icon={BarChart3} value={difficulty} onValueChange={(value) => setDifficulty(value as ProblemDifficulty | "all")} options={DIFFICULTIES.map((item) => ({ ...item, label: item.value === "all" ? `${item.label} (${data?.length ?? "—"})` : `${item.label} (${counts[item.value]})` }))} />
            <div className="col-span-2 flex min-w-0 flex-col gap-1.5 sm:col-span-2 xl:min-w-[220px]">
              <span className="flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"><ListFilter className="size-3.5" /> Status</span>
              <div className="grid h-10 grid-cols-3 rounded-xl border border-slate-200 bg-white p-1">
                {STATUS_OPTIONS.map((option) => (
                  <button key={option.value} type="button" onClick={() => setStatus(option.value)} aria-pressed={status === option.value} className={cn("rounded-lg px-2 text-xs font-semibold transition-all", status === option.value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-surface-3 hover:text-foreground")}>{option.label}</button>
                ))}
              </div>
            </div>
            <FilterSelect label="Tags" icon={Tag} value={tag} onValueChange={setTag} options={[{ value: "all", label: "All tags" }, ...tags.map((item) => ({ value: item, label: item }))]} />
            <FilterSelect label="Company" icon={Users} value={company} onValueChange={setCompany} options={[{ value: "all", label: "All companies" }, ...companies.map((item) => ({ value: item, label: item }))]} />
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 border-t border-slate-200/80 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Timer className="size-3.5" /> Sort by</span>
            <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
              <SelectTrigger className="h-8 w-[170px] rounded-lg border-slate-200 bg-white text-xs shadow-none"><SelectValue /></SelectTrigger>
              <SelectContent>{SORT_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
            </Select>
            {activeFilters.map((filter) => (
              <button key={filter.label} type="button" onClick={filter.clear} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 text-xs font-medium text-primary transition-colors hover:border-primary/40 hover:bg-primary/10">{filter.label}<span aria-hidden="true">×</span><span className="sr-only">Remove filter</span></button>
            ))}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={resetFilters} disabled={activeFilters.length === 0 && sort === "recommended"} className="shrink-0 gap-1.5 rounded-lg text-muted-foreground hover:bg-white hover:text-foreground"><RotateCcw className="size-3.5" /> Reset</Button>
        </div>
      </section>

      {data && data.length > 0 ? (
        <section className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]" aria-label="Practice queue">
          {(() => {
             const next = data.find((problem) => !solvedIdSet.has(problem.id)) ?? data[0];
            if (!next) return null;
            const topic = next?.topics[0];
            return (
              <Card className="relative overflow-hidden border-primary/15 bg-primary/[0.035] p-5 sm:p-6">
                <div className="absolute -right-12 -top-16 size-48 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
                <div className="relative flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary"><Sparkles className="size-3.5" /> Practice queue</p>
                    <h2 className="mt-2 font-display text-xl font-semibold">One focused challenge next</h2>
                    <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">Keep the session small. Start with an unsolved problem, then follow the topic into a short focused set.</p>
                  </div>
                  <Button size="sm" asChild><Link href={`/judge/${next.id}`}>Start challenge <ArrowUpRight /></Link></Button>
                </div>
                <div className="relative mt-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span className="rounded-full border border-primary/15 bg-primary/10 px-2.5 py-1 font-medium text-primary">{next.title}</span><span>{next.difficulty}</span>{topic ? <span>· {topic}</span> : null}</div>
              </Card>
            );
          })()}
          <Card className="p-5 sm:p-6">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary"><Flame className="size-3.5" /> Weak-topic practice</p>
            <h2 className="mt-2 font-display text-xl font-semibold">Turn gaps into reps</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Choose a topic to filter the queue and build confidence one pattern at a time.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[...new Set(data.flatMap((problem) => problem.topics))].slice(0, 4).map((item) => <Button key={item} variant="outline" size="sm" onClick={() => setTag(item)}>{item}</Button>)}
            </div>
          </Card>
        </section>
      ) : null}

      <div className="mt-8 flex items-center justify-between gap-3">
        <div>
          <p className="font-display text-lg font-semibold tracking-tight text-foreground">Explore challenges</p>
          <p className="mt-1 text-sm text-muted-foreground">{problemsLoading ? "Loading your practice set..." : `${filtered.length} ${filtered.length === 1 ? "problem" : "problems"} matching your filters`}</p>
        </div>
        <div className="hidden items-center gap-1.5 text-xs font-medium text-muted-foreground sm:flex"><Zap className="size-3.5 text-primary" /> New problems every week</div>
      </div>

      <div className="mx-auto mt-4 grid w-full max-w-[1120px] gap-4 md:grid-cols-2 xl:gap-5">
        {problemsLoading ? (
          <div className="md:col-span-2"><SkeletonProblemRows count={6} /></div>
        ) : isError ? (
          <div className="md:col-span-2"><ErrorState title="Judge unavailable" message={error instanceof Error ? error.message : "The judge demo data is unavailable."} code="JUDGE_ERR" onRetry={() => refetch()} /></div>
        ) : filtered.length === 0 ? (
          <div className="md:col-span-2">
            <EmptyState icon={CheckCircle2} title={status === "solved" ? "No solved Judge problems" : "No problems match these filters"} description={status === "solved" ? "Solve your first challenge and your accepted submissions will collect here." : "Try widening your search or resetting the filters."} primaryAction={<Button variant="gradient" size="sm" onClick={resetFilters}>Browse all problems</Button>} secondaryAction={<Button variant="outline" size="sm" asChild><Link href="/courses">Learn the fundamentals</Link></Button>} />
          </div>
        ) : (
           filtered.map((problem, index) => <ProblemCard key={problem.id} problem={problem} index={index} solved={solvedIdSet.has(problem.id)} />)
        )}
      </div>

      {DEMO_MODE ? (
        <div className="mt-8 flex items-start gap-3 rounded-xl border border-dashed border-border bg-surface-1/70 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          <SquareTerminal className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p><span className="font-semibold text-foreground">Demo mode:</span> use <code className="rounded bg-secondary px-1">raise </code>, <code className="rounded bg-secondary px-1">sleep(</code>, <code className="rounded bg-secondary px-1">wrong_answer</code>, or <code className="rounded bg-secondary px-1">compile_error</code> in the editor to explore each verdict.</p>
        </div>
      ) : null}
    </PageContainer>
  );
}

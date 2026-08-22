"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Clock3,
  GraduationCap,
  PlayCircle,
  Search,
  SearchX,
  Sparkles,
} from "lucide-react";

import type { MarketplaceCourse } from "@/lib/mocks/marketplace";
import {
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_COLLECTIONS,
  MARKETPLACE_COURSES,
  resolveCollection,
} from "@/lib/mocks/marketplace";
import { listMyLearning } from "@/lib/data/demo/content";
import { useSession } from "@/components/providers/session-provider";
import { useCartQuery } from "@/components/commerce/cart-query";
import { CourseRail } from "@/components/courses/marketplace/course-rail";
import { CourseCard } from "@/components/courses/marketplace/course-card";
import { CourseThumbnail } from "@/components/courses/marketplace/course-thumbnail";
import {
  CourseHoverPreviewProvider,
  MarketplaceStateProvider,
  type MarketplaceState,
} from "@/components/courses/marketplace/hover-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * Courses marketplace (Udemy-style) — the interactive composition behind
 * app/(app)/courses/page.tsx.
 *
 * Two modes driven entirely by URL state:
 * - Browse (default): merchandised hero + "continue learning" strip +
 *   curated collection rails with floating hover previews.
 * - Results (any ?q/?category/?level/?price present): filter toolbar +
 *   responsive card grid.
 */

const SORT_OPTIONS = [
  { value: "popular", label: "Most popular" },
  { value: "rating", label: "Highest rated" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]["value"];
type LevelFilter = "all" | "beginner" | "intermediate" | "advanced" | "expert";
type PriceFilter = "all" | "free" | "paid";

const LEVELS: { value: LevelFilter; label: string }[] = [
  { value: "all", label: "All levels" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "expert", label: "Expert" },
];

const PRICE_OPTIONS: { value: PriceFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "free", label: "Free" },
  { value: "paid", label: "Paid" },
];

const CATEGORY_CHIPS = MARKETPLACE_CATEGORIES.filter((c) => c !== "All").slice(0, 5);

/** Flagship covers used in the hero collage. */
const HERO_COVER_IDS = [
  "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
  "d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a",
  "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f",
] as const;

export function MarketplaceClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useSession();
  const userId = user?.id ?? "";

  const cartQuery = useCartQuery(userId);
  const learningQuery = useQuery({
    queryKey: ["my-learning", userId],
    queryFn: () => listMyLearning(userId),
    enabled: Boolean(userId),
  });

  /* Derived shared state ------------------------------------------------ */

  const cartProductIds = React.useMemo(
    () => new Set((cartQuery.data?.items ?? []).map((item) => item.product_id)),
    [cartQuery.data],
  );

  const progressPctByCourseId = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const item of learningQuery.data ?? []) {
      map.set(item.enrollment.course_id, item.enrollment.progress_pct);
    }
    return map;
  }, [learningQuery.data]);

  const courses = React.useMemo(() => {
    return MARKETPLACE_COURSES.map((course) => {
      const pct = progressPctByCourseId.get(course.id);
      if (pct === undefined) return course;
      return { ...course, progressPercent: Math.min(pct, 100) / 100 };
    });
  }, [progressPctByCourseId]);

  const marketplaceState = React.useMemo<MarketplaceState>(
    () => ({
      cartProductIds,
      enrolledCourseIds: new Set(progressPctByCourseId.keys()),
    }),
    [cartProductIds, progressPctByCourseId],
  );

  const continueLearning = React.useMemo(() => {
    return (learningQuery.data ?? [])
      .filter((item) => item.enrollment.status === "active")
      .sort((a, b) => b.enrollment.updated_at.localeCompare(a.enrollment.updated_at))
      .slice(0, 8)
      .map((item) => {
        const course = courses.find((c) => c.id === item.enrollment.course_id);
        if (!course) return null;
        return { course, progressPct: Math.min(item.enrollment.progress_pct, 100) };
      })
      .filter((entry): entry is { course: MarketplaceCourse; progressPct: number } => entry !== null);
  }, [courses, learningQuery.data]);

  /* URL-synced filters --------------------------------------------------- */

  const rawQ = searchParams.get("q")?.trim() ?? "";
  // "All" is the display label; "all" is the URL sentinel — accept both.
  const rawCategory = searchParams.get("category");
  const category = !rawCategory || rawCategory === "All" ? "all" : rawCategory;
  const level = parseLevel(searchParams.get("level"));
  const price = parsePrice(searchParams.get("price"));
  const sort = parseSort(searchParams.get("sort"));
  const isFiltering = rawQ !== "" || category !== "all" || level !== "all" || price !== "all";

  const setParam = React.useCallback(
    (key: string, value: string, fallback: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "" || value === fallback) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const clearFilters = React.useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  const results = React.useMemo(() => {
    let list = courses;
    if (isFiltering) {
      const needle = rawQ.toLowerCase();
      list = list.filter((course) => {
        if (category !== "all" && course.category !== category) return false;
        if (level !== "all" && course.level !== level) return false;
        if (price === "free" && !course.isFree) return false;
        if (price === "paid" && course.isFree) return false;
        if (needle) {
          const haystack =
            `${course.title} ${course.description} ${course.instructor} ${course.category} ${course.subcategory}`.toLowerCase();
          if (!haystack.includes(needle)) return false;
        }
        return true;
      });
    }

    const sorted = [...list];
    switch (sort) {
      case "rating":
        sorted.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
        break;
      case "newest":
        sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
      case "price-asc":
        sorted.sort((a, b) => a.priceCents - b.priceCents);
        break;
      case "price-desc":
        sorted.sort((a, b) => b.priceCents - a.priceCents);
        break;
      default:
        sorted.sort((a, b) => b.studentCount - a.studentCount);
    }
    return sorted;
  }, [category, courses, isFiltering, level, price, rawQ, sort]);

  /* Render ---------------------------------------------------------------- */

  return (
    <MarketplaceStateProvider value={marketplaceState}>
      <CourseHoverPreviewProvider>
        <div className="flex flex-col gap-8 pb-16">
          {isFiltering ? (
            <ResultsView
              results={results}
              totalCount={courses.length}
              q={rawQ}
              category={category}
              level={level}
              price={price}
              sort={sort}
              onSearch={setParam}
              onSelect={setParam}
              onClear={clearFilters}
            />
          ) : (
            <>
              <MarketplaceHero />
              {continueLearning.length > 0 ? (
                <ContinueLearningStrip entries={continueLearning} />
              ) : null}
              <div className="flex flex-col gap-9">
                {MARKETPLACE_COLLECTIONS.map((collection) => (
                  <CourseRail
                    key={collection.id}
                    title={collection.title}
                    description={collection.subtitle}
                    courses={resolveCollection(collection)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </CourseHoverPreviewProvider>
    </MarketplaceStateProvider>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero                                                               */
/* ------------------------------------------------------------------ */

function MarketplaceHero() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    router.replace(trimmed ? `/courses?q=${encodeURIComponent(trimmed)}` : "/courses");
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-card">
      {/* Backdrop layers */}
      <div className="absolute inset-0 aurora opacity-70" aria-hidden="true" />
      <div className="absolute inset-0 bg-grid-dark opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" aria-hidden="true" />

      <div className="relative grid gap-8 p-7 sm:p-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:p-12">
        <div className="max-w-2xl">
          <Badge variant="outline" className="gap-1.5 rounded-full bg-background/70 px-3 py-1 backdrop-blur">
            <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
            New · The Zapsters course marketplace
          </Badge>

          <h1 className="mt-4 font-display text-h1 font-semibold leading-[1.05] tracking-tight text-foreground">
            Learn the skills that{" "}
            <span className="bg-gradient-to-r from-primary to-primary-deep bg-clip-text text-transparent">
              break barriers
            </span>
            .
          </h1>
          <p className="mt-3 max-w-xl text-body leading-relaxed text-muted-foreground">
            {MARKETPLACE_COURSES.length}+ expert-led courses across security, engineering and AI —
            with hands-on labs, real projects and lifetime access.
          </p>

          <form onSubmit={submit} role="search" className="mt-6 flex max-w-xl gap-2">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder='Search 40+ courses — try "wireshark" or "kubernetes"'
                aria-label="Search courses"
                className="h-12 rounded-xl bg-background/80 pl-10 text-base shadow-sm backdrop-blur"
              />
            </div>
            <Button type="submit" size="lg" className="h-12 rounded-xl px-6">
              Search
            </Button>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-caption font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Popular:
            </span>
            {CATEGORY_CHIPS.map((chip) => (
              <Button key={chip} variant="secondary" size="sm" className="rounded-full" asChild>
                <Link href={`/courses?category=${encodeURIComponent(chip)}`}>{chip}</Link>
              </Button>
            ))}
          </div>

          <p className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <GraduationCap className="size-4 text-primary" aria-hidden="true" />
              Industry practitioners as instructors
            </span>
            <span aria-hidden="true">·</span>
            <span>Labs, projects &amp; assessments included</span>
            <span aria-hidden="true">·</span>
            <span>30-day refund guarantee</span>
          </p>
        </div>

        {/* Cover collage */}
        <div className="relative hidden h-[280px] w-[320px] shrink-0 lg:block" aria-hidden="true">
          <div className="absolute left-0 top-6 w-[220px] rotate-[-8deg] overflow-hidden rounded-xl border border-border shadow-[0_18px_44px_rgb(17_24_39_/_0.22)] transition-transform duration-300 ease-out hover:rotate-[-4deg]">
            <div className="aspect-video">
              <CourseThumbnail courseId={HERO_COVER_IDS[1]!} category="Cybersecurity" />
            </div>
          </div>
          <div className="absolute right-0 top-0 w-[220px] rotate-[6deg] overflow-hidden rounded-xl border border-border shadow-[0_18px_44px_rgb(17_24_39_/_0.22)] transition-transform duration-300 ease-out hover:rotate-[2deg]">
            <div className="aspect-video">
              <CourseThumbnail courseId={HERO_COVER_IDS[2]!} category="Web Development" />
            </div>
          </div>
          <div className="absolute bottom-0 left-16 w-[240px] rotate-[-2deg] overflow-hidden rounded-xl border-2 border-primary/40 shadow-[0_24px_56px_rgb(17_24_39_/_0.28)] ring-4 ring-primary/10 transition-transform duration-300 ease-out hover:rotate-0">
            <div className="aspect-video">
              <CourseThumbnail courseId={HERO_COVER_IDS[0]!} category="Cybersecurity" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Continue learning                                                  */
/* ------------------------------------------------------------------ */

function ContinueLearningStrip({
  entries,
}: {
  entries: { course: MarketplaceCourse; progressPct: number }[];
}) {
  if (entries.length === 0) return null;

  return (
    <section aria-label="Continue learning" className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="font-display text-h4 font-semibold tracking-tight text-foreground">
          Continue learning
        </h2>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/my-learning">
            My learning
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      <div className="rail-scroll -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1">
        {entries.map(({ course, progressPct }) => (
          <div
            key={course.id}
            className="group/tile flex w-[320px] shrink-0 snap-start items-center gap-3 rounded-xl border border-border bg-background p-3 transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-[0_10px_28px_rgb(17_24_39_/_0.12)]"
          >
            <Link
              href={`/courses/${course.id}/learn`}
              className="relative block w-24 shrink-0 overflow-hidden rounded-lg"
              aria-label={`Resume ${course.title}`}
            >
              <div className="aspect-video">
                <CourseThumbnail courseId={course.id} category={course.category} />
              </div>
              <span className="absolute inset-0 grid place-items-center bg-black/25 opacity-0 transition-opacity group-hover/tile:opacity-100">
                <PlayCircle className="size-7 text-white drop-shadow" aria-hidden="true" />
              </span>
            </Link>

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-small font-semibold text-foreground">{course.title}</h3>
              <p className="mt-0.5 flex items-center gap-1 text-caption text-muted-foreground">
                <Clock3 className="size-3" aria-hidden="true" />
                {Math.max(course.durationHours - (course.durationHours * progressPct) / 100, 0.5).toFixed(1)}h
                left · {progressPct}%
              </p>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={progressPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${course.title} progress`}
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-[width]",
                    progressPct >= 100 ? "bg-success-strong" : "bg-primary",
                  )}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            <Button size="icon-sm" className="shrink-0 rounded-full" asChild>
              <Link href={`/courses/${course.id}/learn`} aria-label={`Resume ${course.title}`}>
                <PlayCircle className="size-4" />
              </Link>
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Results (filtered) view                                            */
/* ------------------------------------------------------------------ */

interface ResultsViewProps {
  results: MarketplaceCourse[];
  totalCount: number;
  q: string;
  category: string;
  level: LevelFilter;
  price: PriceFilter;
  sort: SortKey;
  onSearch: (key: string, value: string, fallback: string) => void;
  onSelect: (key: string, value: string, fallback: string) => void;
  onClear: () => void;
}

function ResultsView({
  results,
  totalCount,
  q,
  category,
  level,
  price,
  sort,
  onSearch,
  onSelect,
  onClear,
}: ResultsViewProps) {
  const [searchInput, setSearchInput] = React.useState(q);
  const [prevQuery, setPrevQuery] = React.useState(q);

  // Keep the field in sync with external URL changes (clear-all, back nav).
  // Render-time adjustment — the documented alternative to setState-in-effect.
  if (q !== prevQuery) {
    setPrevQuery(q);
    setSearchInput(q);
  }

  // Debounced commit so typing feels live without spamming history.
  React.useEffect(() => {
    if (searchInput.trim() === q) return;
    const timer = window.setTimeout(() => {
      onSearch("q", searchInput.trim(), "");
    }, 250);
    return () => window.clearTimeout(timer);
  }, [onSearch, q, searchInput]);

  const hasActiveFilters = q !== "" || category !== "all" || level !== "all" || price !== "all";

  return (
    <div className="flex flex-col gap-5 pt-2">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative w-full max-w-md flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search courses…"
            aria-label="Search courses"
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={category === "all" ? "all" : category} onValueChange={(value) => onSelect("category", value, "all")}>
            <SelectTrigger className="w-[180px]" aria-label="Filter by category">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {MARKETPLACE_CATEGORIES.filter((name) => name !== "All").map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={level} onValueChange={(value) => onSelect("level", value, "all")}>
            <SelectTrigger className="w-[160px]" aria-label="Filter by level">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              {LEVELS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div
            role="group"
            aria-label="Filter by price"
            className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/60 p-0.5"
          >
            {PRICE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={price === option.value}
                onClick={() => onSelect("price", option.value, "all")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-caption font-medium transition-colors",
                  price === option.value
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <Select value={sort} onValueChange={(value) => onSelect("sort", value, "popular")}>
            <SelectTrigger className="ml-auto w-[190px]" aria-label="Sort results">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters ? (
            <Button variant="ghost" size="sm" onClick={onClear}>
              Clear all
            </Button>
          ) : null}
        </div>
      </div>

      <p className="text-small text-muted-foreground" aria-live="polite">
        {results.length === 0
          ? "No courses match your filters."
          : `${results.length} of ${totalCount} course${totalCount === 1 ? "" : "s"}`}
        {q ? (
          <>
            {" "}
            for <span className="font-semibold text-foreground">&ldquo;{q}&rdquo;</span>
          </>
        ) : null}
      </p>

      {results.length === 0 ? (
        <EmptyResults onClear={onClear} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {results.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 py-20 text-center">
      <SearchX className="size-10 text-muted-foreground/60" aria-hidden="true" />
      <h2 className="font-display text-h4 font-semibold text-foreground">No matching courses</h2>
      <p className="max-w-sm text-small text-muted-foreground">
        Try different keywords, or remove some filters to browse the full catalog.
      </p>
      <Button variant="outline" size="sm" onClick={onClear} className="mt-1">
        Clear filters
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Param parsing helpers                                              */
/* ------------------------------------------------------------------ */

function parseLevel(value: string | null): LevelFilter {
  return LEVELS.some((l) => l.value === value) ? (value as LevelFilter) : "all";
}

function parsePrice(value: string | null): PriceFilter {
  return value === "free" || value === "paid" ? value : "all";
}

function parseSort(value: string | null): SortKey {
  return SORT_OPTIONS.some((s) => s.value === value) ? (value as SortKey) : "popular";
}

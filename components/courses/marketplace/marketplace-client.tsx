"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Compass,
  Filter,
  GraduationCap,
  PlayCircle,
  RotateCcw,
  Search,
  SearchX,
  X,
} from "lucide-react";

import type { MarketplaceCourse } from "@/lib/mocks/marketplace";
import {
  MARKETPLACE_COURSES,
} from "@/lib/mocks/marketplace";
import { listMyLearning } from "@/lib/data/demo/content";
import { useSession } from "@/components/providers/session-provider";
import { useCartQuery } from "@/components/commerce/cart-query";
import { CourseCard } from "@/components/courses/marketplace/course-card";
import {
  EnterpriseFilterRail,
  type EnterpriseFilterState,
} from "@/components/courses/marketplace/enterprise-filter-rail";
import {
  MarketplaceStateProvider,
  type MarketplaceState,
} from "@/components/courses/marketplace/hover-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * Zapsters Academy Course Discovery & Catalog.
 *
 * Modeled after AWS Skill Builder and IBM SkillsBuild:
 * - Enterprise header with search and domain shortcuts
 * - Active "Continue Learning" strip for enrolled learners
 * - Faceted filter rail with domain, skill level, format, duration, credential, and price
 * - Active filter chips with individual dismiss and clear-all
 * - 10-point information hierarchy course cards in responsive grid
 * - Pagination controls supporting full catalog exploration
 * - Restrained, monochromatic design system (Geist & Inter)
 */

const SORT_OPTIONS = [
  { value: "popular", label: "Most popular" },
  { value: "rating", label: "Highest rated" },
  { value: "newest", label: "Newest" },
  { value: "title-asc", label: "Title: A to Z" },
  { value: "duration-asc", label: "Duration: Shortest" },
  { value: "duration-desc", label: "Duration: Longest" },
  { value: "price-asc", label: "Price: Low to high" },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]["value"];
type LevelFilter = "all" | "beginner" | "intermediate" | "advanced";
type PriceFilter = "all" | "free" | "paid";

const DOMAIN_SHORTCUTS = [
  { value: "all", label: "All Domains" },
  { value: "Cloud & DevOps", label: "Cloud & Infrastructure" },
  { value: "Cybersecurity", label: "Cyber Defense" },
  { value: "AI & ML", label: "AI & Machine Learning" },
  { value: "Systems", label: "Systems Architecture" },
  { value: "Web Development", label: "Full-Stack Web" },
];

const COURSES_PER_PAGE = 12;

export function MarketplaceClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useSession();
  const userId = user?.id ?? "";

  const [mobileFilterOpen, setMobileFilterOpen] = React.useState(false);

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
      .slice(0, 4)
      .map((item) => {
        const course = courses.find((c) => c.id === item.enrollment.course_id);
        if (!course) return null;
        return { course, progressPct: Math.min(item.enrollment.progress_pct, 100) };
      })
      .filter((entry): entry is { course: MarketplaceCourse; progressPct: number } => entry !== null);
  }, [courses, learningQuery.data]);

  /* URL-synced filters --------------------------------------------------- */

  const rawQ = searchParams.get("q")?.trim() ?? "";
  const rawCategory = searchParams.get("category");
  const category = !rawCategory || rawCategory === "All" ? "all" : rawCategory;
  const level = parseLevel(searchParams.get("level"));
  const price = parsePrice(searchParams.get("price"));
  const sort = parseSort(searchParams.get("sort"));
  const hasBadge = searchParams.get("badge") === "true";
  const format = searchParams.get("format") ?? "all";
  const duration = searchParams.get("duration") ?? "all";
  const currentPage = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);

  const [searchInput, setSearchInput] = React.useState(rawQ);
  const [prevQuery, setPrevQuery] = React.useState(rawQ);

  if (rawQ !== prevQuery) {
    setPrevQuery(rawQ);
    setSearchInput(rawQ);
  }

  const setParam = React.useCallback(
    (key: string, value: string, fallback: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "" || value === fallback) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      // Reset page to 1 when filters change (unless page itself is changing)
      if (key !== "page") {
        params.delete("page");
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const clearFilters = React.useCallback(() => {
    router.replace(pathname, { scroll: false });
    setSearchInput("");
  }, [pathname, router]);

  // Debounced search input sync
  React.useEffect(() => {
    if (searchInput.trim() === rawQ) return;
    const timer = window.setTimeout(() => {
      setParam("q", searchInput.trim(), "");
    }, 250);
    return () => window.clearTimeout(timer);
  }, [rawQ, searchInput, setParam]);

  /* Filtering & sorting -------------------------------------------------- */

  const results = React.useMemo(() => {
    let list = courses;
    const needle = rawQ.toLowerCase();

    list = list.filter((course) => {
      if (category !== "all") {
        if (course.category.toLowerCase() !== category.toLowerCase()) return false;
      }
      if (level !== "all" && course.level !== level) return false;
      if (price === "free" && !course.isFree) return false;
      if (price === "paid" && course.isFree) return false;
      if (hasBadge && !course.badge) return false;

      if (duration === "under-2" && course.durationHours >= 2) return false;
      if (duration === "2-to-5" && (course.durationHours < 2 || course.durationHours > 5)) return false;
      if (duration === "5-to-10" && (course.durationHours < 5 || course.durationHours > 10)) return false;
      if (duration === "over-10" && course.durationHours <= 10) return false;

      if (format === "lab" && course.type !== "lab" && !course.title.toLowerCase().includes("lab")) return false;
      if (format === "digital" && course.type !== "video") return false;
      if (format === "project" && course.type !== "project") return false;
      if (format === "assessment" && course.type !== "assessment") return false;

      if (needle) {
        const haystack =
          `${course.title} ${course.description} ${course.instructor} ${course.category} ${course.subcategory} ${(course.skills || []).join(" ")}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });

    const sorted = [...list];
    switch (sort) {
      case "rating":
        sorted.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
        break;
      case "newest":
        sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
      case "title-asc":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "duration-asc":
        sorted.sort((a, b) => a.durationHours - b.durationHours);
        break;
      case "duration-desc":
        sorted.sort((a, b) => b.durationHours - a.durationHours);
        break;
      case "price-asc":
        sorted.sort((a, b) => a.priceCents - b.priceCents);
        break;
      default:
        sorted.sort((a, b) => b.studentCount - a.studentCount);
    }
    return sorted;
  }, [category, courses, duration, format, hasBadge, level, price, rawQ, sort]);

  // Category counts based on active search
  const categoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of courses) {
      counts[c.category] = (counts[c.category] || 0) + 1;
    }
    return counts;
  }, [courses]);

  // Pagination calculation
  const totalCourses = results.length;
  const totalPages = Math.max(1, Math.ceil(totalCourses / COURSES_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedCourses = React.useMemo(() => {
    const start = (safePage - 1) * COURSES_PER_PAGE;
    return results.slice(start, start + COURSES_PER_PAGE);
  }, [results, safePage]);

  const hasActiveFilters =
    rawQ !== "" ||
    category !== "all" ||
    level !== "all" ||
    price !== "all" ||
    hasBadge ||
    format !== "all" ||
    duration !== "all";

  const filterState: EnterpriseFilterState = {
    domain: category,
    format,
    level,
    hasBadge,
    duration,
    price,
  };

  const handleFilterChange = (key: keyof EnterpriseFilterState, val: string | boolean) => {
    if (key === "domain") setParam("category", String(val), "all");
    else if (key === "hasBadge") setParam("badge", val ? "true" : "", "");
    else setParam(key, String(val), "all");
  };

  return (
    <MarketplaceStateProvider value={marketplaceState}>
      <div className="mx-auto w-full max-w-7xl flex flex-col gap-8 px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        {/* A. Page Header (Enterprise restrained layout) */}
        <section aria-labelledby="catalog-heading" className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1
                  id="catalog-heading"
                  className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl"
                >
                  Explore Courses
                </h1>
                <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground leading-relaxed sm:text-base">
                  Explore accredited engineering courses, interactive labs, and verified skill credentials across cloud, cyber defense, systems, and AI.
                </p>
              </div>

              {/* Secondary Navigation shortcuts */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/learning-paths" className="inline-flex items-center gap-1.5 text-xs font-semibold">
                    <Compass className="size-3.5" aria-hidden="true" />
                    Role Pathways
                  </Link>
                </Button>
                {userId && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs font-semibold">
                      <GraduationCap className="size-3.5" aria-hidden="true" />
                      My Learning
                    </Link>
                  </Button>
                )}
              </div>
            </div>

            {/* Prominent Search Bar */}
            <div className="relative mt-4 w-full">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search courses by title, topic, skill, or instructor…"
                aria-label="Search courses"
                className="h-11 w-full pl-10 pr-10 text-sm bg-card border-border shadow-xs"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    setParam("q", "", "");
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search input"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Category Shortcuts / Quick Domain Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 -mx-1 px-1 text-xs">
              {DOMAIN_SHORTCUTS.map((item) => {
                const isSelected = category.toLowerCase() === item.value.toLowerCase();
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setParam("category", item.value, "all")}
                    className={cn(
                      "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors border",
                      isSelected
                        ? "border-foreground bg-foreground text-background font-semibold"
                        : "border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Continue Learning Strip (if enrolled courses exist) */}
        {continueLearning.length > 0 && !hasActiveFilters && (
          <section
            aria-label="Continue your in-progress courses"
            className="rounded-xl border border-border bg-card p-5"
          >
            <div className="mb-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="size-4 text-foreground" aria-hidden="true" />
                <h2 className="font-display text-sm font-bold tracking-tight text-foreground">
                  In Progress ({continueLearning.length})
                </h2>
              </div>
              <Link
                href="/dashboard"
                className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
              >
                All enrolled courses <ArrowRight className="size-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {continueLearning.map(({ course, progressPct }) => (
                <div
                  key={course.id}
                  className="group flex flex-col justify-between rounded-lg border border-border/80 bg-surface-1 p-3.5 transition-colors hover:border-border-strong"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                      {course.category}
                    </span>
                    <h3 className="line-clamp-1 font-display text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                      {course.title}
                    </h3>
                  </div>

                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{progressPct}% completed</span>
                      <span className="font-medium text-foreground">{course.durationHours}h total</span>
                    </div>
                    <Button size="sm" variant="default" className="w-full text-xs h-7 font-semibold" asChild>
                      <Link href={`/courses/${course.id}/learn`}>
                        <PlayCircle className="size-3.5 mr-1" />
                        Resume
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* B. Course Discovery Controls & Catalog Grid */}
        <div className="flex flex-col gap-5 min-w-0">
          {/* Discovery Control Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
            {/* Filter Sheet Trigger */}
            <div>
              <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 text-xs font-medium">
                    <Filter className="size-3.5" />
                    Filter Courses
                    {hasActiveFilters && (
                      <span className="size-2 rounded-full bg-primary" />
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-full max-w-xs p-5 overflow-y-auto">
                  <SheetHeader className="mb-4 text-left">
                    <SheetTitle className="font-display text-base">Filter Courses</SheetTitle>
                    <SheetDescription className="text-xs">
                      Refine results by domain, level, format, and duration.
                    </SheetDescription>
                  </SheetHeader>
                  <EnterpriseFilterRail
                    filters={filterState}
                    onFilterChange={(k, v) => {
                      handleFilterChange(k, v);
                      setMobileFilterOpen(false);
                    }}
                    onClearFilters={() => {
                      clearFilters();
                      setMobileFilterOpen(false);
                    }}
                    totalResults={courses.length}
                    categoryCounts={categoryCounts}
                    className="border-0 p-0 shadow-none bg-transparent"
                  />
                </SheetContent>
              </Sheet>
            </div>

              {/* Course match count */}
              <div className="text-xs text-muted-foreground" aria-live="polite">
                {totalCourses === 0 ? (
                  <span>No courses found</span>
                ) : (
                  <span>
                    Showing{" "}
                    <strong className="font-semibold text-foreground">
                      {(safePage - 1) * COURSES_PER_PAGE + 1}–
                      {Math.min(safePage * COURSES_PER_PAGE, totalCourses)}
                    </strong>{" "}
                    of <strong className="font-semibold text-foreground">{totalCourses}</strong> courses
                    {rawQ && (
                      <>
                        {" "}
                        matching &ldquo;<span className="text-foreground">{rawQ}</span>&rdquo;
                      </>
                    )}
                  </span>
                )}
              </div>

              {/* Sort selector */}
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-muted-foreground hidden sm:inline">Sort:</span>
                <Select value={sort} onValueChange={(val) => setParam("sort", val, "popular")}>
                  <SelectTrigger className="h-8 w-[170px] text-xs bg-card" aria-label="Sort courses">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {SORT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active Filter Chips */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Active:</span>

                {rawQ && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-xs text-foreground">
                    Keyword: &ldquo;{rawQ}&rdquo;
                    <button
                      type="button"
                      onClick={() => {
                        setSearchInput("");
                        setParam("q", "", "");
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                )}

                {category !== "all" && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-xs text-foreground">
                    Domain: {category}
                    <button
                      type="button"
                      onClick={() => setParam("category", "all", "all")}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                )}

                {level !== "all" && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-xs text-foreground capitalize">
                    Level: {level}
                    <button
                      type="button"
                      onClick={() => setParam("level", "all", "all")}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                )}

                {format !== "all" && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-xs text-foreground capitalize">
                    Format: {format}
                    <button
                      type="button"
                      onClick={() => setParam("format", "all", "all")}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                )}

                {duration !== "all" && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-xs text-foreground">
                    Duration: {duration}
                    <button
                      type="button"
                      onClick={() => setParam("duration", "all", "all")}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                )}

                {hasBadge && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-xs text-foreground">
                    Verifiable Badge
                    <button
                      type="button"
                      onClick={() => setParam("badge", "", "")}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                )}

                {price !== "all" && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-xs text-foreground capitalize">
                    {price}
                    <button
                      type="button"
                      onClick={() => setParam("price", "all", "all")}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear all
                </Button>
              </div>
            )}

            {/* C & D. Course Cards Grid / Empty State */}
            {results.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card/60 py-16 text-center">
                <SearchX className="size-10 text-muted-foreground/60" aria-hidden="true" />
                <h2 className="font-display text-base font-bold text-foreground">
                  No courses match your criteria
                </h2>
                <p className="max-w-md text-xs text-muted-foreground leading-relaxed">
                  Try broadening your search keywords or resetting some filters to explore our full curriculum of engineering and cloud courses.
                </p>
                <Button variant="outline" size="sm" onClick={clearFilters} className="mt-2 text-xs">
                  <RotateCcw className="mr-1.5 size-3" />
                  Clear all filters
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {pagedCourses.map((course) => (
                    <CourseCard key={course.id} course={course} />
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <nav
                    aria-label="Catalog pagination"
                    className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-6"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={safePage <= 1}
                      onClick={() => setParam("page", String(safePage - 1), "1")}
                      className="text-xs gap-1"
                    >
                      <ChevronLeft className="size-3.5" />
                      Previous
                    </Button>

                    <div className="flex items-center gap-1 text-xs">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                        const isCurrent = p === safePage;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setParam("page", String(p), "1")}
                            className={cn(
                              "size-8 rounded-md text-xs font-medium transition-colors",
                              isCurrent
                                ? "bg-foreground text-background font-bold"
                                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                            )}
                            aria-current={isCurrent ? "page" : undefined}
                          >
                            {p}
                          </button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={safePage >= totalPages}
                      onClick={() => setParam("page", String(safePage + 1), "1")}
                      className="text-xs gap-1"
                    >
                      Next
                      <ChevronRight className="size-3.5" />
                    </Button>
                  </nav>
                )}
              </>
            )}
          </div>
      </div>
    </MarketplaceStateProvider>
  );
}

/* ------------------------------------------------------------------ */
/*  Param parsing helpers                                              */
/* ------------------------------------------------------------------ */

function parseLevel(value: string | null): LevelFilter {
  return value === "beginner" || value === "intermediate" || value === "advanced"
    ? value
    : "all";
}

function parsePrice(value: string | null): PriceFilter {
  return value === "free" || value === "paid" ? value : "all";
}

function parseSort(value: string | null): SortKey {
  return SORT_OPTIONS.some((s) => s.value === value) ? (value as SortKey) : "popular";
}

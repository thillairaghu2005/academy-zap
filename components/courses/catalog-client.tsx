"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  BookOpen,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  Clock3,
  LayoutGrid,
  LoaderCircle,
  List,
  Search,
  Star,
  Users,
  X,
} from "lucide-react";

import type {
  CareerTrack,
  CourseFormat,
  CourseLevel,
  CourseSort,
  CourseSummary,
  DurationFilter,
} from "@/lib/contracts/content";
import type { CatalogProduct } from "@/lib/contracts/commerce";
import { searchCatalog } from "@/lib/api/content";
import { listCatalogProducts } from "@/lib/api/commerce";
import { DEMO_MODE } from "@/lib/config";
import { AddToCartButton } from "@/components/commerce/add-to-cart-button";
import { BuyNowButton } from "@/components/commerce/buy-now-button";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageContainer } from "@/components/shared/page-container";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SkeletonCourseGrid } from "@/components/shared/skeletons";

/*
 * Catalog UX spec, distilled from the supplied reference:
 * - The eye lands on the title, then the single dominant search field, then
 *   the compact filter row and finally the course cards.
 * - Search, filters, and categories share one vertical control stack, so the
 *   refinement path reads as one connected block instead of scattered tools.
 * - Tight spacing and a high-information card grid avoid dead zones without
 *   making each control compete with the content.
 * - Cards begin immediately after the count, keeping useful content within
 *   the first viewport rather than adding promotional chrome.
 * - Filters are subordinate to search; category pills are lighter and
 *   tertiary, sitting between refinement and results.
 */

const LEVELS: { value: CourseLevel | "all"; label: string }[] = [
  { value: "all", label: "All levels" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const DURATIONS: { value: DurationFilter | "all"; label: string }[] = [
  { value: "all", label: "Any duration" },
  { value: "under_2", label: "Under 2 hrs" },
  { value: "2_to_5", label: "2–5 hrs" },
  { value: "5_to_10", label: "5–10 hrs" },
  { value: "over_10", label: "10+ hrs" },
];

const FORMATS: { value: CourseFormat | "all"; label: string }[] = [
  { value: "all", label: "All formats" },
  { value: "video", label: "Video" },
  { value: "interactive", label: "Interactive" },
  { value: "lab", label: "Lab" },
  { value: "project", label: "Project" },
  { value: "judge", label: "Judge" },
];

const CAREER_TRACKS: { value: CareerTrack | "all"; label: string }[] = [
  { value: "all", label: "All career tracks" },
  { value: "cyber_security", label: "Cyber Security" },
  { value: "web_development", label: "Web Development" },
  { value: "ai_ml", label: "AI / ML" },
  { value: "cloud", label: "Cloud" },
  { value: "data_science", label: "Data Science" },
  { value: "game_dev", label: "Game Dev" },
  { value: "interview_prep", label: "Interview Prep" },
];

const SORT_OPTIONS: { value: CourseSort; label: string }[] = [
  { value: "popular", label: "Most popular" },
  { value: "rated", label: "Highest rated" },
  { value: "newest", label: "Newest" },
  { value: "recommended", label: "Recommended" },
  { value: "shortest", label: "Shortest first" },
];

const CATEGORIES = [
  "All",
  "Cybersecurity",
  "Programming",
  "Web Development",
  "Cloud",
  "AI",
  "DevOps",
  "Networking",
];

interface CatalogFilterValues {
  price: "free" | "paid" | "all";
  level: CourseLevel | "all";
  duration: DurationFilter | "all";
  format: CourseFormat | "all";
  careerTrack: CareerTrack | "all";
  projectBased: boolean;
  certificateIncluded: boolean;
  minRating: number;
}

function SearchBar({
  value,
  onChange,
  onClear,
}: {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        name="q"
        type="search"
        aria-label="Search courses"
        placeholder={
          DEMO_MODE
            ? 'Search by title or skill… (try "security", "zzzz" for empty)'
            : "Search by title or skill…"
        }
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-14 rounded-2xl border-border bg-card pl-11 pr-11 text-[15px] shadow-[0_8px_24px_rgb(17_24_39_/_5%)] placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10"
      />
      {value ? (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Clear search"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onValueChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onValueChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        aria-label={`Filter courses by ${label.toLowerCase()}`}
        className="h-10 w-full rounded-xl border-border bg-card px-3 text-[13px] text-foreground shadow-sm focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 sm:w-auto sm:min-w-[128px]"
      >
        <span className="sr-only">{label}: </span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="rounded-xl border-border bg-card text-foreground shadow-[0_16px_40px_rgb(17_24_39_/_12%)]">
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="rounded-lg focus:bg-accent focus:text-foreground"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ActiveFilter({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-primary/15 bg-primary/5 px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {label}
      <X className="size-3" aria-hidden="true" />
      <span className="sr-only">Remove filter</span>
    </button>
  );
}

function FilterToolbar({
  values,
  sort,
  onPrice,
  onLevel,
  onDuration,
  onFormat,
  onCareerTrack,
  onProjectBased,
  onCertificateIncluded,
  onRating,
  onSort,
  activeFilters,
  onClearAll,
}: {
  values: CatalogFilterValues;
  sort: CourseSort;
  onPrice: (value: CatalogFilterValues["price"]) => void;
  onLevel: (value: CatalogFilterValues["level"]) => void;
  onDuration: (value: CatalogFilterValues["duration"]) => void;
  onFormat: (value: CatalogFilterValues["format"]) => void;
  onCareerTrack: (value: CatalogFilterValues["careerTrack"]) => void;
  onProjectBased: () => void;
  onCertificateIncluded: () => void;
  onRating: (value: number) => void;
  onSort: (value: CourseSort) => void;
  activeFilters: { label: string; onRemove: () => void }[];
  onClearAll: () => void;
}) {
  return (
    <section
      aria-label="Course filters"
      className="rounded-2xl border border-border bg-surface-1 p-3 shadow-[0_8px_24px_rgb(17_24_39_/_4%)] sm:p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          label="Level"
          value={values.level}
          options={LEVELS}
          onValueChange={(value) => onLevel(value as CatalogFilterValues["level"])}
        />
        <FilterSelect
          label="Price"
          value={values.price}
          options={[
            { value: "all", label: "All prices" },
            { value: "free", label: "Free" },
            { value: "paid", label: "Paid" },
          ]}
          onValueChange={(value) => onPrice(value as CatalogFilterValues["price"])}
        />
        <FilterSelect
          label="Duration"
          value={values.duration}
          options={DURATIONS}
          onValueChange={(value) => onDuration(value as CatalogFilterValues["duration"])}
        />
        <FilterSelect
          label="Format"
          value={values.format}
          options={FORMATS}
          onValueChange={(value) => onFormat(value as CatalogFilterValues["format"])}
        />
        <FilterSelect
          label="Rating"
          value={String(values.minRating)}
          options={[
            { value: "0", label: "Any rating" },
            { value: "4", label: "4.0+ rating" },
            { value: "4.5", label: "4.5+ rating" },
          ]}
          onValueChange={(value) => onRating(Number(value))}
        />
        <FilterSelect
          label="Sort"
          value={sort}
          options={SORT_OPTIONS}
          onValueChange={(value) => onSort(value as CourseSort)}
        />
      </div>

      <details className="group mt-3 border-t border-border pt-3">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          More filters
          <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <FilterSelect
            label="Career track"
            value={values.careerTrack}
            options={CAREER_TRACKS}
            onValueChange={(value) => onCareerTrack(value as CatalogFilterValues["careerTrack"])}
          />
          <button
            type="button"
            aria-pressed={values.projectBased}
            onClick={onProjectBased}
             className={`h-10 rounded-full border px-3.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${values.projectBased ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-card text-foreground hover:bg-accent"}`}
          >
            Project-based
          </button>
          <button
            type="button"
            aria-pressed={values.certificateIncluded}
            onClick={onCertificateIncluded}
             className={`h-10 rounded-full border px-3.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${values.certificateIncluded ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-card text-foreground hover:bg-accent"}`}
          >
            Certificate included
          </button>
        </div>
      </details>

      {activeFilters.length > 0 ? (
         <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3" aria-label="Active course filters">
          {activeFilters.map((filter) => (
            <ActiveFilter key={filter.label} {...filter} />
          ))}
          <button
            type="button"
            onClick={onClearAll}
             className="h-8 px-1 text-xs font-semibold text-muted-foreground underline decoration-border-strong underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Clear all
          </button>
        </div>
      ) : null}
    </section>
  );
}

function CategoryPills({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <nav aria-label="Course categories" className="-mx-1 overflow-x-auto px-1 pb-1">
      <div className="flex min-w-max gap-2">
        {CATEGORIES.map((category) => {
          const active = value === category;
          return (
            <button
              key={category}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(category)}
               className={`h-10 rounded-full border px-4 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:bg-accent hover:text-primary"}`}
            >
              {category}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function ResultCount({ count, query }: { count: number; query?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <p className="text-sm text-muted-foreground">
        Showing <strong className="font-semibold text-foreground">{count}</strong> {count === 1 ? "course" : "courses"}
        {query ? <span> for &quot;{query}&quot;</span> : null}
      </p>
    </div>
  );
}

function CourseCard({
  course,
  product,
  view = "grid",
}: {
  course: CourseSummary;
  product?: CatalogProduct;
  view?: "grid" | "list";
}) {
  const difficulty = course.level.charAt(0).toUpperCase() + course.level.slice(1);
  const [saved, setSaved] = React.useState(false);

  return (
    <Card
      variant="glow"
      className={`group flex h-full flex-col overflow-hidden rounded-3xl border-border bg-card shadow-[0_8px_26px_rgb(17_24_39_/_5%)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-[0_18px_44px_rgb(17_24_39_/_10%)] ${view === "list" ? "sm:flex-row sm:flex-wrap" : ""}`}
    >
      <div className={`relative h-48 overflow-hidden bg-surface-1 ${view === "list" ? "sm:h-auto sm:min-h-[220px] sm:w-64 sm:shrink-0" : ""}`}>
        <Link
          href={`/courses/${course.id}`}
          className="absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <div className="absolute inset-0 aurora opacity-70 transition-transform duration-700 group-hover:scale-105" aria-hidden="true" />
          <div className="absolute inset-0 bg-grid opacity-60" aria-hidden="true" />
          <div className="absolute -right-8 -top-14 size-44 rounded-full border border-primary/20 bg-primary/5 transition-transform duration-700 group-hover:translate-x-2 group-hover:translate-y-2" aria-hidden="true" />
          <div className="relative flex h-full flex-col justify-between p-5">
            <div className="flex items-center justify-between gap-3">
              <Badge variant="outline" className="border-primary/20 bg-white/75 text-primary backdrop-blur-sm">
                {course.category}
              </Badge>
            </div>
            <div>
              <span className="inline-flex rounded-full bg-white/75 px-2.5 py-1 text-caption font-medium text-foreground shadow-sm backdrop-blur-sm">
                {course.format}
              </span>
              <p className="mt-3 max-w-[85%] font-display text-h3 font-semibold tracking-tight text-foreground">
                Build practical fluency.
              </p>
            </div>
          </div>
        </Link>
        <button
          type="button"
          aria-label={saved ? `Remove ${course.title} from saved courses` : `Save ${course.title}`}
          aria-pressed={saved}
          onClick={() => setSaved((current) => !current)}
          className="absolute right-5 top-5 z-10 grid size-9 place-items-center rounded-full border border-white/80 bg-white/75 text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {saved ? <BookmarkCheck className="size-4 text-primary" /> : <Bookmark className="size-4" />}
        </button>
      </div>

      <Link
        href={`/courses/${course.id}`}
        className={`flex flex-1 flex-col outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${view === "list" ? "sm:min-w-0 sm:flex-[1_1_0%]" : ""}`}
      >
        <CardContent className="flex flex-1 flex-col gap-4 p-5">
          <div>
            <h3 className="font-display text-h3 font-semibold leading-tight tracking-[-0.03em] text-foreground transition-colors group-hover:text-primary">
              {course.title}
            </h3>
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{course.subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <Star className="size-3.5 fill-primary text-primary" aria-hidden="true" />
              {course.rating > 0 ? course.rating.toFixed(1) : "New"}
              {course.review_count > 0 ? <span className="font-normal text-muted-foreground">({course.review_count})</span> : null}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" aria-hidden="true" />
              {course.enrolled_count.toLocaleString()} students
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock3 className="size-3.5" aria-hidden="true" />
              {course.estimated_hours}h
            </span>
          </div>

          <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
            <span className="min-w-0 truncate">{course.instructor_name}</span>
            <span className="shrink-0 rounded-full bg-surface-1 px-2.5 py-1 font-medium text-foreground">{difficulty}</span>
          </div>
        </CardContent>
      </Link>

      {product ? (
        <div className={`flex gap-2 border-t border-border p-3 ${view === "list" ? "sm:w-full" : ""}`}>
          <AddToCartButton
            productId={course.id}
            size="sm"
            className="flex-1"
          />
          <BuyNowButton
            productId={course.id}
            size="sm"
            className="flex-1"
             buttonClassName="flex-1"
          />
        </div>
      ) : (
        <div className={`border-t border-border p-3 ${view === "list" ? "sm:w-full" : ""}`}>
          <Button
            asChild
            size="sm"
            sheen
            className="w-full"
          >
            <Link href={`/courses/${course.id}`}>View course</Link>
          </Button>
        </div>
      )}
    </Card>
  );
}

function CourseGrid({
  courses,
  products,
  view,
}: {
  courses: CourseSummary[];
  products: Map<string, CatalogProduct>;
  view: "grid" | "list";
}) {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <div className={view === "grid" ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid grid-cols-1 gap-4"}>
      {courses.map((course, index) => (
        <motion.div
          key={course.id}
           initial={reducedMotion ? false : { opacity: 0, y: 12, filter: "blur(4px)" }}
           animate={reducedMotion ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }}
           transition={reducedMotion ? undefined : { delay: 0.04 * index, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="min-w-0"
        >
          <CourseCard course={course} product={products.get(course.id)} view={view} />
        </motion.div>
      ))}
    </div>
  );
}

export function CatalogClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQuery = searchParams.get("q") ?? "";
  const initialCategory = searchParams.get("category") ?? "All";
  const priceParam = searchParams.get("price");
  const initialPrice: "free" | "paid" | "all" = priceParam === "free" || priceParam === "paid" ? priceParam : "all";
  const initialLevel = (searchParams.get("level") ?? "all") as CourseLevel | "all";
  const initialDuration = (searchParams.get("duration") ?? "all") as DurationFilter | "all";
  const initialFormat = (searchParams.get("format") ?? "all") as CourseFormat | "all";
  const initialCareerTrack = (searchParams.get("career") ?? "all") as CareerTrack | "all";
  const initialSort = (searchParams.get("sort") ?? "popular") as CourseSort;
  const initialMinRating = Number(searchParams.get("rating") ?? "0");

  const [query, setQuery] = React.useState(initialQuery);
  const [category, setCategory] = React.useState(initialCategory);
  const [price, setPrice] = React.useState<"free" | "paid" | "all">(initialPrice);
  const [level, setLevel] = React.useState<CourseLevel | "all">(initialLevel);
  const [duration, setDuration] = React.useState<DurationFilter | "all">(initialDuration);
  const [format, setFormat] = React.useState<CourseFormat | "all">(initialFormat);
  const [careerTrack, setCareerTrack] = React.useState<CareerTrack | "all">(initialCareerTrack);
  const [projectBased, setProjectBased] = React.useState(searchParams.get("project") === "1");
  const [certificateIncluded, setCertificateIncluded] = React.useState(searchParams.get("certificate") === "1");
  const [minRating, setMinRating] = React.useState(Number.isFinite(initialMinRating) ? initialMinRating : 0);
  const [sort, setSort] = React.useState<CourseSort>(SORT_OPTIONS.some((option) => option.value === initialSort) ? initialSort : "popular");
  const [view, setView] = React.useState<"grid" | "list">("grid");
  const [page, setPage] = React.useState(1);

  const debouncedQuery = useDebouncedValue(query, 300);

  React.useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (category !== "All") params.set("category", category);
    if (price !== "all") params.set("price", price);
    if (level !== "all") params.set("level", level);
    if (duration !== "all") params.set("duration", duration);
    if (format !== "all") params.set("format", format);
    if (careerTrack !== "all") params.set("career", careerTrack);
    if (projectBased) params.set("project", "1");
    if (certificateIncluded) params.set("certificate", "1");
    if (minRating > 0) params.set("rating", String(minRating));
    if (sort !== "popular") params.set("sort", sort);
    const str = params.toString();
    router.replace(`/courses${str ? `?${str}` : ""}`, { scroll: false });
  }, [query, category, price, level, duration, format, careerTrack, projectBased, certificateIncluded, minRating, sort, router]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextQuery = searchParams.get("q") ?? "";
      const nextCategory = searchParams.get("category") ?? "All";
      const nextPrice = searchParams.get("price");
      const nextLevel = searchParams.get("level");
      setQuery(nextQuery);
      setCategory(nextCategory);
      setPrice(nextPrice === "free" || nextPrice === "paid" ? nextPrice : "all");
      setLevel(nextLevel === "beginner" || nextLevel === "intermediate" || nextLevel === "advanced" ? nextLevel : "all");
      const nextDuration = searchParams.get("duration");
      setDuration(DURATIONS.some((item) => item.value === nextDuration) ? (nextDuration as DurationFilter | "all") : "all");
      const nextFormat = searchParams.get("format");
      setFormat(FORMATS.some((item) => item.value === nextFormat) ? (nextFormat as CourseFormat | "all") : "all");
      const nextCareer = searchParams.get("career");
      setCareerTrack(CAREER_TRACKS.some((item) => item.value === nextCareer) ? (nextCareer as CareerTrack | "all") : "all");
      setProjectBased(searchParams.get("project") === "1");
      setCertificateIncluded(searchParams.get("certificate") === "1");
      const nextRating = Number(searchParams.get("rating") ?? "0");
      setMinRating(Number.isFinite(nextRating) ? nextRating : 0);
      const nextSort = searchParams.get("sort") as CourseSort | null;
      setSort(nextSort && SORT_OPTIONS.some((option) => option.value === nextSort) ? nextSort : "popular");
      setPage(1);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [searchParams]);

  const applyQuery = (next: string) => { setQuery(next); setPage(1); };
  const applyCategory = (next: string) => { setCategory(next); setPage(1); };
  const applyPrice = (next: "free" | "paid" | "all") => { setPrice(next); setPage(1); };
  const applyLevel = (next: CourseLevel | "all") => { setLevel(next); setPage(1); };
  const resetPage = () => setPage(1);
  const clearFilters = () => {
    setQuery("");
    setCategory("All");
    setPrice("all");
    setLevel("all");
    setDuration("all");
    setFormat("all");
    setCareerTrack("all");
    setProjectBased(false);
    setCertificateIncluded(false);
    setMinRating(0);
    setSort("popular");
    setPage(1);
  };

  const filterValues: CatalogFilterValues = { price, level, duration, format, careerTrack, projectBased, certificateIncluded, minRating };
  const hasActiveFilters = Boolean(query || category !== "All" || price !== "all" || level !== "all" || duration !== "all" || format !== "all" || careerTrack !== "all" || projectBased || certificateIncluded || minRating > 0 || sort !== "popular");
  const activeFilters = [
    ...(query ? [{ label: `Search: ${query}`, onRemove: () => applyQuery("") }] : []),
    ...(category !== "All" ? [{ label: category, onRemove: () => applyCategory("All") }] : []),
    ...(price !== "all" ? [{ label: price === "free" ? "Free" : "Paid", onRemove: () => applyPrice("all") }] : []),
    ...(level !== "all" ? [{ label: level, onRemove: () => applyLevel("all") }] : []),
    ...(duration !== "all" ? [{ label: DURATIONS.find((item) => item.value === duration)?.label ?? duration, onRemove: () => { setDuration("all"); resetPage(); } }] : []),
    ...(format !== "all" ? [{ label: FORMATS.find((item) => item.value === format)?.label ?? format, onRemove: () => { setFormat("all"); resetPage(); } }] : []),
    ...(careerTrack !== "all" ? [{ label: CAREER_TRACKS.find((item) => item.value === careerTrack)?.label ?? careerTrack, onRemove: () => { setCareerTrack("all"); resetPage(); } }] : []),
    ...(projectBased ? [{ label: "Project-based", onRemove: () => { setProjectBased(false); resetPage(); } }] : []),
    ...(certificateIncluded ? [{ label: "Certificate", onRemove: () => { setCertificateIncluded(false); resetPage(); } }] : []),
    ...(minRating > 0 ? [{ label: `${minRating}+ rating`, onRemove: () => { setMinRating(0); resetPage(); } }] : []),
    ...(sort !== "popular" ? [{ label: SORT_OPTIONS.find((option) => option.value === sort)?.label ?? sort, onRemove: () => { setSort("popular"); resetPage(); } }] : []),
  ];

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["catalog", debouncedQuery, category, price, level, duration, format, careerTrack, projectBased, certificateIncluded, minRating, sort, page],
    queryFn: () => searchCatalog({ query: debouncedQuery || undefined, category: category === "All" ? undefined : category, price, level, duration: duration === "all" ? undefined : duration, format, careerTrack, projectBased, certificateIncluded, minRating, sort, page, pageSize: 6 }),
  });

  const catalogQuery = useQuery({ queryKey: ["catalog-products"], queryFn: () => listCatalogProducts() });
  const products = new Map(catalogQuery.data?.map((product) => [product.product_id, product]) ?? []);
  const totalPages = data ? Math.ceil(data.estimatedTotalHits / data.limit) : 0;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <PageContainer className="max-w-[1600px] py-6 sm:py-8">
        <div className="space-y-4">
          <header>
             <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Learning library</p>
             <h1 className="mt-3 font-display text-[clamp(2rem,3.2vw,3.25rem)] font-semibold tracking-[-0.045em] text-foreground">Explore courses</h1>
             <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-[15px]">Build practical skills in security, engineering, cloud, and beyond.</p>
          </header>

          <SearchBar value={query} onChange={applyQuery} onClear={() => applyQuery("")} />

          <FilterToolbar
            values={filterValues}
            sort={sort}
            onPrice={applyPrice}
            onLevel={applyLevel}
            onDuration={(value) => { setDuration(value); resetPage(); }}
            onFormat={(value) => { setFormat(value); resetPage(); }}
            onCareerTrack={(value) => { setCareerTrack(value); resetPage(); }}
            onProjectBased={() => { setProjectBased((value) => !value); resetPage(); }}
            onCertificateIncluded={() => { setCertificateIncluded((value) => !value); resetPage(); }}
            onRating={(value) => { setMinRating(value); resetPage(); }}
            onSort={(value) => { setSort(value); resetPage(); }}
            activeFilters={activeFilters}
            onClearAll={clearFilters}
          />

          <CategoryPills value={category} onChange={applyCategory} />

          {isLoading ? (
            <div className="space-y-3 pt-1">
               <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                Searching catalog…
              </div>
              <SkeletonCourseGrid count={6} />
            </div>
          ) : isError ? (
            <ErrorState
              title="Search unavailable"
              message={error instanceof Error ? error.message : "The catalog search backend is not responding."}
              code="SEARCH_ERR"
              onRetry={() => refetch()}
            />
          ) : data && data.hits.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No courses found"
              description={debouncedQuery ? `No results for "${debouncedQuery}". Try a different search term or clear filters.` : "No courses match your filters. Try a different category or level."}
               primaryAction={hasActiveFilters ? <Button variant="outline" size="sm" onClick={clearFilters}>Clear all filters</Button> : <Button variant="outline" size="sm" asChild><Link href="/courses">Browse all courses</Link></Button>}
               secondaryAction={<Button variant="outline" size="sm" asChild><Link href="/labs">Explore labs</Link></Button>}
            />
           ) : data ? (
             <section aria-label="Course results" className="space-y-3 pt-1">
               <div className="flex flex-wrap items-center justify-between gap-3">
                 <ResultCount count={data.estimatedTotalHits} query={data.query} />
                 <div className="inline-flex items-center rounded-xl border border-border bg-card p-1" role="group" aria-label="Course result layout">
                   <Button
                     type="button"
                     variant={view === "grid" ? "secondary" : "ghost"}
                     size="icon-sm"
                     className="rounded-lg"
                     aria-label="Show courses as a grid"
                     aria-pressed={view === "grid"}
                     onClick={() => setView("grid")}
                   >
                     <LayoutGrid className="size-4" />
                   </Button>
                   <Button
                     type="button"
                     variant={view === "list" ? "secondary" : "ghost"}
                     size="icon-sm"
                     className="rounded-lg"
                     aria-label="Show courses as a list"
                     aria-pressed={view === "list"}
                     onClick={() => setView("list")}
                   >
                     <List className="size-4" />
                   </Button>
                 </div>
               </div>
               <CourseGrid courses={data.hits} products={products} view={view} />
              {totalPages > 1 ? (
                <div className="flex items-center justify-center gap-2 pt-5">
                   <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Button>
                   <span className="px-3 text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                   <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>Next</Button>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      </PageContainer>
    </main>
  );
}

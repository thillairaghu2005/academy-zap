"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  BookOpen,
  ChevronDown,
  Clock3,
  LoaderCircle,
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
        className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#666]"
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
        className="h-12 rounded-2xl border-[#b8b8b8] bg-white pl-11 pr-11 text-[15px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] placeholder:text-[#777] focus-visible:border-black focus-visible:ring-2 focus-visible:ring-black"
      />
      {value ? (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-3 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-[#555] transition-colors hover:bg-[#eeeeee] hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
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
        className="h-9 w-full rounded-xl border-[#c2c2c2] bg-white px-3 text-[13px] text-[#222] shadow-none focus-visible:border-black focus-visible:ring-2 focus-visible:ring-black sm:w-auto sm:min-w-[128px]"
      >
        <span className="sr-only">{label}: </span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="rounded-xl border-[#b8b8b8] bg-white text-black shadow-[0_10px_30px_rgba(0,0,0,0.14)]">
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="rounded-lg focus:bg-[#eeeeee] focus:text-black"
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
      className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-[#c5c5c5] bg-[#f0f0f0] px-2.5 text-xs font-medium text-[#222] transition-colors hover:bg-[#e2e2e2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
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
      className="rounded-2xl border border-[#d0d0d0] bg-[#f7f7f7] p-3 shadow-[0_3px_12px_rgba(0,0,0,0.05)] sm:p-4"
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

      <details className="mt-3 border-t border-[#d9d9d9] pt-3">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-[#333] outline-none focus-visible:ring-2 focus-visible:ring-black [&::-webkit-details-marker]:hidden">
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
            className={`h-9 rounded-xl border px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${values.projectBased ? "border-black bg-black text-white" : "border-[#c2c2c2] bg-white text-[#222] hover:bg-[#eeeeee]"}`}
          >
            Project-based
          </button>
          <button
            type="button"
            aria-pressed={values.certificateIncluded}
            onClick={onCertificateIncluded}
            className={`h-9 rounded-xl border px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${values.certificateIncluded ? "border-black bg-black text-white" : "border-[#c2c2c2] bg-white text-[#222] hover:bg-[#eeeeee]"}`}
          >
            Certificate included
          </button>
        </div>
      </details>

      {activeFilters.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#d9d9d9] pt-3" aria-label="Active course filters">
          {activeFilters.map((filter) => (
            <ActiveFilter key={filter.label} {...filter} />
          ))}
          <button
            type="button"
            onClick={onClearAll}
            className="h-7 px-1 text-xs font-semibold text-[#444] underline decoration-[#aaa] underline-offset-4 transition-colors hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
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
              className={`h-9 rounded-xl border px-3.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${active ? "border-black bg-black text-white" : "border-[#c5c5c5] bg-white text-[#333] hover:border-black hover:bg-[#f0f0f0]"}`}
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
      <p className="text-sm text-[#555]">
        Showing <strong className="font-semibold text-black">{count}</strong> {count === 1 ? "Course" : "Courses"}
        {query ? <span className="text-[#777]"> for &quot;{query}&quot;</span> : null}
      </p>
    </div>
  );
}

function CourseCard({
  course,
  product,
}: {
  course: CourseSummary;
  product?: CatalogProduct;
}) {
  const price = course.price_cents === 0 ? "Free" : `$${(course.price_cents / 100).toFixed(0)}`;
  const difficulty = course.level.charAt(0).toUpperCase() + course.level.slice(1);

  return (
    <Card className="group flex h-full flex-col overflow-hidden rounded-2xl border-[#d0d0d0] bg-white shadow-[0_4px_14px_rgba(0,0,0,0.07)] transition-all duration-200 hover:-translate-y-1 hover:border-[#888] hover:shadow-[0_14px_32px_rgba(0,0,0,0.13)]">
      <Link
        href={`/courses/${course.id}`}
        className="flex flex-1 flex-col outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 focus-visible:ring-offset-white"
      >
        <div className="relative h-36 overflow-hidden bg-[#171717] text-white">
          <div
            className="absolute inset-0 opacity-50"
            style={{
              backgroundImage:
                "linear-gradient(135deg, transparent 0 42%, rgba(255,255,255,.22) 42% 43%, transparent 43% 100%), linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px)",
              backgroundSize: "auto, 28px 28px, 28px 28px",
            }}
            aria-hidden="true"
          />
          <div className="relative flex h-full flex-col justify-between p-4">
            <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#d5d5d5]">
              <span>Zapsters course</span>
              <span className="rounded-lg border border-white/30 px-2 py-1 text-white">{price}</span>
            </div>
            <p className="max-w-[85%] text-sm font-medium text-white/85">{course.category}</p>
          </div>
        </div>

        <CardContent className="flex flex-1 flex-col gap-3 p-4">
          <div>
            <h3 className="font-display text-[19px] font-semibold leading-tight tracking-[-0.02em] text-black">
              {course.title}
            </h3>
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[#555]">{course.subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-[#555]">
            <span className="inline-flex items-center gap-1 font-medium text-black">
              <Star className="size-3.5 fill-current" aria-hidden="true" />
              {course.rating > 0 ? course.rating.toFixed(1) : "New"}
              {course.review_count > 0 ? <span className="font-normal text-[#777]">({course.review_count})</span> : null}
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

          <div className="mt-auto flex items-center justify-between gap-3 border-t border-[#e0e0e0] pt-3 text-xs text-[#555]">
            <span className="min-w-0 truncate">{course.instructor_name}</span>
            <span className="shrink-0 border-l-2 border-black pl-2 font-semibold text-black">{difficulty}</span>
          </div>
        </CardContent>
      </Link>

      {product ? (
        <div className="flex gap-2 border-t border-[#e0e0e0] p-3">
          <AddToCartButton
            productId={course.id}
            size="sm"
            className="flex-1 !border-[#b8b8b8] !bg-white !text-black hover:!bg-[#eeeeee]"
          />
          <BuyNowButton
            productId={course.id}
            size="sm"
            className="flex-1"
            buttonClassName="!border-black !bg-black !text-white hover:!bg-[#292929]"
          />
        </div>
      ) : (
        <div className="border-t border-[#e0e0e0] p-3">
          <Button
            asChild
            size="sm"
            className="w-full !border-black !bg-black !text-white hover:!bg-[#292929]"
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
}: {
  courses: CourseSummary[];
  products: Map<string, CatalogProduct>;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 min-[1440px]:grid-cols-5">
      {courses.map((course, index) => (
        <motion.div
          key={course.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 * index, duration: 0.35, ease: "easeOut" }}
          className="min-w-0"
        >
          <CourseCard course={course} product={products.get(course.id)} />
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
    <main className="min-h-screen bg-white text-black">
      <PageContainer className="max-w-[1600px] py-6 sm:py-8">
        <div className="space-y-4">
          <header>
            <h1 className="font-display text-[clamp(2rem,3.2vw,3.25rem)] font-semibold tracking-[-0.045em] text-black">Explore courses</h1>
            <p className="mt-1 max-w-2xl text-sm text-[#555] sm:text-[15px]">Build practical skills in security, engineering, cloud, and beyond.</p>
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
              <div className="flex items-center gap-2 text-sm text-[#555]" role="status">
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
              primaryAction={hasActiveFilters ? <Button variant="outline" size="sm" onClick={clearFilters} className="border-[#b8b8b8] bg-white text-black hover:!bg-[#eeeeee] hover:!text-black">Clear all filters</Button> : <Button variant="outline" size="sm" asChild className="border-[#b8b8b8] bg-white text-black hover:!bg-[#eeeeee] hover:!text-black"><Link href="/courses">Browse all courses</Link></Button>}
              secondaryAction={<Button variant="outline" size="sm" asChild className="border-[#b8b8b8] bg-white text-black hover:!bg-[#eeeeee] hover:!text-black"><Link href="/labs">Explore labs</Link></Button>}
            />
          ) : data ? (
            <section aria-label="Course results" className="space-y-3 pt-1">
              <ResultCount count={data.estimatedTotalHits} query={data.query} />
              <CourseGrid courses={data.hits} products={products} />
              {totalPages > 1 ? (
                <div className="flex items-center justify-center gap-2 pt-5">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="border-[#b8b8b8] bg-white text-black hover:!bg-[#eeeeee] hover:!text-black">Previous</Button>
                  <span className="px-3 text-sm text-[#555]">Page {page} of {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} className="border-[#b8b8b8] bg-white text-black hover:!bg-[#eeeeee] hover:!text-black">Next</Button>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      </PageContainer>
    </main>
  );
}

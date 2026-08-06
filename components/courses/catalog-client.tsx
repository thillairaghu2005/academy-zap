"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  BookOpen,
  Filter,
  Hourglass,
  LoaderCircle,
  Search,
  SlidersHorizontal,
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
import { Badge } from "@/components/ui/badge";
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
import { FilterChip } from "@/components/courses/filter-chip";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/* ------------------------------------------------------------------ */
/*  Catalog — the main F1 surface                                      */
/*  Wired to the mock Meilisearch-shaped searchCatalog() API.          */
/*                                                                     */
/*  States: loading (skeleton grid), empty (zzzz), error (boom),       */
/*          happy path, and a draft-banner stand-in.                   */
/* ------------------------------------------------------------------ */

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
  "Web Development",
  "Cloud & DevOps",
  "Programming",
];

function CourseCard({
  course,
  product,
}: {
  course: CourseSummary;
  product?: CatalogProduct;
}) {
  const price =
    course.price_cents === 0
      ? "Free"
      : `$${(course.price_cents / 100).toFixed(0)}`;

  return (
    <Card className="group flex h-full flex-col overflow-hidden transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-xl group-hover:shadow-primary/10">
      <Link
        href={`/courses/${course.id}`}
        className="flex-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {/* Cover art gradient */}
        <div
          className="relative h-36 w-full"
          style={{
            background: `linear-gradient(135deg, hsl(${course.cover_hue}, 60%, 45%), hsl(${(course.cover_hue + 60) % 360}, 50%, 30%))`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            <h3 className="font-display text-h3 text-white drop-shadow-sm">
              {course.title}
            </h3>
            <p className="mt-0.5 text-xs text-white/80">{course.category}</p>
          </div>
          <Badge
            variant="secondary"
            className="absolute right-3 top-3 bg-black/40 text-white backdrop-blur-sm"
          >
            {price}
          </Badge>
        </div>

        <CardContent className="flex flex-col gap-2.5 p-4">
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {course.subtitle}
          </p>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Star className="size-3.5 fill-amber-400 text-amber-700" />
              {course.rating.toFixed(1)}
              <span className="text-muted-foreground/60">
                ({course.review_count})
              </span>
            </span>
            <span className="flex items-center gap-1">
              <Users className="size-3.5" />
              {course.enrolled_count.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <Hourglass className="size-3.5" />
              {course.estimated_hours}h
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-2.5">
            <span className="text-xs text-muted-foreground">
              {course.instructor_name}
            </span>
              <Badge variant="outline" className="text-caption">
              {course.level}
            </Badge>
          </div>
        </CardContent>
      </Link>

      {/* Purchasable → Buy now + Add to cart (Task 3) */}
      {product ? (
        <div className="flex gap-2 border-t border-border p-3">
          <AddToCartButton productId={course.id} size="sm" className="flex-1" />
          <BuyNowButton productId={course.id} size="sm" className="flex-1" />
        </div>
      ) : null}
    </Card>
  );
}

function CatalogGrid({
  courses,
  products,
}: {
  courses: CourseSummary[];
  products: Map<string, CatalogProduct>;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {courses.map((course, i) => (
        <motion.div
          key={course.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 * i, duration: 0.35, ease: "easeOut" }}
        >
          <CourseCard course={course} product={products.get(course.id)} />
        </motion.div>
      ))}
    </div>
  );
}

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

function FilterControls({
  values,
  onPrice,
  onLevel,
  onDuration,
  onFormat,
  onCareerTrack,
  onProjectBased,
  onCertificateIncluded,
  onRating,
}: {
  values: CatalogFilterValues;
  onPrice: (value: CatalogFilterValues["price"]) => void;
  onLevel: (value: CatalogFilterValues["level"]) => void;
  onDuration: (value: CatalogFilterValues["duration"]) => void;
  onFormat: (value: CatalogFilterValues["format"]) => void;
  onCareerTrack: (value: CatalogFilterValues["careerTrack"]) => void;
  onProjectBased: () => void;
  onCertificateIncluded: () => void;
  onRating: (value: number) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Select value={values.price} onValueChange={(value) => onPrice(value as CatalogFilterValues["price"])}>
        <SelectTrigger aria-label="Filter courses by price"><Filter className="size-3.5" /><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="all">All prices</SelectItem><SelectItem value="free">Free</SelectItem><SelectItem value="paid">Paid</SelectItem></SelectContent>
      </Select>
      <Select value={values.level} onValueChange={(value) => onLevel(value as CatalogFilterValues["level"])}>
        <SelectTrigger aria-label="Filter courses by difficulty"><SelectValue /></SelectTrigger>
        <SelectContent>{LEVELS.map((level) => <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={values.duration} onValueChange={(value) => onDuration(value as CatalogFilterValues["duration"])}>
        <SelectTrigger aria-label="Filter courses by duration"><SelectValue /></SelectTrigger>
        <SelectContent>{DURATIONS.map((duration) => <SelectItem key={duration.value} value={duration.value}>{duration.label}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={values.format} onValueChange={(value) => onFormat(value as CatalogFilterValues["format"])}>
        <SelectTrigger aria-label="Filter courses by format"><SelectValue /></SelectTrigger>
        <SelectContent>{FORMATS.map((format) => <SelectItem key={format.value} value={format.value}>{format.label}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={values.careerTrack} onValueChange={(value) => onCareerTrack(value as CatalogFilterValues["careerTrack"])}>
        <SelectTrigger aria-label="Filter courses by career track"><SelectValue /></SelectTrigger>
        <SelectContent>{CAREER_TRACKS.map((track) => <SelectItem key={track.value} value={track.value}>{track.label}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={String(values.minRating)} onValueChange={(value) => onRating(Number(value))}>
        <SelectTrigger aria-label="Filter courses by rating"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="0">Any rating</SelectItem><SelectItem value="4">4.0+ rating</SelectItem><SelectItem value="4.5">4.5+ rating</SelectItem></SelectContent>
      </Select>
      <Button type="button" variant={values.projectBased ? "default" : "outline"} aria-pressed={values.projectBased} onClick={onProjectBased} className="justify-start">Project-based</Button>
      <Button type="button" variant={values.certificateIncluded ? "default" : "outline"} aria-pressed={values.certificateIncluded} onClick={onCertificateIncluded} className="justify-start">Certificate included</Button>
    </div>
  );
}

export function CatalogClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQuery = searchParams.get("q") ?? "";
  const initialCategory = searchParams.get("category") ?? "All";
  const priceParam = searchParams.get("price");
  const initialPrice: "free" | "paid" | "all" =
    priceParam === "free" || priceParam === "paid" ? priceParam : "all";
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

  // Sync URL params
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

  // Reset page to 1 whenever a filter changes. Done synchronously in the
  // filter handlers (not an effect) — the debounced query resolves after
  // `page` is already 1, so the fetch always starts at the first page.
  const applyQuery = (next: string) => {
    setQuery(next);
    setPage(1);
  };
  const applyCategory = (next: string) => {
    setCategory(next);
    setPage(1);
  };
  const applyPrice = (next: "free" | "paid" | "all") => {
    setPrice(next);
    setPage(1);
  };
  const applyLevel = (next: CourseLevel | "all") => {
    setLevel(next);
    setPage(1);
  };
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

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["catalog", debouncedQuery, category, price, level, duration, format, careerTrack, projectBased, certificateIncluded, minRating, sort, page],
    queryFn: () =>
      searchCatalog({
        query: debouncedQuery || undefined,
        category: category === "All" ? undefined : category,
        price,
        level,
        duration: duration === "all" ? undefined : duration,
        format,
        careerTrack,
        projectBased,
        certificateIncluded,
        minRating,
        sort,
        page,
        pageSize: 6,
      }),
  });

  // Purchasable products (pricing + stock) for the card action row.
  const catalogQuery = useQuery({
    queryKey: ["catalog-products"],
    queryFn: () => listCatalogProducts(),
  });
  const products = new Map(
    catalogQuery.data?.map((p) => [p.product_id, p]) ?? [],
  );

  const totalPages = data
    ? Math.ceil(data.estimatedTotalHits / data.limit)
    : 0;

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-h1">
          Course catalog
        </h1>
        <p className="text-sm text-muted-foreground">
          Browse our library of security, engineering and cloud courses.
        </p>
      </div>

      {/* Search & filters */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            aria-label="Search courses"
            placeholder={
              DEMO_MODE
                ? 'Search by title or skill… (try "security", "zzzz" for empty)'
                : "Search by title or skill…"
            }
            value={query}
            onChange={(e) => applyQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {query ? (
            <button
              onClick={() => applyQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden min-w-0 flex-1 lg:block">
            <FilterControls
              values={filterValues}
              onPrice={(value) => { applyPrice(value); }}
              onLevel={(value) => { applyLevel(value); }}
              onDuration={(value) => { setDuration(value); resetPage(); }}
              onFormat={(value) => { setFormat(value); resetPage(); }}
              onCareerTrack={(value) => { setCareerTrack(value); resetPage(); }}
              onProjectBased={() => { setProjectBased((value) => !value); resetPage(); }}
              onCertificateIncluded={() => { setCertificateIncluded((value) => !value); resetPage(); }}
              onRating={(value) => { setMinRating(value); resetPage(); }}
            />
          </div>
          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger asChild><Button variant="outline" size="sm"><SlidersHorizontal /> Filters</Button></SheetTrigger>
              <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto">
                <SheetHeader><SheetTitle>Filter courses</SheetTitle><SheetDescription>Refine the catalog without losing your place.</SheetDescription></SheetHeader>
                <div className="mt-5">
                  <FilterControls
                    values={filterValues}
                    onPrice={(value) => { applyPrice(value); }}
                    onLevel={(value) => { applyLevel(value); }}
                    onDuration={(value) => { setDuration(value); resetPage(); }}
                    onFormat={(value) => { setFormat(value); resetPage(); }}
                    onCareerTrack={(value) => { setCareerTrack(value); resetPage(); }}
                    onProjectBased={() => { setProjectBased((value) => !value); resetPage(); }}
                    onCertificateIncluded={() => { setCertificateIncluded((value) => !value); resetPage(); }}
                    onRating={(value) => { setMinRating(value); resetPage(); }}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
          <Select value={sort} onValueChange={(value) => { setSort(value as CourseSort); resetPage(); }}>
            <SelectTrigger className="w-fit min-w-[150px]" aria-label="Sort courses"><SelectValue /></SelectTrigger>
            <SelectContent>{SORT_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Filter courses by discipline">
        {CATEGORIES.map((cat) => {
          const active = category === cat;
          return (
            <Button
              key={cat}
              type="button"
              size="sm"
              variant={active ? "default" : "outline"}
              aria-pressed={active}
              onClick={() => applyCategory(cat)}
              className="shrink-0"
            >
              {cat}
            </Button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Active course filters">
        {query ? <FilterChip label={`Search: ${query}`} onRemove={() => applyQuery("")} /> : null}
        {category !== "All" ? <FilterChip label={category} onRemove={() => applyCategory("All")} /> : null}
        {price !== "all" ? <FilterChip label={price === "free" ? "Free" : "Paid"} onRemove={() => applyPrice("all")} /> : null}
        {level !== "all" ? <FilterChip label={level} onRemove={() => applyLevel("all")} /> : null}
        {duration !== "all" ? <FilterChip label={DURATIONS.find((item) => item.value === duration)?.label ?? duration} onRemove={() => { setDuration("all"); resetPage(); }} /> : null}
        {format !== "all" ? <FilterChip label={FORMATS.find((item) => item.value === format)?.label ?? format} onRemove={() => { setFormat("all"); resetPage(); }} /> : null}
        {careerTrack !== "all" ? <FilterChip label={CAREER_TRACKS.find((item) => item.value === careerTrack)?.label ?? careerTrack} onRemove={() => { setCareerTrack("all"); resetPage(); }} /> : null}
        {projectBased ? <FilterChip label="Project-based" onRemove={() => { setProjectBased(false); resetPage(); }} /> : null}
        {certificateIncluded ? <FilterChip label="Certificate" onRemove={() => { setCertificateIncluded(false); resetPage(); }} /> : null}
        {minRating > 0 ? <FilterChip label={`${minRating}+ rating`} onRemove={() => { setMinRating(0); resetPage(); }} /> : null}
        {query || category !== "All" || price !== "all" || level !== "all" || duration !== "all" || format !== "all" || careerTrack !== "all" || projectBased || certificateIncluded || minRating > 0 || sort !== "popular" ? <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>Clear all</Button> : null}
      </div>

      {/* Results area */}
      <div className="mt-8">
        {/* Loading */}
        {isLoading ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Searching catalog…
            </div>
            <SkeletonCourseGrid count={6} />
          </div>
        ) : isError ? (
          <ErrorState
            title="Search unavailable"
            message={
              error instanceof Error
                ? error.message
                : "The catalog search backend is not responding."
            }
            code="SEARCH_ERR"
            onRetry={() => refetch()}
          />
        ) : data && data.hits.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No courses found"
            description={
              debouncedQuery
                ? `No results for "${debouncedQuery}". Try a different search term or clear filters.`
                : "No courses match your filters. Try a different category or level."
            }
            primaryAction={
                debouncedQuery || category !== "All" || price !== "all" || level !== "all" || duration !== "all" || format !== "all" || careerTrack !== "all" || projectBased || certificateIncluded || minRating > 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                >
                  Clear all filters
                </Button>
              ) : <Button variant="gradient" size="sm" asChild><Link href="/courses">Browse all courses</Link></Button>
            }
            secondaryAction={<Button variant="outline" size="sm" asChild><Link href="/labs">Explore labs</Link></Button>}
          />
        ) : data ? (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {data.estimatedTotalHits}{" "}
                {data.estimatedTotalHits === 1 ? "course" : "courses"} found
                {data.query ? ` for "${data.query}"` : ""}
              </p>
              {data.processingTimeMs > 0 ? (
                <span className="text-xs text-muted-foreground/60">
                  {data.processingTimeMs}ms
                </span>
              ) : null}
            </div>

            <CatalogGrid courses={data.hits} products={products} />

            {/* Pagination */}
            {totalPages > 1 ? (
              <div className="mt-8 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span className="px-3 text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </PageContainer>
  );
}

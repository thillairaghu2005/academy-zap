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
  Star,
  Users,
  X,
} from "lucide-react";

import type { CourseLevel, CourseSummary } from "@/lib/contracts/content";
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
import { SkeletonGrid } from "@/components/shared/skeletons";

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
            <h3 className="font-display text-base font-bold leading-tight text-white drop-shadow-sm">
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
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
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
            <Badge variant="outline" className="text-[10px]">
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

export function CatalogClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQuery = searchParams.get("q") ?? "";
  const initialCategory = searchParams.get("category") ?? "All";
  const initialLevel = (searchParams.get("level") ?? "all") as CourseLevel | "all";

  const [query, setQuery] = React.useState(initialQuery);
  const [category, setCategory] = React.useState(initialCategory);
  const [level, setLevel] = React.useState<CourseLevel | "all">(initialLevel);
  const [page, setPage] = React.useState(1);

  const debouncedQuery = useDebouncedValue(query, 300);

  // Sync URL params
  React.useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (category !== "All") params.set("category", category);
    if (level !== "all") params.set("level", level);
    const str = params.toString();
    router.replace(`/courses${str ? `?${str}` : ""}`, { scroll: false });
  }, [query, category, level, router]);

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
  const applyLevel = (next: CourseLevel | "all") => {
    setLevel(next);
    setPage(1);
  };
  const clearFilters = () => {
    setQuery("");
    setCategory("All");
    setLevel("all");
    setPage(1);
  };

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["catalog", debouncedQuery, category, level, page],
    queryFn: () =>
      searchCatalog({
        query: debouncedQuery || undefined,
        category: category === "All" ? undefined : category,
        level,
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
        <h1 className="font-display text-3xl font-bold tracking-tight">
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
                ? 'Search courses… (try "security", "zzzz" for empty, "boom" for error)'
                : "Search courses…"
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

        <div className="flex gap-2">
          <Select value={category} onValueChange={applyCategory}>
            <SelectTrigger className="w-fit min-w-[140px]">
              <Filter className="size-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={level}
            onValueChange={(v) => applyLevel(v as CourseLevel | "all")}
          >
            <SelectTrigger className="w-fit min-w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEVELS.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
            <SkeletonGrid count={6} />
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
            action={
              debouncedQuery || category !== "All" || level !== "all" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                >
                  Clear all filters
                </Button>
              ) : undefined
            }
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
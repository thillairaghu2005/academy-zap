"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  FlaskConical,
  Bookmark,
  BookmarkCheck,
  Hourglass,
  LoaderCircle,
  Monitor,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";

import type { Lab, LabDifficulty } from "@/lib/contracts/lab";
import type { CatalogProduct } from "@/lib/contracts/commerce";
import { searchLabs } from "@/lib/data/demo/lab";
import { listCatalogProducts } from "@/lib/data/demo/commerce";
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
import { SkeletonLabGrid } from "@/components/shared/skeletons";
import { cn } from "@/lib/utils";
import { isLabBookmarked, toggleLabBookmark } from "@/lib/demo/lab-bookmarks";
import { subscribeDemoStorage } from "@/lib/demo/storage";

/* ------------------------------------------------------------------ */
/*  Lab catalog — the F3 landing surface.                              */
/*  Wired to the mock Meilisearch-shaped searchLabs() API.             */
/*                                                                     */
/*  States: loading (skeleton grid), empty (zzzz), error (boom),       */
/*          happy path.                                                */
/* ------------------------------------------------------------------ */

const DIFFICULTIES: { value: LabDifficulty | "all"; label: string }[] = [
  { value: "all", label: "All difficulties" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const DIFFICULTY_STYLES: Record<
  LabDifficulty,
  { label: string; className: string }
> = {
  beginner: {
    label: "Beginner",
    className: "border-primary/20 bg-primary/5 text-primary",
  },
  intermediate: {
    label: "Intermediate",
    className: "border-warning/25 bg-warning/10 text-warning-strong",
  },
  advanced: {
    label: "Advanced",
    className: "border-danger/20 bg-danger/10 text-danger-strong",
  },
};

function LabCard({
  lab,
  index,
  product,
}: {
  lab: Lab;
  index: number;
  product?: CatalogProduct;
}) {
  const reducedMotion = useReducedMotion() ?? false;
  const [bookmarked, setBookmarked] = React.useState(() => isLabBookmarked(lab.id));
  const diff = DIFFICULTY_STYLES[lab.difficulty];
  React.useEffect(() => {
    const sync = () => setBookmarked(isLabBookmarked(lab.id));
    return subscribeDemoStorage(sync);
  }, [lab.id]);
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
      transition={reducedMotion ? undefined : { delay: 0.04 * index, duration: 0.35, ease: "easeOut" }}
    >
      <Card className="group relative flex h-full flex-col overflow-hidden transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary-border group-hover:shadow-[0_8px_24px_rgb(16_24_40_/_6%)]">
        <Link
          href={`/labs/${lab.id}`}
          className="flex-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="relative h-32 w-full overflow-hidden bg-surface-1">
            <div className="absolute inset-0 aurora opacity-70" aria-hidden="true" />
            <div className="absolute inset-0 bg-grid opacity-60" aria-hidden="true" />
            <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2">
              <h3 className="font-display text-h3 text-foreground">
                {lab.title}
              </h3>
              <span
                className={cn(
                  "shrink-0 rounded-full border px-2 py-0.5 text-caption font-semibold uppercase tracking-wide backdrop-blur-sm",
                  diff.className,
                )}
              >
                {diff.label}
              </span>
            </div>
            {lab.requires_gui ? (
              <Badge
                variant="secondary"
                className="absolute right-3 top-3 bg-white/80 text-foreground backdrop-blur-sm"
              >
                <Monitor className="size-3" /> GUI
              </Badge>
            ) : null}
          </div>

          <CardContent className="flex flex-col gap-2.5 p-4">
            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {lab.description}
            </p>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <FlaskConical className="size-3.5" />
                {lab.objectives.length}{" "}
                {lab.objectives.length === 1 ? "objective" : "objectives"}
              </span>
              <span className="flex items-center gap-1">
                <Hourglass className="size-3.5" />
                ~{lab.estimated_minutes} min
              </span>
              <Badge variant="outline" className="text-caption">
                <ShieldCheck className="size-3" /> {lab.success_rate_pct}% success
              </Badge>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-2.5">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5 text-success-strong" />
                Isolated sandbox
              </span>
              <span className="text-xs text-muted-foreground">{lab.category}</span>
            </div>
          </CardContent>
        </Link>

        <button type="button" onClick={() => setBookmarked(toggleLabBookmark(lab.id))} className="absolute left-3 top-3 z-10 grid size-8 place-items-center rounded-full border border-white/80 bg-white/80 text-muted-foreground shadow-sm backdrop-blur-sm hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={bookmarked ? `Remove ${lab.title} from bookmarks` : `Bookmark ${lab.title}`} aria-pressed={bookmarked}>
          {bookmarked ? <BookmarkCheck className="size-3.5 text-primary" /> : <Bookmark className="size-3.5" />}
        </button>

        {/* Purchasable lab pass → Buy now + Add to cart (Task 3) */}
        {product ? (
          <div className="flex gap-2 border-t border-border p-3">
            <AddToCartButton productId={lab.id} size="sm" className="flex-1" />
            <BuyNowButton productId={lab.id} size="sm" className="flex-1" />
          </div>
        ) : null}
      </Card>
    </motion.div>
  );
}

export function LabCatalogClient({ initialData }: { initialData?: Lab[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQuery = searchParams.get("q") ?? "";
  const initialDifficulty = (searchParams.get("difficulty") ?? "all") as
    | LabDifficulty
    | "all";

  const [query, setQuery] = React.useState(initialQuery);
  const [difficulty, setDifficulty] = React.useState<
    LabDifficulty | "all"
  >(initialDifficulty);

  const debouncedQuery = useDebouncedValue(query, 300);

  // Sync URL params (same discipline as the F1 catalog).
  React.useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (difficulty !== "all") params.set("difficulty", difficulty);
    const str = params.toString();
    router.replace(`/labs${str ? `?${str}` : ""}`, { scroll: false });
  }, [debouncedQuery, difficulty, router]);

  const applyQuery = (next: string) => setQuery(next);
  const applyDifficulty = (next: LabDifficulty | "all") =>
    setDifficulty(next);
  const clearFilters = () => {
    setQuery("");
    setDifficulty("all");
  };

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["labs", debouncedQuery, difficulty],
    queryFn: () => searchLabs(debouncedQuery),
    initialData: difficulty === "all" && !debouncedQuery ? initialData : undefined,
  });

  const catalogQuery = useQuery({
    queryKey: ["catalog-products"],
    queryFn: () => listCatalogProducts(),
  });
  const products = new Map(
    catalogQuery.data?.map((p) => [p.product_id, p]) ?? [],
  );

  const visible = data?.filter(
    (lab) => difficulty === "all" || lab.difficulty === difficulty,
  );

  return (
    <PageContainer>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-h1">
          Virtual labs
        </h1>
        <p className="text-sm text-muted-foreground">
          Hands-on, time-boxed sandboxes. Drive a real terminal, capture flags,
          and prove the work — objectives are verified by the demo service.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            aria-label="Search labs"
            placeholder={
              DEMO_MODE
                ? 'Search labs… (try "web", "zzzz" for empty, "boom" for error)'
                : "Search labs…"
            }
            value={query}
            onChange={(e) => applyQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {query ? (
              <button
                type="button"
                onClick={() => applyQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        <Select
          value={difficulty}
          onValueChange={(v) => applyDifficulty(v as LabDifficulty | "all")}
        >
          <SelectTrigger className="w-fit min-w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DIFFICULTIES.map((d) => (
              <SelectItem key={d.value} value={d.value}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-8">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Loading labs…
            </div>
            <SkeletonLabGrid count={6} />
          </div>
        ) : isError ? (
          <ErrorState
            title="Lab catalog unavailable"
            message={
              error instanceof Error
                ? error.message
                : "The lab catalog demo data is unavailable."
            }
            code="LABS_ERR"
            onRetry={() => refetch()}
          />
        ) : visible && visible.length === 0 ? (
          <EmptyState
            icon={FlaskConical}
            title="No labs found"
            description={
              debouncedQuery
                ? `No labs match "${debouncedQuery}". Try a different term or clear the filters.`
                : "No labs match the selected difficulty."
            }
            action={
              debouncedQuery || difficulty !== "all" ? (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear all filters
                </Button>
              ) : undefined
            }
          />
        ) : visible ? (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {visible.length} {visible.length === 1 ? "lab" : "labs"} available
              </p>
              <span className="text-xs text-muted-foreground/60">
                sessions isolated per learner
              </span>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((lab, i) => (
                <LabCard
                  key={lab.id}
                  lab={lab}
                  index={i}
                  product={products.get(lab.id)}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </PageContainer>
  );
}

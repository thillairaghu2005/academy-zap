"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { m as motion, useReducedMotion } from "framer-motion";
import {
  FlaskConical,
  Bookmark,
  BookmarkCheck,
  LoaderCircle,
  Monitor,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

import type { Lab, LabDifficulty } from "@/lib/contracts/lab";
import type { CatalogProduct } from "@/lib/contracts/commerce";
import { searchLabs } from "@/lib/data/lab-facade";
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
    className: "border-border bg-secondary text-muted-foreground",
  },
  intermediate: {
    label: "Intermediate",
    className: "border-border bg-secondary text-foreground",
  },
  advanced: {
    label: "Advanced",
    className: "border-primary/30 bg-primary/10 text-primary font-semibold",
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
      className="group h-full"
    >
      <Card className="relative flex h-full flex-col overflow-hidden border border-border/70 bg-card/90 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/50 group-hover:shadow-[0_12px_36px_rgba(245,158,11,0.1)]">
        {/* Accreditation header */}
        <div className="border-b border-border/40 bg-surface-1/60 px-4 py-2 flex items-center justify-between">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
            Interactive Cloud Sandbox
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">
            TTL: ~{lab.estimated_minutes}m
          </span>
        </div>

        <Link
          href={`/labs/${lab.id}`}
          className="flex-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="relative h-28 w-full overflow-hidden bg-surface-1">
            <div className="absolute inset-0 aurora opacity-50" aria-hidden="true" />
            <div className="absolute inset-0 bg-grid opacity-40" aria-hidden="true" />
            <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2">
              <h3 className="font-display font-bold text-base text-foreground group-hover:text-primary transition-colors">
                {lab.title}
              </h3>
              <span
                className={cn(
                  "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase font-mono tracking-wide backdrop-blur-sm",
                  diff.className,
                )}
              >
                {diff.label}
              </span>
            </div>
            {lab.requires_gui ? (
              <Badge
                variant="secondary"
                className="absolute right-3 top-3 bg-surface-1/90 text-foreground text-[10px] border border-border/50"
              >
                <Monitor className="size-3 mr-1" /> GUI Desktop
              </Badge>
            ) : null}
          </div>

          <CardContent className="flex flex-col gap-3 p-4">
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {lab.description}
            </p>

            <div className="grid grid-cols-3 gap-2 py-2 border-y border-border/40 text-center text-[11px] text-muted-foreground">
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-mono uppercase text-muted-foreground/80">Checkpoints</span>
                <span className="font-semibold text-foreground">{lab.objectives.length} Objectives</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-mono uppercase text-muted-foreground/80">Success Rate</span>
                <span className="font-semibold text-foreground">{lab.success_rate_pct}%</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-mono uppercase text-muted-foreground/80">Environment</span>
                <span className="font-semibold text-primary truncate max-w-[70px]">{lab.category}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span className="flex items-center gap-1 text-[11px] text-primary font-medium">
                <ShieldCheck className="size-3.5" />
                Live Verification Check
              </span>
              <span className="text-[11px] font-mono text-muted-foreground/70">Terminal &amp; Cloud CLI</span>
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
    window.history.replaceState(null, "", `/labs${str ? `?${str}` : ""}`);
  }, [debouncedQuery, difficulty]);

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
    <PageContainer className="pt-6 sm:pt-8 pb-16">
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-card via-background to-card p-6 sm:p-10 mb-8 shadow-sm">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="size-3.5" />
              Zapsters Cloud Sandbox &amp; Builder Labs Standard
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              Dedicated Container Pods
            </span>
          </div>

          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
            Virtual Hands-on Sandboxes
          </h1>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Practice real infrastructure scenarios in isolated cloud environments. Provision containerized microservices, execute diagnostic CLI operations, and earn automated objective verification.
          </p>
        </div>
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

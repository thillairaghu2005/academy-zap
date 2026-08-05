"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  FlaskConical,
  Hourglass,
  LoaderCircle,
  Monitor,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";

import type { Lab, LabDifficulty } from "@/lib/contracts/lab";
import type { CatalogProduct } from "@/lib/contracts/commerce";
import { searchLabs } from "@/lib/api/lab";
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
import { cn } from "@/lib/utils";

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
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600",
  },
  intermediate: {
    label: "Intermediate",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-600",
  },
  advanced: {
    label: "Advanced",
    className: "border-rose-500/40 bg-rose-500/10 text-rose-600",
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
  const diff = DIFFICULTY_STYLES[lab.difficulty];
  const hue = (lab.id.length * 47 + index * 60) % 360;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 * index, duration: 0.35, ease: "easeOut" }}
    >
      <Card className="group flex h-full flex-col overflow-hidden transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-emerald-500/40 group-hover:shadow-xl group-hover:shadow-emerald-500/10">
        <Link
          href={`/labs/${lab.id}`}
          className="flex-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div
            className="relative h-32 w-full"
            style={{
              background: `linear-gradient(135deg, hsl(${hue}, 55%, 40%), hsl(${(hue + 70) % 360}, 45%, 22%))`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2">
              <h3 className="font-display text-base font-bold leading-tight text-white drop-shadow-sm">
                {lab.title}
              </h3>
              <span
                className={cn(
                  "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide backdrop-blur-sm",
                  diff.className,
                )}
              >
                {diff.label}
              </span>
            </div>
            {lab.requires_gui ? (
              <Badge
                variant="secondary"
                className="absolute right-3 top-3 bg-black/40 text-white backdrop-blur-sm"
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
            </div>

            <div className="flex items-center justify-between border-t border-border pt-2.5">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5 text-emerald-600" />
                Isolated sandbox
              </span>
              <span className="text-xs text-muted-foreground">{lab.category}</span>
            </div>
          </CardContent>
        </Link>

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

export function LabCatalogClient() {
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
    if (query) params.set("q", query);
    if (difficulty !== "all") params.set("difficulty", difficulty);
    const str = params.toString();
    router.replace(`/labs${str ? `?${str}` : ""}`, { scroll: false });
  }, [query, difficulty, router]);

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
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Virtual labs
        </h1>
        <p className="text-sm text-muted-foreground">
          Hands-on, time-boxed sandboxes. Drive a real terminal, capture flags,
          and prove the work — objectives are verified server-side.
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
              onClick={() => applyQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
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
            <SkeletonGrid count={6} />
          </div>
        ) : isError ? (
          <ErrorState
            title="Lab catalog unavailable"
            message={
              error instanceof Error
                ? error.message
                : "The lab catalog backend is not responding."
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

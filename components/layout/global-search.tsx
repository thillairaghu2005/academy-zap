"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  CodeXml,
  FlaskConical,
  LoaderCircle,
  Search,
} from "lucide-react";

import type { UnifiedSearchHit } from "@/lib/contracts/search";
import { searchAll } from "@/lib/api/search";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ErrorState } from "@/components/shared/error-state";
import { cn } from "@/lib/utils";

const KIND_ICON = {
  course: BookOpen,
  problem: CodeXml,
  lab: FlaskConical,
} as const;

function SearchResult({
  hit,
  onSelect,
}: {
  hit: UnifiedSearchHit;
  onSelect: () => void;
}) {
  const Icon = KIND_ICON[hit.kind];

  return (
    <Link
      href={hit.href}
      onClick={onSelect}
      className="group flex items-start gap-3 rounded-lg px-3 py-3 outline-none transition-colors hover:bg-accent focus-visible:bg-accent"
    >
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{hit.title}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {hit.meta}
        </span>
      </span>
      <ArrowRight className="mt-2 size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
    </Link>
  );
}

export function GlobalSearch({ className }: { className?: string }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const debouncedQuery = useDebouncedValue(query, 220);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const search = useQuery({
    queryKey: ["unified-search", debouncedQuery],
    queryFn: () => searchAll(debouncedQuery),
    enabled: open,
    retry: false,
  });

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={cn("hidden text-muted-foreground md:inline-flex", className)}
        onClick={() => setOpen(true)}
        aria-label="Search courses, problems, and labs"
      >
        <Search />
        <span>Search</span>
        <kbd className="ml-1 rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          ⌘K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? setOpen(true) : close())}>
        <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-5 pb-4 pt-5">
            <DialogTitle>Search Zapsters</DialogTitle>
            <DialogDescription>
              Find courses, coding problems, and virtual labs from one place.
            </DialogDescription>
          </DialogHeader>

          <div className="border-b border-border p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search across the platform..."
                className="h-11 pl-9"
                aria-label="Search across courses, problems, and labs"
              />
            </div>
          </div>

          <div className="max-h-[min(55vh,28rem)] overflow-y-auto p-2">
            {search.isLoading ? (
              <div className="flex items-center justify-center gap-2 px-3 py-12 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                Searching...
              </div>
            ) : search.isError ? (
              <ErrorState
                title="Search unavailable"
                message="The unified search service is not responding."
                code="SEARCH_ERR"
                onRetry={() => search.refetch()}
              />
            ) : search.data?.hits.length ? (
              <div role="listbox" aria-label="Search results">
                {search.data.hits.map((hit) => (
                  <SearchResult key={`${hit.kind}-${hit.id}`} hit={hit} onSelect={close} />
                ))}
              </div>
            ) : (
              <div className="px-3 py-12 text-center">
                <p className="text-sm font-medium">No matches found</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Try a course topic, problem title, or lab skill.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border bg-muted/40 px-5 py-3 text-[11px] text-muted-foreground">
            <span>Search is powered by the mock unified index.</span>
            <span className={cn("font-mono", search.data && "text-muted-foreground/70")}>
              {search.data?.estimatedTotalHits ?? 0} results
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
